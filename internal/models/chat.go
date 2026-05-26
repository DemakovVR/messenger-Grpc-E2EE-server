package models

import (
	"time"

	"github.com/google/uuid"
)

type Chat struct {
	ID        uuid.UUID `db:"id"`
	Type      string    `db:"type"`
	Name      string    `db:"name"`
	CreatedAt time.Time `db:"created_at"`
	UpdatedAt time.Time `db:"updated_at"`
}

type ChatParticipant struct {
	ChatID   uuid.UUID `db:"chat_id"`
	UserID   uuid.UUID `db:"user_id"`
	JoinedAt time.Time `db:"joined_at"`
}
