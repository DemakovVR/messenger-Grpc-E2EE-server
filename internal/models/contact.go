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
