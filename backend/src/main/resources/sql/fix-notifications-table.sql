-- Fix notifications table schema
-- Drop the existing table if it exists
DROP TABLE IF EXISTS notifications;

-- Create the notifications table with proper schema
CREATE TABLE notifications (
    notification_id BINARY(16) PRIMARY KEY,
    recipient_id BINARY(16) NOT NULL,
    sender_id BINARY(16),
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
);

-- Create indexes for better performance
CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_sender_id ON notifications(sender_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_is_deleted ON notifications(is_deleted);
CREATE INDEX idx_notifications_type ON notifications(type); 