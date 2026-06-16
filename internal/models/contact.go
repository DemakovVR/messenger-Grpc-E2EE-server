package models

import (
	"time"

	"github.com/google/uuid"
)

type Contact struct {
	UserID    uuid.UUID `db:"user_id"`
	ContactID uuid.UUID `db:"contact_id"`
	CreatedAt time.Time `db:"created_at"`
}

type BlockedContact struct {
	UserID        uuid.UUID `db:"user_id"`
	BlockedUserID uuid.UUID `db:"blocked_user_id"`
	CreatedAt     time.Time `db:"created_at"`
}
