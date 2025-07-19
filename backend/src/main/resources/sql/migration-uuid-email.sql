-- Migration script to update B-Talk database to use UUID and email
-- Run this script on your existing database

-- 1. Create new tables with UUID and email structure
CREATE TABLE users_new (
    user_id CHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255),
    profile_photo_url VARCHAR(500),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'OFFLINE',
    reset_token VARCHAR(255),
    reset_token_expiry TIMESTAMP
);

CREATE TABLE notifications_new (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    type VARCHAR(50),
    data TEXT,
    read_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users_new(user_id) ON DELETE CASCADE
);

-- 2. Create indexes for better performance
CREATE INDEX idx_users_email ON users_new(email);
CREATE INDEX idx_users_reset_token ON users_new(reset_token);
CREATE INDEX idx_notifications_user_id ON notifications_new(user_id);
CREATE INDEX idx_notifications_read_status ON notifications_new(read_status);
CREATE INDEX idx_notifications_created_at ON notifications_new(created_at);

-- 3. If you have existing data, you can migrate it like this:
-- (Uncomment and modify these lines if you have existing data to migrate)

/*
-- Migrate existing users (if any)
INSERT INTO users_new (user_id, email, name, last_name, profile_photo_url, password_hash, created_at, status)
SELECT 
    UUID() as user_id,
    CONCAT(phone_number, '@example.com') as email, -- Convert phone to email
    name,
    last_name,
    profile_photo_url,
    password_hash,
    created_at,
    status
FROM users;

-- Migrate existing notifications (if any)
INSERT INTO notifications_new (id, user_id, title, body, type, data, read_status, created_at, read_at)
SELECT 
    UUID() as id,
    (SELECT user_id FROM users_new WHERE email = CONCAT(u.phone_number, '@example.com')) as user_id,
    title,
    body,
    type,
    data,
    read_status,
    created_at,
    read_at
FROM notifications n
JOIN users u ON n.user_id = u.user_id;
*/

-- 4. Drop old tables and rename new ones
-- (Uncomment these lines after confirming the migration worked correctly)

/*
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS users;

RENAME TABLE users_new TO users;
RENAME TABLE notifications_new TO notifications;
*/

-- 5. Update other related tables to use UUID
-- (Add similar migration for other tables like conversations, messages, etc.)

-- Example for conversations table:
/*
CREATE TABLE conversations_new (
    conversation_id CHAR(36) PRIMARY KEY,
    name VARCHAR(255),
    type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE participants_new (
    participant_id CHAR(36) PRIMARY KEY,
    conversation_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    role VARCHAR(20) DEFAULT 'MEMBER',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations_new(conversation_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE messages_new (
    message_id CHAR(36) PRIMARY KEY,
    conversation_id CHAR(36) NOT NULL,
    sender_id CHAR(36) NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'TEXT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations_new(conversation_id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE
);
*/ 