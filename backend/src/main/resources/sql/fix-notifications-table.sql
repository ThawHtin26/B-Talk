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

-- Migration script to fix notifications table for String IDs
-- This script changes the notification_id column from UUID to VARCHAR

-- First, drop the existing primary key constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_pkey;

-- Change the notification_id column type from UUID to VARCHAR(255)
ALTER TABLE notifications ALTER COLUMN notification_id TYPE VARCHAR(255);

-- Add back the primary key constraint
ALTER TABLE notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (notification_id);

-- Update the default value to generate a UUID string instead of UUID type
ALTER TABLE notifications ALTER COLUMN notification_id SET DEFAULT gen_random_uuid()::text;

-- Also update the foreign key columns to VARCHAR
ALTER TABLE notifications ALTER COLUMN recipient_id TYPE VARCHAR(255);
ALTER TABLE notifications ALTER COLUMN sender_id TYPE VARCHAR(255);

-- Drop and recreate foreign key constraints
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS fk_notifications_recipient;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS fk_notifications_sender;

-- Add back foreign key constraints
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_recipient 
    FOREIGN KEY (recipient_id) REFERENCES users(user_id) ON DELETE CASCADE;
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_sender 
    FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE SET NULL;

-- Recreate indexes
DROP INDEX IF EXISTS idx_notifications_recipient_id;
DROP INDEX IF EXISTS idx_notifications_sender_id;
DROP INDEX IF EXISTS idx_notifications_recipient_read;

CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_sender_id ON notifications(sender_id);
CREATE INDEX idx_notifications_recipient_read ON notifications(recipient_id, is_read); 