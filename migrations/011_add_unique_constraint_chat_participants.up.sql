-- +goose Up

ALTER TABLE chat_participants ADD CONSTRAINT unique_chat_participant UNIQUE (chat_id, user_id);
