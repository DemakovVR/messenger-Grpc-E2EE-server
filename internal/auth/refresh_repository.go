package auth

import (
	"Server/internal/models"
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type RefreshRepository struct {
	db *pgxpool.Pool
}

func NewRefreshRepository(
	db *pgxpool.Pool,
) *RefreshRepository {
	return &RefreshRepository{db: db}
}

func (r *RefreshRepository) Save(
	ctx context.Context,
	token models.RefreshToken,
) error {

	_, err := r.db.Exec(
		ctx,
		`
        INSERT INTO refresh_tokens
        (id, user_id, token, expires_at, created_at)
        VALUES ($1,$2,$3,$4,$5)
        `,
		token.ID,
		token.UserID,
		token.Token,
		token.ExpiresAt,
		token.CreatedAt,
	)

	return err
}

func (r *RefreshRepository) DeleteByToken(
	ctx context.Context,
	token string,
) error {

	_, err := r.db.Exec(ctx, `
        DELETE FROM refresh_tokens
        WHERE token = $1
    `, token)

	return err
}

func (r *RefreshRepository) GetByToken(
	ctx context.Context,
	token string,
) (models.RefreshToken, error) {

	var rt models.RefreshToken

	err := r.db.QueryRow(
		ctx,
		`
        SELECT id, user_id, token, expires_at, created_at
        FROM refresh_tokens
        WHERE token = $1
        AND expires_at > NOW()
        `,
		token,
	).Scan(
		&rt.ID,
		&rt.UserID,
		&rt.Token,
		&rt.ExpiresAt,
		&rt.CreatedAt,
	)

	return rt, err
}

func (r *RefreshRepository) DeleteByUserID(
	ctx context.Context,
	userID uuid.UUID,
) error {

	_, err := r.db.Exec(ctx, `
        DELETE FROM refresh_tokens
        WHERE user_id = $1
    `, userID)

	return err
}
