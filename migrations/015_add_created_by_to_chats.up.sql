-- +goose Up
ALTER TABLE chats ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;