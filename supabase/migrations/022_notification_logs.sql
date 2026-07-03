-- 022: Notification Logs
-- Idempotent notification tracking: prevents duplicate emails/SMS/push.
-- Each (order_id, event_type, notification_type, sent_status) combination
-- uniquely identifies a notification delivery.

CREATE TABLE IF NOT EXISTS notification_logs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID        NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  user_id           UUID        NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  notification_type TEXT        NOT NULL CHECK (notification_type IN ('email', 'sms', 'push')),
  event_type        TEXT        NOT NULL,
  sent_status       TEXT        NOT NULL DEFAULT 'pending' CHECK (sent_status IN ('pending', 'sent', 'failed')),
  provider_message_id TEXT,
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate notifications for the same (order, event, channel)
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_logs_idempotent
  ON notification_logs (order_id, event_type, notification_type)
  WHERE sent_status = 'sent';

CREATE INDEX IF NOT EXISTS idx_notification_logs_order
  ON notification_logs (order_id, created_at DESC);
