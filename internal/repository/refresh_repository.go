package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type RefreshRepository struct {
	db *pgxpool.Pool
}

func NewRefreshRepository(
	db *pgxpool.Pool,
) *RefreshRepository {

	return &RefreshRepository{
		db: db,
	}
}

func (r *RefreshRepository) Save(
	ctx context.Context,
	userID string,
	token string,
	exp time.Time,
) error {

	_, err := r.db.Exec(
		ctx,
		`
		INSERT INTO refresh_tokens
		(user_id, token, expires_at)
		VALUES ($1,$2,$3)
		`,
		userID,
		token,
		exp,
	)

	return err
}

func (r *RefreshRepository) GetByToken(
	ctx context.Context,
	token string,
) (string, error) {

	var userID string

	err := r.db.QueryRow(
		ctx,
		`
		SELECT user_id
		FROM refresh_tokens
		WHERE token = $1
		AND expires_at > NOW()
		`,
		token,
	).Scan(&userID)

	return userID, err
}
