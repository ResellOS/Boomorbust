-- Performance indexes for high-query tables
-- Run at: https://app.supabase.com/project/jotxstcrirvpswdcqwj/sql/new

-- trades
CREATE INDEX IF NOT EXISTS idx_trades_status     ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_created    ON trades(created_at DESC);

-- notifications hot queries
CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read    ON notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- leagues
CREATE INDEX IF NOT EXISTS idx_leagues_season ON leagues(season);

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_tier    ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_sleeper ON profiles(sleeper_user_id);

-- medical_history
CREATE INDEX IF NOT EXISTS idx_medical_player ON medical_history(player_id);
CREATE INDEX IF NOT EXISTS idx_medical_season ON medical_history(season);

-- Verify
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
