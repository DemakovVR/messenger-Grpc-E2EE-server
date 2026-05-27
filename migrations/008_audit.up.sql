-- +goose Up

ALTER TABLE audit_logs ADD COLUMN chat_id UUID NULL;