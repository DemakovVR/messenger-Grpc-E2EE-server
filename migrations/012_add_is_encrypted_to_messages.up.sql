-- +goose Up

ALTER TABLE messages ADD COLUMN is_encrypted BOOLEAN DEFAULT FALSE;