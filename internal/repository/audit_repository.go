package repository

import (
	"Server/internal/models"
	"context"

	"github.com/google/uuid"
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
	userID uuid.UUID,
	chatID *uuid.UUID,
	action string,
	details *string,
) error {

	_, err := r.db.Exec(ctx, `
        INSERT INTO audit_logs
        (user_id, chat_id, action, details)
        VALUES ($1,$2,$3,$4)
    `,
		userID,
		chatID,
		action,
		details,
	)

	return err
}

func (r *AuditRepository) GetUserLogs(
	ctx context.Context,
	userID uuid.UUID,
) ([]models.AuditLog, error) {

	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, chat_id, action, details, created_at
		FROM audit_logs
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT 100
	`, userID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []models.AuditLog

	for rows.Next() {
		var l models.AuditLog
		err := rows.Scan(
			&l.ID,
			&l.UserID,
			&l.ChatID,
			&l.Action,
			&l.Details,
			&l.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		logs = append(logs, l)
	}

	return logs, nil
}

func (r *AuditRepository) GetChatLogs(
	ctx context.Context,
	chatID uuid.UUID,
) ([]models.AuditLog, error) {

	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, chat_id, action, details, created_at
		FROM audit_logs
		WHERE chat_id = $1
		ORDER BY created_at DESC
	`, chatID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []models.AuditLog

	for rows.Next() {
		var l models.AuditLog
		_ = rows.Scan(
			&l.ID,
			&l.UserID,
			&l.ChatID,
			&l.Action,
			&l.Details,
			&l.CreatedAt,
		)
		logs = append(logs, l)
	}

	return logs, nil
}
