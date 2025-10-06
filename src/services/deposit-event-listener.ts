/**
 * Event-Based Deposit Listener Service
 * Monitors TRC20 and BEP20 USDT transfer events to main wallets
 * Replaces the sub-wallet system with efficient event tracking
 */

import { ethers } from 'ethers';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

// Dynamic import for TronWeb to avoid SSR issues
async function getTronWeb() {
  const { default: TronWeb } = await import('tronweb');
  return TronWeb;
}

interface MainWallet {
  network: string;
  address: string;
  contract_address: string;
  min_confirmations: number;
}

interface BlockTracker {
  network: string;
  last_processed_block: number;
  contract_address: string;
}

interface DepositIntent {
  id: string;
  user_id: string;
  reference_code: string;
  amount_usdt: number;
  network: string;
}

export class DepositEventListener {
  private admin = getSupabaseAdminClient();
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  // USDT Contract ABI (minimal required functions and events)
  private readonly USDT_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "event Transfer(address indexed from, address indexed to, uint256 value)"
  ];

  constructor() {
    console.log('🚀 Deposit Event Listener initialized');
  }

  /**
   * Start the event listener service
   */
  async start(intervalMs: number = 30000): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Event listener is already running');
      return;
    }

    this.isRunning = true;
    console.log(`🎯 Starting deposit event listener (interval: ${intervalMs}ms)`);

    // Run immediately, then on interval
    await this.processEvents();
    
    this.intervalId = setInterval(async () => {
      try {
        await this.processEvents();
      } catch (error) {
        console.error('❌ Error in event processing interval:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop the event listener service
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Deposit event listener stopped');
  }

  /**
   * Process events for all networks (public method for cron jobs)
   */
  async processEvents(): Promise<void> {
    try {
      console.log('🔍 Processing deposit events...');

      // Get main wallet configurations
      const { data: mainWallets, error: walletError } = await this.admin
        .from('main_wallets')
        .select('*')
        .eq('is_active', true);

      if (walletError) {
        throw new Error(`Failed to fetch main wallets: ${walletError.message}`);
      }

      if (!mainWallets || mainWallets.length === 0) {
        console.log('⚠️ No active main wallets configured');
        return;
      }

      // Process each network
      for (const wallet of mainWallets) {
        try {
          if (wallet.network === 'TRC20') {
            await this.processTronEvents(wallet);
          } else if (wallet.network === 'BEP20') {
            await this.processBscEvents(wallet);
          }
        } catch (error) {
          console.error(`❌ Error processing ${wallet.network} events:`, error);
        }
      }

      // Update confirmation counts for pending transactions
      await this.updateConfirmations();

      // Clean up expired deposit intents
      await this.cleanupExpiredIntents();

    } catch (error) {
      console.error('❌ Error in processEvents:', error);
    }
  }

  /**
   * Process TRON TRC20 USDT events
   */
  private async processTronEvents(wallet: MainWallet): Promise<void> {
    try {
      const TronWeb = await getTronWeb();
      const tronWeb = new TronWeb({
        fullHost: 'https://api.trongrid.io',
      });

      // Get last processed block
      const { data: tracker } = await this.admin
        .from('block_tracker')
        .select('*')
        .eq('network', 'TRC20')
        .single();

      const fromBlock = tracker?.last_processed_block || 0;
      
      // Get current block number
      const currentBlock = await tronWeb.trx.getCurrentBlock();
      const currentBlockNumber = currentBlock.block_header.raw_data.number;

      if (fromBlock >= currentBlockNumber) {
        console.log(`📊 TRON: No new blocks to process (current: ${currentBlockNumber})`);
        return;
      }

      console.log(`🔍 TRON: Processing blocks ${fromBlock + 1} to ${currentBlockNumber}`);

      // Get USDT contract
      const contract = await tronWeb.contract().at(wallet.contract_address);

      // Query recent transactions to our main wallet
      // Note: TronGrid API has limitations, so we'll check recent transactions
      const transactions = await tronWeb.trx.getTransactionsFromAddress(wallet.address, 50);

      for (const tx of transactions) {
        try {
          if (tx.raw_data?.contract?.[0]?.type === 'TriggerSmartContract') {
            const contractData = tx.raw_data.contract[0];
            
            // Check if this is a USDT transfer to our wallet
            if (contractData.parameter?.value?.contract_address === 
                tronWeb.address.toHex(wallet.contract_address)) {
              
              await this.processTronTransaction(tx, wallet);
            }
          }
        } catch (error) {
          console.error(`❌ Error processing TRON transaction ${tx.txID}:`, error);
        }
      }

      // Update last processed block
      await this.updateBlockTracker('TRC20', currentBlockNumber);

    } catch (error) {
      console.error('❌ Error in processTronEvents:', error);
    }
  }

  /**
   * Process BSC BEP20 USDT events
   */
  private async processBscEvents(wallet: MainWallet): Promise<void> {
    try {
      const provider = new ethers.JsonRpcProvider(
        process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org/'
      );

      // Get last processed block
      const { data: tracker } = await this.admin
        .from('block_tracker')
        .select('*')
        .eq('network', 'BEP20')
        .single();

      const fromBlock = tracker?.last_processed_block || 0;
      const currentBlock = await provider.getBlockNumber();

      if (fromBlock >= currentBlock) {
        console.log(`📊 BSC: No new blocks to process (current: ${currentBlock})`);
        return;
      }

      // Process in chunks to avoid rate limits
      const chunkSize = 1000;
      const toBlock = Math.min(fromBlock + chunkSize, currentBlock);

      console.log(`🔍 BSC: Processing blocks ${fromBlock + 1} to ${toBlock}`);

      // Create contract instance
      const usdtContract = new ethers.Contract(wallet.contract_address, this.USDT_ABI, provider);

      // Query Transfer events to our main wallet
      const filter = usdtContract.filters.Transfer(null, wallet.address);
      const events = await usdtContract.queryFilter(filter, fromBlock + 1, toBlock);

      console.log(`📥 BSC: Found ${events.length} transfer events`);

      for (const event of events) {
        try {
          await this.processBscEvent(event, wallet, provider);
        } catch (error) {
          console.error(`❌ Error processing BSC event:`, error);
        }
      }

      // Update last processed block
      await this.updateBlockTracker('BEP20', toBlock);

    } catch (error) {
      console.error('❌ Error in processBscEvents:', error);
    }
  }

  /**
   * Process individual TRON transaction
   */
  private async processTronTransaction(tx: any, wallet: MainWallet): Promise<void> {
    try {
      // Check if transaction already exists
      const { data: existingTx } = await this.admin
        .from('event_deposit_transactions')
        .select('id')
        .eq('tx_hash', tx.txID)
        .single();

      if (existingTx) {
        return; // Already processed
      }

      const TronWeb = await getTronWeb();
      const tronWeb = new TronWeb({
        fullHost: 'https://api.trongrid.io',
      });

      // Get transaction details
      const txInfo = await tronWeb.trx.getTransactionInfo(tx.txID);
      const contract = await tronWeb.contract().at(wallet.contract_address);

      // Decode transfer amount (this is simplified - you may need to parse contract data)
      let amount = 0;
      let fromAddress = '';

      if (txInfo.log && txInfo.log.length > 0) {
        // Parse transfer event from logs
        const transferLog = txInfo.log.find((log: any) => 
          log.topics && log.topics[0] === tronWeb.utils.sha3('Transfer(address,address,uint256)')
        );

        if (transferLog) {
          fromAddress = tronWeb.address.fromHex('0x' + transferLog.topics[1].slice(24));
          amount = parseInt(transferLog.data, 16) / 1000000; // USDT has 6 decimals
        }
      }

      if (amount > 0) {
        await this.createDepositTransaction({
          tx_hash: tx.txID,
          from_address: fromAddress,
          to_address: wallet.address,
          amount_usdt: amount,
          network: 'TRC20',
          block_number: tx.blockNumber || 0,
          block_hash: tx.blockHash || '',
          raw_transaction_data: tx
        });
      }

    } catch (error) {
      console.error(`❌ Error processing TRON transaction:`, error);
    }
  }

  /**
   * Process individual BSC event
   */
  private async processBscEvent(event: any, wallet: MainWallet, provider: ethers.JsonRpcProvider): Promise<void> {
    try {
      // Check if transaction already exists
      const { data: existingTx } = await this.admin
        .from('event_deposit_transactions')
        .select('id')
        .eq('tx_hash', event.transactionHash)
        .single();

      if (existingTx) {
        return; // Already processed
      }

      // Type guard to ensure we have an EventLog with args
      if (!('args' in event) || !event.args) {
        return;
      }

      const fromAddress = event.args[0];
      const toAddress = event.args[1];
      const amount = parseFloat(ethers.formatUnits(event.args[2], 6)); // USDT has 6 decimals

      if (amount > 0 && toAddress.toLowerCase() === wallet.address.toLowerCase()) {
        const block = await provider.getBlock(event.blockNumber);
        
        await this.createDepositTransaction({
          tx_hash: event.transactionHash,
          from_address: fromAddress,
          to_address: toAddress,
          amount_usdt: amount,
          network: 'BEP20',
          block_number: event.blockNumber,
          block_hash: block?.hash || '',
          raw_transaction_data: {
            event: event,
            block: block
          }
        });
      }

    } catch (error) {
      console.error(`❌ Error processing BSC event:`, error);
    }
  }

  /**
   * Create deposit transaction record
   */
  private async createDepositTransaction(data: {
    tx_hash: string;
    from_address: string;
    to_address: string;
    amount_usdt: number;
    network: string;
    block_number: number;
    block_hash: string;
    raw_transaction_data: any;
  }): Promise<void> {
    try {
      // Try to match with deposit intent by reference code or amount
      const { data: matchingIntent } = await this.admin
        .from('deposit_intents')
        .select('*')
        .eq('network', data.network)
        .eq('status', 'pending')
        .gte('amount_usdt', data.amount_usdt * 0.95) // Allow 5% tolerance
        .lte('amount_usdt', data.amount_usdt * 1.05)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      const depositTransaction = {
        user_id: matchingIntent?.user_id || null,
        deposit_intent_id: matchingIntent?.id || null,
        tx_hash: data.tx_hash,
        from_address: data.from_address,
        to_address: data.to_address,
        amount_usdt: data.amount_usdt,
        network: data.network,
        block_number: data.block_number,
        block_hash: data.block_hash,
        confirmations: 0,
        status: 'pending',
        reference_code: matchingIntent?.reference_code || null,
        raw_transaction_data: data.raw_transaction_data
      };

      const { error } = await this.admin
        .from('event_deposit_transactions')
        .insert(depositTransaction);

      if (error) {
        throw error;
      }

      console.log(`✅ Created deposit transaction: ${data.tx_hash} (${data.amount_usdt} USDT)`);

      // Update deposit intent status if matched
      if (matchingIntent) {
        await this.admin
          .from('deposit_intents')
          .update({ 
            status: 'detected',
            updated_at: new Date().toISOString()
          })
          .eq('id', matchingIntent.id);

        console.log(`🎯 Matched deposit with intent: ${matchingIntent.reference_code}`);
      }

    } catch (error) {
      console.error('❌ Error creating deposit transaction:', error);
    }
  }

  /**
   * Update confirmation counts for pending transactions
   */
  private async updateConfirmations(): Promise<void> {
    try {
      const { data: pendingTxs } = await this.admin
        .from('event_deposit_transactions')
        .select('*')
        .in('status', ['pending', 'confirmed'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (!pendingTxs || pendingTxs.length === 0) {
        return;
      }

      for (const tx of pendingTxs) {
        try {
          let currentConfirmations = 0;

          if (tx.network === 'TRC20') {
            const TronWeb = await getTronWeb();
            const tronWeb = new TronWeb({
              fullHost: 'https://api.trongrid.io',
            });
            
            const currentBlock = await tronWeb.trx.getCurrentBlock();
            const currentBlockNumber = currentBlock.block_header.raw_data.number;
            currentConfirmations = currentBlockNumber - tx.block_number;
          } else if (tx.network === 'BEP20') {
            const provider = new ethers.JsonRpcProvider(
              process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org/'
            );
            
            const currentBlock = await provider.getBlockNumber();
            currentConfirmations = currentBlock - tx.block_number;
          }

          // Update confirmations
          if (currentConfirmations !== tx.confirmations) {
            const updates: any = {
              confirmations: currentConfirmations,
              updated_at: new Date().toISOString()
            };

            // Get minimum confirmations required
            const { data: wallet } = await this.admin
              .from('main_wallets')
              .select('min_confirmations')
              .eq('network', tx.network)
              .single();

            const minConfirmations = wallet?.min_confirmations || 12;

            // Update status based on confirmations
            if (currentConfirmations >= minConfirmations && tx.status === 'pending') {
              updates.status = 'confirmed';
              updates.confirmed_at = new Date().toISOString();
              
              // Credit user balance
              await this.creditUserBalance(tx);
            }

            await this.admin
              .from('event_deposit_transactions')
              .update(updates)
              .eq('id', tx.id);
          }

        } catch (error) {
          console.error(`❌ Error updating confirmations for tx ${tx.tx_hash}:`, error);
        }
      }

    } catch (error) {
      console.error('❌ Error in updateConfirmations:', error);
    }
  }

  /**
   * Credit user balance after confirmation
   */
  private async creditUserBalance(tx: any): Promise<void> {
    try {
      if (!tx.user_id) {
        console.log(`⚠️ No user_id for transaction ${tx.tx_hash}, skipping balance credit`);
        return;
      }

      // Get current user balance
      const { data: balanceData } = await this.admin
        .from('balances')
        .select('available_usdt')
        .eq('user_id', tx.user_id)
        .single();

      const currentBalance = Number(balanceData?.available_usdt || 0);
      const newBalance = currentBalance + tx.amount_usdt;

      // Update user balance
      await this.admin
        .from('balances')
        .upsert({
          user_id: tx.user_id,
          available_usdt: newBalance
        }, { onConflict: 'user_id' });

      // Create transaction record
      await this.admin
        .from('transactions')
        .insert({
          user_id: tx.user_id,
          type: 'deposit',
          amount_usdt: tx.amount_usdt,
          status: 'completed',
          description: `USDT deposit via ${tx.network}`,
          meta: {
            tx_hash: tx.tx_hash,
            network: tx.network,
            from_address: tx.from_address,
            confirmations: tx.confirmations,
            credited_at: new Date().toISOString()
          }
        });

      // Update deposit transaction status
      await this.admin
        .from('event_deposit_transactions')
        .update({
          status: 'credited',
          credited_at: new Date().toISOString()
        })
        .eq('id', tx.id);

      // Update deposit intent status
      if (tx.deposit_intent_id) {
        await this.admin
          .from('deposit_intents')
          .update({
            status: 'credited',
            updated_at: new Date().toISOString()
          })
          .eq('id', tx.deposit_intent_id);
      }

      console.log(`💰 Credited ${tx.amount_usdt} USDT to user ${tx.user_id} (Balance: ${newBalance})`);

    } catch (error) {
      console.error('❌ Error crediting user balance:', error);
    }
  }

  /**
   * Update block tracker
   */
  private async updateBlockTracker(network: string, blockNumber: number): Promise<void> {
    try {
      await this.admin
        .from('block_tracker')
        .update({
          last_processed_block: blockNumber,
          updated_at: new Date().toISOString()
        })
        .eq('network', network);

    } catch (error) {
      console.error(`❌ Error updating block tracker for ${network}:`, error);
    }
  }

  /**
   * Clean up expired deposit intents
   */
  private async cleanupExpiredIntents(): Promise<void> {
    try {
      const { data, error } = await this.admin
        .rpc('cleanup_expired_deposit_intents');

      if (error) {
        throw error;
      }

      if (data > 0) {
        console.log(`🧹 Cleaned up ${data} expired deposit intents`);
      }

    } catch (error) {
      console.error('❌ Error cleaning up expired intents:', error);
    }
  }
}

// Export singleton instance
export const depositEventListener = new DepositEventListener();
