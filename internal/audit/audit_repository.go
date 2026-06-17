package audit

import (
	"Server/internal/models"
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AuditRepository struct {
	db *pgxpool.Pool
}

func NewAuditRepository(db *pgxpool.Pool) *AuditRepository {
	return &AuditRepository{db: db}
}

func (r *AuditRepository) CreateLog(
	ctx context.Context,
	userID uuid.UUID,
	chatID *uuid.UUID,
	action string,
	details *string,
) error {
	_, err := r.db.Exec(ctx, `
        INSERT INTO audit_logs (user_id, chat_id, action, details)
        VALUES ($1, $2, $3, $4)
    `, userID, chatID, action, details)
	return err
}

func (r *AuditRepository) GetUserLogs(ctx context.Context, userID uuid.UUID) ([]models.AuditLog, error) {
	rows, err := r.db.Query(ctx, `
        SELECT a.id, a.user_id, a.chat_id, a.action, a.details, a.created_at, u.username
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.user_id = $1
        ORDER BY a.created_at DESC
        LIMIT 100
    `, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []models.AuditLog

	for rows.Next() {
		var l models.AuditLog
		var dbID pgtype.UUID
		var dbUserID pgtype.UUID
		var dbChatID pgtype.UUID
		var dbUsername pgtype.Text

		err := rows.Scan(
			&dbID,
			&dbUserID,
			&dbChatID,
			&l.Action,
			&l.Details,
			&l.CreatedAt,
			&dbUsername,
		)
		if err != nil {
			return nil, err
		}

		if dbID.Valid {
			l.ID = uuid.UUID(dbID.Bytes)
		}
		if dbUserID.Valid {
			l.UserID = uuid.UUID(dbUserID.Bytes)
		} else {
			l.UserID = uuid.Nil
		}
		if dbChatID.Valid {
			u := uuid.UUID(dbChatID.Bytes)
			l.ChatID = &u
		} else {
			l.ChatID = nil
		}

		if dbUsername.Valid {
			l.ActorUsername = dbUsername.String
		} else {
			l.ActorUsername = "Система"
		}

		logs = append(logs, l)
	}
	return logs, nil
}

func (r *AuditRepository) GetChatLogs(ctx context.Context, chatID uuid.UUID) ([]models.AuditLog, error) {
	rows, err := r.db.Query(ctx, `
        SELECT a.id, a.user_id, a.chat_id, a.action, a.details, a.created_at, u.username
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.chat_id = $1
        ORDER BY a.created_at DESC
    `, chatID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []models.AuditLog

	for rows.Next() {
		var l models.AuditLog
		var dbID pgtype.UUID
		var dbUserID pgtype.UUID
		var dbChatID pgtype.UUID
		var dbUsername pgtype.Text
		err := rows.Scan(
			&dbID,
			&dbUserID,
			&dbChatID,
			&l.Action,
			&l.Details,
			&l.CreatedAt,
			&dbUsername,
		)
		if err != nil {
			return nil, err
		}

		if dbID.Valid {
			l.ID = uuid.UUID(dbID.Bytes)
		}
		if dbUserID.Valid {
			l.UserID = uuid.UUID(dbUserID.Bytes)
		} else {
			l.UserID = uuid.Nil
		}
		if dbChatID.Valid {
			u := uuid.UUID(dbChatID.Bytes)
			l.ChatID = &u
		} else {
			l.ChatID = nil
		}

		if dbUsername.Valid {
			l.ActorUsername = dbUsername.String
		} else {
			l.ActorUsername = "Система"
		}

		logs = append(logs, l)
	}
	return logs, nil
}
