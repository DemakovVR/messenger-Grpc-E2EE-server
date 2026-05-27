package models

import (
	"time"

	"github.com/google/uuid"
)

type Message struct {
	ID               uuid.UUID `db:"id"`
	ChatID           uuid.UUID `db:"chat_id"`
	SenderID         uuid.UUID `db:"sender_id"`
	EncryptedContent string    `db:"encrypted_content"`
	EncryptedFileURL *string   `db:"encrypted_file_url"`

	IsEdited  bool `db:"is_edited"`
	IsDeleted bool `db:"is_deleted"`

	SentAt    time.Time `db:"sent_at"`
	CreatedAt time.Time `db:"created_at"`
	UpdatedAt time.Time `db:"updated_at"`
}
