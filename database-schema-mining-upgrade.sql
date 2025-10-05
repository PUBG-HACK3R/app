-- ===============================================
-- WeEarn Mining System Database Schema Upgrade
-- ===============================================

-- Add new columns to plans table for mining-specific data
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS mining_type VARCHAR(100) DEFAULT 'ASIC Mining',
ADD COLUMN IF NOT EXISTS hash_rate VARCHAR(50) DEFAULT '0 TH/s',
ADD COLUMN IF NOT EXISTS power_consumption VARCHAR(50) DEFAULT '0W',
ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'Medium',
ADD COLUMN IF NOT EXISTS features JSON,
ADD COLUMN IF NOT EXISTS mining_pool VARCHAR(100),
ADD COLUMN IF NOT EXISTS equipment_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS energy_source VARCHAR(100) DEFAULT 'Mixed',
ADD COLUMN IF NOT EXISTS location VARCHAR(100),
ADD COLUMN IF NOT EXISTS maintenance_included BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS insurance_covered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS real_time_monitoring BOOLEAN DEFAULT true;

-- Add mining statistics table
CREATE TABLE IF NOT EXISTS mining_stats (
    id SERIAL PRIMARY KEY,
    plan_id INT NOT NULL,
    user_id UUID,
    hash_rate_current VARCHAR(50),
    power_consumption_current VARCHAR(50),
    temperature DECIMAL(5,2),
    uptime_percentage DECIMAL(5,2),
    blocks_mined INT DEFAULT 0,
    total_rewards DECIMAL(15,8) DEFAULT 0,
    efficiency_rating DECIMAL(3,2) DEFAULT 0,
    last_maintenance TIMESTAMP,
    next_maintenance TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Maintenance', 'Offline', 'Error')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
);

-- Add mining rewards table for detailed tracking
CREATE TABLE IF NOT EXISTS mining_rewards (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    subscription_id UUID,
    mining_stat_id INT,
    reward_type VARCHAR(20) DEFAULT 'Mining' CHECK (reward_type IN ('Mining', 'Staking', 'DeFi', 'Pool')),
    cryptocurrency VARCHAR(20) DEFAULT 'BTC',
    amount_crypto DECIMAL(18,8),
    amount_usdt DECIMAL(15,2),
    hash_rate_contribution VARCHAR(50),
    block_height INT,
    mining_difficulty VARCHAR(50),
    pool_share_percentage DECIMAL(5,4),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
    FOREIGN KEY (mining_stat_id) REFERENCES mining_stats(id) ON DELETE SET NULL
);

-- Add mining equipment table
CREATE TABLE IF NOT EXISTS mining_equipment (
    id SERIAL PRIMARY KEY,
    plan_id INT NOT NULL,
    equipment_name VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    manufacturer VARCHAR(100),
    hash_rate VARCHAR(50),
    power_consumption VARCHAR(50),
    efficiency VARCHAR(50),
    purchase_date DATE,
    warranty_expiry DATE,
    location VARCHAR(100),
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Maintenance', 'Retired', 'Damaged')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);

-- Add mining pools table
CREATE TABLE IF NOT EXISTS mining_pools (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    cryptocurrency VARCHAR(20) NOT NULL,
    pool_url VARCHAR(255),
    fee_percentage DECIMAL(4,3),
    minimum_payout DECIMAL(15,8),
    payment_method VARCHAR(20) DEFAULT 'PPS' CHECK (payment_method IN ('PPS', 'PPLNS', 'SOLO')),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default mining pools
INSERT INTO mining_pools (name, cryptocurrency, pool_url, fee_percentage, minimum_payout, payment_method) VALUES
('Antpool', 'BTC', 'stratum+tcp://stratum-btc.antpool.com:3333', 2.500, 0.001, 'PPS'),
('F2Pool', 'BTC', 'stratum+tcp://btc.f2pool.com:3333', 2.500, 0.001, 'PPS'),
('Poolin', 'BTC', 'stratum+tcp://btc.poolin.com:443', 2.500, 0.001, 'PPS'),
('ViaBTC', 'BTC', 'stratum+tcp://btc.viabtc.com:3333', 2.000, 0.001, 'PPS'),
('Ethermine', 'ETH', 'stratum1+tcp://eth-us-east1.nanopool.org:9999', 1.000, 0.01, 'PPLNS'),
('2Miners', 'ETH', 'stratum1+tcp://eth.2miners.com:2020', 1.000, 0.01, 'PPLNS');

-- Update subscriptions table for mining data (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
        ALTER TABLE subscriptions 
        ADD COLUMN IF NOT EXISTS mining_pool_id INT,
        ADD COLUMN IF NOT EXISTS equipment_assigned JSON,
        ADD COLUMN IF NOT EXISTS hash_rate_allocated VARCHAR(50),
        ADD COLUMN IF NOT EXISTS power_allocated VARCHAR(50),
        ADD COLUMN IF NOT EXISTS mining_address VARCHAR(255),
        ADD COLUMN IF NOT EXISTS auto_compound BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS compound_percentage DECIMAL(5,2) DEFAULT 0;
        
        -- Add foreign key constraint if mining_pools table exists
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'mining_pools') THEN
            ALTER TABLE subscriptions 
            ADD CONSTRAINT fk_subscriptions_mining_pool 
            FOREIGN KEY (mining_pool_id) REFERENCES mining_pools(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Add crypto prices table for real-time tracking
CREATE TABLE IF NOT EXISTS crypto_prices (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(100),
    price_usd DECIMAL(15,8),
    price_change_24h DECIMAL(8,4),
    market_cap BIGINT,
    volume_24h BIGINT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (symbol)
);

-- Insert initial crypto prices
INSERT INTO crypto_prices (symbol, name, price_usd, price_change_24h) VALUES
('BTC', 'Bitcoin', 43000.00, 2.5),
('ETH', 'Ethereum', 2600.00, 1.8),
('LTC', 'Litecoin', 70.00, -0.5),
('BCH', 'Bitcoin Cash', 250.00, 1.2),
('DOGE', 'Dogecoin', 0.08, 3.2),
('ADA', 'Cardano', 0.45, 0.8)
ON CONFLICT (symbol) DO UPDATE SET 
price_usd = EXCLUDED.price_usd,
price_change_24h = EXCLUDED.price_change_24h,
last_updated = CURRENT_TIMESTAMP;

-- Add mining calculator settings
CREATE TABLE IF NOT EXISTS mining_calculator_settings (
    id SERIAL PRIMARY KEY,
    cryptocurrency VARCHAR(20) NOT NULL,
    network_difficulty VARCHAR(50),
    block_reward DECIMAL(15,8),
    block_time_seconds INT,
    electricity_cost_kwh DECIMAL(6,4) DEFAULT 0.10,
    pool_fee_percentage DECIMAL(4,3) DEFAULT 2.5,
    hardware_cost_usd DECIMAL(10,2),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (cryptocurrency)
);

-- Insert mining calculator data
INSERT INTO mining_calculator_settings (cryptocurrency, network_difficulty, block_reward, block_time_seconds, electricity_cost_kwh, pool_fee_percentage) VALUES
('BTC', '62.46T', 6.25, 600, 0.10, 2.5),
('ETH', '15.8P', 2.0, 13, 0.10, 1.0),
('LTC', '23.4M', 12.5, 150, 0.10, 2.5)
ON CONFLICT (cryptocurrency) DO UPDATE SET 
network_difficulty = EXCLUDED.network_difficulty,
block_reward = EXCLUDED.block_reward,
last_updated = CURRENT_TIMESTAMP;

-- Create indexes for better performance
CREATE INDEX idx_mining_stats_user_plan ON mining_stats(user_id, plan_id);
CREATE INDEX idx_mining_rewards_user_date ON mining_rewards(user_id, timestamp);
CREATE INDEX idx_mining_rewards_subscription ON mining_rewards(subscription_id);
CREATE INDEX idx_crypto_prices_symbol ON crypto_prices(symbol);
CREATE INDEX idx_mining_equipment_plan ON mining_equipment(plan_id);

-- Update plan categories with mining-specific data
ALTER TABLE plan_categories 
ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT 'bitcoin',
ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT '#F7931A',
ADD COLUMN IF NOT EXISTS mining_focus VARCHAR(100),
ADD COLUMN IF NOT EXISTS risk_category VARCHAR(20) DEFAULT 'Moderate' CHECK (risk_category IN ('Conservative', 'Moderate', 'Aggressive'));

-- Create mining dashboard settings
CREATE TABLE IF NOT EXISTS user_mining_preferences (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    preferred_cryptocurrency VARCHAR(20) DEFAULT 'BTC',
    auto_reinvest BOOLEAN DEFAULT false,
    reinvest_percentage DECIMAL(5,2) DEFAULT 0,
    notification_mining_rewards BOOLEAN DEFAULT true,
    notification_maintenance BOOLEAN DEFAULT true,
    notification_price_alerts BOOLEAN DEFAULT false,
    dashboard_layout JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
    UNIQUE (user_id)
);

-- Add mining news/updates table
CREATE TABLE IF NOT EXISTS mining_news (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    category VARCHAR(20) DEFAULT 'Mining' CHECK (category IN ('Mining', 'Market', 'Technology', 'Regulation', 'Equipment')),
    cryptocurrency VARCHAR(20),
    importance VARCHAR(20) DEFAULT 'Medium' CHECK (importance IN ('Low', 'Medium', 'High', 'Critical')),
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true
);

-- Insert sample mining news
INSERT INTO mining_news (title, content, category, cryptocurrency, importance) VALUES
('Bitcoin Mining Difficulty Adjustment', 'Bitcoin mining difficulty has increased by 3.2% in the latest adjustment, reflecting the growing network hash rate.', 'Mining', 'BTC', 'Medium'),
('New ASIC Miners Released', 'Latest generation ASIC miners offer 15% better efficiency compared to previous models.', 'Equipment', 'BTC', 'High'),
('Ethereum 2.0 Staking Updates', 'Ethereum staking rewards have been optimized with the latest network upgrade.', 'Technology', 'ETH', 'Medium');

-- Verification query
SELECT 'Mining Database Schema Upgrade Complete' as status;
