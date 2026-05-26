-- +goose Up

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    token TEXT NOT NULL UNIQUE,

    expires_at TIMESTAMP NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- +goose Down

DROP TABLE IF EXISTS refresh_tokens;