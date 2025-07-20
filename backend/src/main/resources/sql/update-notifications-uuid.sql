-- Update notifications table to use VARCHAR(36) for UUID fields
-- This migration handles the transition from BINARY(16) to VARCHAR(36)

-- First, create a backup of the existing data
CREATE TABLE notifications_backup AS SELECT * FROM notifications;

-- Drop the existing table
DROP TABLE notifications;

-- Create the notifications table with proper schema for MySQL
CREATE TABLE notifications (
    notification_id VARCHAR(36) PRIMARY KEY,
    recipient_id VARCHAR(36) NOT NULL,
    sender_id VARCHAR(36),
    title VARCHAR(255) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    type VARCHAR(50) NOT NULL,
    data VARCHAR(2000),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    FOREIGN KEY (recipient_id) REFERENCES users(user_id),
    FOREIGN KEY (sender_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create indexes for better performance
CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_sender_id ON notifications(sender_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_is_deleted ON notifications(is_deleted);
CREATE INDEX idx_notifications_type ON notifications(type);

-- Note: If you need to restore data from the backup, you would need to convert
-- the BINARY(16) data to VARCHAR(36) format. This is typically done by
-- converting the binary data to hex string and then to UUID format. 