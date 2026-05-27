-- +goose Up

CREATE TABLE blocked_contacts (
    user_id UUID,
    blocked_user_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, blocked_user_id)
);