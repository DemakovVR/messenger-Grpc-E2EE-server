package models

import "time"

type AuditLog struct {
	ID        int64
	UserID    string
	Action    string
	Details   string
	CreatedAt time.Time
}
