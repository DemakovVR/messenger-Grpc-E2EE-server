-- +goose Up

CREATE TABLE IF NOT EXISTS group_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    group_key_id VARCHAR(100) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(128) NOT NULL,
    encrypted_key TEXT NOT NULL,
    iv TEXT NOT NULL,
    ephemeral_public_key TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id, device_id)
);

CREATE INDEX idx_group_keys_group_id ON group_keys(group_id);
CREATE INDEX idx_group_keys_user_id ON group_keys(user_id);

CREATE TABLE IF NOT EXISTS group_key_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    group_key_id VARCHAR(100) NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true,
    UNIQUE(group_id, group_key_id)
);

CREATE INDEX idx_group_key_versions_group_id ON group_key_versions(group_id);