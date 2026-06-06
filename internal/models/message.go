package models

import (
	"time"

	"github.com/google/uuid"
)

type Message struct {
	ID               uuid.UUID  `db:"id"`
	ChatID           uuid.UUID  `db:"chat_id"`
	SenderID         uuid.UUID  `db:"sender_id"`
	EncryptedContent string     `db:"encrypted_content"`
	EncryptedFileURL *string    `db:"encrypted_file_url"`
	IsEdited         bool       `db:"is_edited"`
	IsDeleted        bool       `db:"is_deleted"`
	IsEncrypted      bool       `db:"is_encrypted"`
	SentAt           time.Time  `db:"sent_at"`
	CreatedAt        time.Time  `db:"created_at"`
	UpdatedAt        time.Time  `db:"updated_at"`
	ReplyToID        *uuid.UUID `db:"reply_to_id"`
}

type MessageResponse struct {
	ID               uuid.UUID  `db:"id" json:"id"`
	ChatID           uuid.UUID  `db:"chat_id" json:"chatId"`
	SenderID         uuid.UUID  `db:"sender_id" json:"senderId"`
	EncryptedContent string     `db:"encrypted_content" json:"encryptedContent"`
	EncryptedFileURL *string    `db:"encrypted_file_url" json:"encryptedFileURL"`
	IsEdited         bool       `db:"is_edited" json:"isEdited"`
	IsDeleted        bool       `db:"is_deleted" json:"isDeleted"`
	IsEncrypted      bool       `db:"is_encrypted" json:"isEncrypted"`
	SentAt           time.Time  `db:"sent_at" json:"sentAt"`
	CreatedAt        time.Time  `db:"created_at" json:"createdAt"`
	UpdatedAt        time.Time  `db:"updated_at" json:"updatedAt"`
	ReplyToID        *uuid.UUID `db:"reply_to_id" json:"replyToId"`

	ParentSenderID    *uuid.UUID `db:"parent_sender_id" json:"parentSenderId"`
	ParentContent     *string    `db:"parent_content" json:"parentContent"`
	ParentIsEncrypted *bool      `db:"parent_is_encrypted" json:"parentIsEncrypted"`
}
