#!/usr/bin/env node

/**
 * Standalone Event-Based Deposit Listener Service
 * 
 * This is a standalone Node.js service that can run independently of your Next.js app
 * to monitor TRC20 and BEP20 USDT deposits to your main wallets.
 * 
 * Usage:
 *   node services/standalone-deposit-listener.js
 * 
 * Environment Variables Required:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - BSC_RPC_URL (optional, defaults to public BSC RPC)
 *   - LISTENER_INTERVAL_MS (optional, defaults to 30000)
 */

const { ethers } = require('ethers');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const config = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  bscRpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org/',
  intervalMs: parseInt(process.env.LISTENER_INTERVAL_MS || '30000'),
  tronGridUrl: 'https://api.trongrid.io'
};

// Validate configuration
if (!config.supabaseUrl || !config.supabaseServiceKey) {
  console.error('❌ Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

// USDT Contract ABI
const USDT_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

class StandaloneDepositListener {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    console.log('🚀 Standalone Deposit Event Listener initialized');
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️ Service is already running');
      return;
    }

    this.isRunning = true;
    console.log(`🎯 Starting deposit event listener (interval: ${config.intervalMs}ms)`);

    // Handle graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());

    // Run immediately, then on interval
    await this.processEvents();
    
    this.intervalId = setInterval(async () => {
      try {
        await this.processEvents();
      } catch (error) {
        console.error('❌ Error in event processing interval:', error);
      }
    }, config.intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Deposit event listener stopped');
    process.exit(0);
  }

  async processEvents() {
    try {
      console.log('🔍 Processing deposit events...');

      // Get main wallet configurations
      const { data: mainWallets, error: walletError } = await supabase
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

      // Update confirmation counts
      await this.updateConfirmations();

      // Clean up expired intents
      await this.cleanupExpiredIntents();

    } catch (error) {
      console.error('❌ Error in processEvents:', error);
    }
  }

  async processTronEvents(wallet) {
    try {
      // Dynamic import for TronWeb
      const TronWeb = (await import('tronweb')).default;
      const tronWeb = new TronWeb({
        fullHost: config.tronGridUrl,
      });

      // Get last processed block
      const { data: tracker } = await supabase
        .from('block_tracker')
        .select('*')
        .eq('network', 'TRC20')
        .single();

      const fromBlock = tracker?.last_processed_block || 0;
      
      // Get current block
      const currentBlock = await tronWeb.trx.getCurrentBlock();
      const currentBlockNumber = currentBlock.block_header.raw_data.number;

      if (fromBlock >= currentBlockNumber) {
        console.log(`📊 TRON: No new blocks (current: ${currentBlockNumber})`);
        return;
      }

      console.log(`🔍 TRON: Processing blocks ${fromBlock + 1} to ${currentBlockNumber}`);

      // Get recent transactions to our wallet
      const transactions = await tronWeb.trx.getTransactionsFromAddress(wallet.address, 50);

      for (const tx of transactions) {
        try {
          if (tx.raw_data?.contract?.[0]?.type === 'TriggerSmartContract') {
            const contractData = tx.raw_data.contract[0];
            
            if (contractData.parameter?.value?.contract_address === 
                tronWeb.address.toHex(wallet.contract_address)) {
              await this.processTronTransaction(tx, wallet, tronWeb);
            }
          }
        } catch (error) {
          console.error(`❌ Error processing TRON tx ${tx.txID}:`, error);
        }
      }

      // Update block tracker
      await this.updateBlockTracker('TRC20', currentBlockNumber);

    } catch (error) {
      console.error('❌ Error in processTronEvents:', error);
    }
  }

  async processBscEvents(wallet) {
    try {
      const provider = new ethers.JsonRpcProvider(config.bscRpcUrl);

      // Get last processed block
      const { data: tracker } = await supabase
        .from('block_tracker')
        .select('*')
        .eq('network', 'BEP20')
        .single();

      const fromBlock = tracker?.last_processed_block || 0;
      const currentBlock = await provider.getBlockNumber();

      if (fromBlock >= currentBlock) {
        console.log(`📊 BSC: No new blocks (current: ${currentBlock})`);
        return;
      }

      const chunkSize = 1000;
      const toBlock = Math.min(fromBlock + chunkSize, currentBlock);

      console.log(`🔍 BSC: Processing blocks ${fromBlock + 1} to ${toBlock}`);

      const usdtContract = new ethers.Contract(wallet.contract_address, USDT_ABI, provider);
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

      await this.updateBlockTracker('BEP20', toBlock);

    } catch (error) {
      console.error('❌ Error in processBscEvents:', error);
    }
  }

  async processTronTransaction(tx, wallet, tronWeb) {
    try {
      // Check if already processed
      const { data: existingTx } = await supabase
        .from('event_deposit_transactions')
        .select('id')
        .eq('tx_hash', tx.txID)
        .single();

      if (existingTx) return;

      // Get transaction info
      const txInfo = await tronWeb.trx.getTransactionInfo(tx.txID);
      let amount = 0;
      let fromAddress = '';

      if (txInfo.log && txInfo.log.length > 0) {
        const transferLog = txInfo.log.find(log => 
          log.topics && log.topics[0] === tronWeb.sha3('Transfer(address,address,uint256)')
        );

        if (transferLog) {
          fromAddress = tronWeb.address.fromHex('0x' + transferLog.topics[1].slice(24));
          amount = parseInt(transferLog.data, 16) / 1000000;
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

  async processBscEvent(event, wallet, provider) {
    try {
      // Check if already processed
      const { data: existingTx } = await supabase
        .from('event_deposit_transactions')
        .select('id')
        .eq('tx_hash', event.transactionHash)
        .single();

      if (existingTx) return;

      if (!('args' in event) || !event.args) return;

      const fromAddress = event.args[0];
      const toAddress = event.args[1];
      const amount = parseFloat(ethers.formatUnits(event.args[2], 6));

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
          raw_transaction_data: { event, block }
        });
      }

    } catch (error) {
      console.error(`❌ Error processing BSC event:`, error);
    }
  }

  async createDepositTransaction(data) {
    try {
      // Try to match with deposit intent
      const { data: matchingIntent } = await supabase
        .from('deposit_intents')
        .select('*')
        .eq('network', data.network)
        .eq('status', 'pending')
        .gte('amount_usdt', data.amount_usdt * 0.95)
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

      const { error } = await supabase
        .from('event_deposit_transactions')
        .insert(depositTransaction);

      if (error) throw error;

      console.log(`✅ Created deposit: ${data.tx_hash} (${data.amount_usdt} USDT)`);

      if (matchingIntent) {
        await supabase
          .from('deposit_intents')
          .update({ 
            status: 'detected',
            updated_at: new Date().toISOString()
          })
          .eq('id', matchingIntent.id);

        console.log(`🎯 Matched with intent: ${matchingIntent.reference_code}`);
      }

    } catch (error) {
      console.error('❌ Error creating deposit transaction:', error);
    }
  }

  async updateConfirmations() {
    try {
      const { data: pendingTxs } = await supabase
        .from('event_deposit_transactions')
        .select('*')
        .in('status', ['pending', 'confirmed'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (!pendingTxs?.length) return;

      for (const tx of pendingTxs) {
        try {
          let currentConfirmations = 0;

          if (tx.network === 'TRC20') {
            const TronWeb = (await import('tronweb')).default;
            const tronWeb = new TronWeb({ fullHost: config.tronGridUrl });
            const currentBlock = await tronWeb.trx.getCurrentBlock();
            currentConfirmations = currentBlock.block_header.raw_data.number - tx.block_number;
          } else if (tx.network === 'BEP20') {
            const provider = new ethers.JsonRpcProvider(config.bscRpcUrl);
            const currentBlock = await provider.getBlockNumber();
            currentConfirmations = currentBlock - tx.block_number;
          }

          if (currentConfirmations !== tx.confirmations) {
            const updates = {
              confirmations: currentConfirmations,
              updated_at: new Date().toISOString()
            };

            const { data: wallet } = await supabase
              .from('main_wallets')
              .select('min_confirmations')
              .eq('network', tx.network)
              .single();

            const minConfirmations = wallet?.min_confirmations || 12;

            if (currentConfirmations >= minConfirmations && tx.status === 'pending') {
              updates.status = 'confirmed';
              updates.confirmed_at = new Date().toISOString();
              await this.creditUserBalance(tx);
            }

            await supabase
              .from('event_deposit_transactions')
              .update(updates)
              .eq('id', tx.id);
          }

        } catch (error) {
          console.error(`❌ Error updating confirmations for ${tx.tx_hash}:`, error);
        }
      }

    } catch (error) {
      console.error('❌ Error in updateConfirmations:', error);
    }
  }

  async creditUserBalance(tx) {
    try {
      if (!tx.user_id) {
        console.log(`⚠️ No user_id for ${tx.tx_hash}, skipping credit`);
        return;
      }

      // Get current balance
      const { data: balanceData } = await supabase
        .from('balances')
        .select('available_usdt')
        .eq('user_id', tx.user_id)
        .single();

      const currentBalance = Number(balanceData?.available_usdt || 0);
      const newBalance = currentBalance + tx.amount_usdt;

      // Update balance
      await supabase
        .from('balances')
        .upsert({
          user_id: tx.user_id,
          available_usdt: newBalance
        }, { onConflict: 'user_id' });

      // Create transaction record
      await supabase
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

      // Update deposit transaction
      await supabase
        .from('event_deposit_transactions')
        .update({
          status: 'credited',
          credited_at: new Date().toISOString()
        })
        .eq('id', tx.id);

      // Update intent
      if (tx.deposit_intent_id) {
        await supabase
          .from('deposit_intents')
          .update({
            status: 'credited',
            updated_at: new Date().toISOString()
          })
          .eq('id', tx.deposit_intent_id);
      }

      console.log(`💰 Credited ${tx.amount_usdt} USDT to user ${tx.user_id} (Balance: ${newBalance})`);

    } catch (error) {
      console.error('❌ Error crediting balance:', error);
    }
  }

  async updateBlockTracker(network, blockNumber) {
    try {
      await supabase
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

  async cleanupExpiredIntents() {
    try {
      const { data, error } = await supabase
        .rpc('cleanup_expired_deposit_intents');

      if (error) throw error;
      if (data > 0) {
        console.log(`🧹 Cleaned up ${data} expired intents`);
      }
    } catch (error) {
      console.error('❌ Error cleaning up expired intents:', error);
    }
  }
}

// Start the service
const listener = new StandaloneDepositListener();
listener.start().catch(error => {
  console.error('❌ Failed to start deposit listener:', error);
  process.exit(1);
});
