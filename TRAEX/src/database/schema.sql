-- 1. Activer UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Table Accounts
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    initial_balance DECIMAL(15,2) NOT NULL DEFAULT 10000.00,
    balance DECIMAL(15,2) NOT NULL DEFAULT 10000.00,
    equity DECIMAL(15,2) NOT NULL DEFAULT 10000.00,
    risk_settings JSONB NOT NULL DEFAULT '{
        "maxRiskPerTrade": 0.01,
        "maxDailyLoss": 0.03,
        "maxOpenTrades": 1,
        "defaultRR": 2.0
    }'::jsonb,
    daily_stats JSONB NOT NULL DEFAULT '{
        "date": null,
        "startingBalance": 10000.00,
        "currentPnL": 0,
        "tradesCount": 0,
        "tradingStopped": false
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table Trades
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id),
    symbol VARCHAR(20) NOT NULL,
    direction VARCHAR(4) NOT NULL CHECK (direction IN ('BUY', 'SELL')),
    entry_price DECIMAL(15,5) NOT NULL,
    stop_loss DECIMAL(15,5) NOT NULL,
    take_profit DECIMAL(15,5) NOT NULL,
    lot_size DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'OPEN', 'CLOSED', 'CANCELLED')),
    execution_status VARCHAR(20) NOT NULL CHECK (execution_status IN ('SENT', 'FILLED', 'PARTIAL_FILL', 'REJECTED', 'FAILED')),
    pnl DECIMAL(15,2) DEFAULT 0,
    pnl_pips DECIMAL(10,2) DEFAULT 0,
    context_id VARCHAR(50) NOT NULL,
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    close_reason VARCHAR(10) CHECK (close_reason IN ('SL', 'TP', 'MANUAL')),
    execution_error TEXT,
    close_price DECIMAL(15,5),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trades_account ON trades(account_id);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_context ON trades(context_id);
CREATE INDEX idx_trades_opened_at ON trades(opened_at DESC);

-- 4. Table Trading Events
CREATE TABLE trading_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    context_id VARCHAR(50) NOT NULL,
    timestamp BIGINT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_context ON trading_events(context_id);
CREATE INDEX idx_events_timestamp ON trading_events(timestamp DESC);

-- 5. Table Push Subscriptions
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Table Notifications Log
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivered BOOLEAN DEFAULT false,
    sent_count INTEGER DEFAULT 0
);

-- 7. Table Performance Reports
CREATE TABLE performance_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    starting_balance DECIMAL(15,2) NOT NULL,
    ending_balance DECIMAL(15,2) NOT NULL,
    total_pnl DECIMAL(15,2) NOT NULL,
    total_trades INTEGER NOT NULL,
    winning_trades INTEGER NOT NULL,
    losing_trades INTEGER NOT NULL,
    win_rate DECIMAL(5,2) NOT NULL,
    avg_win DECIMAL(15,2),
    avg_loss DECIMAL(15,2),
    profit_factor DECIMAL(10,2),
    max_drawdown DECIMAL(15,2),
    risk_settings JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON push_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();