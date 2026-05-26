-- +goose Up
CREATE TABLE IF NOT EXISTS device_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    device_id VARCHAR(128) NOT NULL,

    identity_key_public TEXT NOT NULL,
    signed_prekey_public TEXT NOT NULL,
    signed_prekey_signature TEXT NOT NULL,

    active BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, device_id)
);

CREATE INDEX idx_device_keys_user_id ON device_keys(user_id);
CREATE INDEX idx_device_keys_device_id ON device_keys(device_id);