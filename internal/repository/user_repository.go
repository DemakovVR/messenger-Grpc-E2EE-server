package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type User struct {
	ID           uuid.UUID
	Username     string
	Email        string
	PasswordHash string
	PublicKey    string
	Role         string
}

type UserRepository struct {
	db *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) *UserRepository {
	return &UserRepository{
		db: db,
	}
}

func (r *UserRepository) CreateUser(
	ctx context.Context,
	user *User,
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

	return r.db.QueryRow(
		ctx,
		query,
		user.Username,
		user.Email,
		user.PasswordHash,
		user.Role,
	).Scan(&user.ID)
}

func (r *UserRepository) GetByEmail(
	ctx context.Context,
	email string,
) (*User, error) {

	var user User

	query := `
		SELECT
			id,
			username,
			email,
			password_hash,
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
		&user.Role,
	)

	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (r *UserRepository) GetByID(
	ctx context.Context,
	id string,
) (*User, error) {

	var user User

	query := `
		SELECT
			id,
			username,
			email,
			password_hash,
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
		&user.Role,
	)

	if err != nil {
		return nil, err
	}

	return &user, nil
}
