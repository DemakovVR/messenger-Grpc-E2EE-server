package repository

import (
	"context"

	"Server/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserRepository struct {
	db *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) *UserRepository {
	return &UserRepository{
		db: db,
	}
}

func (r *UserRepository) GetByUsername(
	ctx context.Context,
	username string,
) (*models.User, error) {

	var user models.User

	err := r.db.QueryRow(
		ctx,
		`
		SELECT
			id,
			username,
			email,
			password_hash,
			public_key,
			role
		FROM users
		WHERE username = $1
		`,
		username,
	).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.PublicKey,
		&user.Role,
	)

	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (r *UserRepository) CreateUser(
	ctx context.Context,
	user *models.User,
) error {

	query := `
		INSERT INTO users (
			username,
			email,
			password_hash,
			role
		)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`

	err := r.db.QueryRow(
		ctx,
		query,
		user.Username,
		user.Email,
		user.PasswordHash,
		user.Role,
	).Scan(&user.ID)

	return err
}

func (r *UserRepository) GetByEmail(
	ctx context.Context,
	email string,
) (*models.User, error) {

	var user models.User

	query := `
		SELECT
			id,
			username,
			email,
			password_hash,
			public_key,
			role
		FROM users
		WHERE email = $1
	`

	err := r.db.QueryRow(
		ctx,
		query,
		email,
	).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.PublicKey,
		&user.Role,
	)

	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (r *UserRepository) GetByID(
	ctx context.Context,
	id uuid.UUID,
) (*models.User, error) {

	var user models.User

	query := `
		SELECT
			id,
			username,
			email,
			password_hash,
			public_key,
			role
		FROM users
		WHERE id = $1
	`

	err := r.db.QueryRow(
		ctx,
		query,
		id,
	).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.PublicKey,
		&user.Role,
	)

	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (r *UserRepository) UpdatePassword(
	ctx context.Context,
	userID uuid.UUID,
	hash string,
) error {

	_, err := r.db.Exec(ctx, `
        UPDATE users
        SET password_hash = $1,
            updated_at = NOW()
        WHERE id = $2
    `, hash, userID)

	return err
}

func (r *UserRepository) UpdateProfile(
	ctx context.Context,
	userID uuid.UUID,
	username string,
	email string,
) error {

	_, err := r.db.Exec(ctx, `
        UPDATE users
        SET username = $1,
            email = $2,
            updated_at = NOW()
        WHERE id = $3
    `, username, email, userID)

	return err
}

func (r *UserRepository) UpdatePublicKey(
	ctx context.Context,
	userID uuid.UUID,
	publicKey string,
) error {

	_, err := r.db.Exec(ctx, `
        UPDATE users
        SET public_key = $1,
            updated_at = NOW()
        WHERE id = $2
    `, publicKey, userID)

	return err
}

func (r *UserRepository) DeleteUser(
	ctx context.Context,
	userID uuid.UUID,
) error {

	_, err := r.db.Exec(ctx, `
        DELETE FROM users
        WHERE id = $1
    `, userID)

	return err
}
