CREATE TABLE IF NOT EXISTS one_time_prekeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    device_key_id UUID NOT NULL
        REFERENCES device_keys(id)
        ON DELETE CASCADE,

    key_id INT NOT NULL,
    public_key TEXT NOT NULL,

    used BOOLEAN DEFAULT false,
    used_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(device_key_id, key_id)
);

CREATE INDEX idx_prekeys_device_key_id ON one_time_prekeys(device_key_id);