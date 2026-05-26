package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type AuditRepository struct {
	db *pgxpool.Pool
}

func NewAuditRepository(
	db *pgxpool.Pool,
) *AuditRepository {

	return &AuditRepository{
		db: db,
	}
}

func (r *AuditRepository) CreateLog(
	ctx context.Context,
	userID string,
	action string,
	details string,
) error {

	_, err := r.db.Exec(
		ctx,
		`
		INSERT INTO audit_logs
		(user_id, action, details)
		VALUES ($1,$2,$3)
		`,
		userID,
		action,
		details,
	)

	return err
}
