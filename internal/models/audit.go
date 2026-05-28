package models

import (
	"time"

	"github.com/google/uuid"
)

type AuditLog struct {
	ID        uuid.UUID  `db:"id"`
	UserID    uuid.UUID  `db:"user_id"`
	ChatID    *uuid.UUID `db:"chat_id"`
	Action    string     `db:"action"`
	Details   *string    `db:"details"`
	CreatedAt time.Time  `db:"created_at"`
}
