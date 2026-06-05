package repository

import (
	"Server/internal/models"
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ContactRepository struct {
	db *pgxpool.Pool
}

func NewContactRepository(
	db *pgxpool.Pool,
) *ContactRepository {
	return &ContactRepository{
		db: db,
	}
}

func (r *ContactRepository) SearchUsers(
	ctx context.Context,
	query string,
) ([]models.User, error) {

	sql := `
		SELECT
			id,
			username,
			email,
			password_hash,
			role
		FROM users
		WHERE username ILIKE '%' || $1 || '%'
		LIMIT 20
	`

	rows, err := r.db.Query(ctx, sql, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.User

	for rows.Next() {
		var user models.User

		err := rows.Scan(
			&user.ID,
			&user.Username,
			&user.Email,
			&user.PasswordHash,
			&user.Role,
		)
		if err != nil {
			return nil, err
		}

		users = append(users, user)
	}

	return users, nil
}

func (r *ContactRepository) AddContact(
	ctx context.Context,
	userID uuid.UUID,
	contactID uuid.UUID,
) error {

	_, err := r.db.Exec(
		ctx,
		`
		INSERT INTO contacts (
			user_id,
			contact_id
		)
		VALUES ($1,$2)
		ON CONFLICT DO NOTHING
		`,
		userID,
		contactID,
	)

	return err
}

func (r *ContactRepository) GetContacts(
	ctx context.Context,
	userID uuid.UUID,
) ([]models.User, error) {

	sql := `
		SELECT
			u.id,
			u.username,
			u.email,
			u.password_hash,
			u.role
		FROM contacts c
		JOIN users u
			ON u.id = c.contact_id
		WHERE c.user_id = $1
	`

	rows, err := r.db.Query(ctx, sql, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var contacts []models.User

	for rows.Next() {
		var user models.User

		err := rows.Scan(
			&user.ID,
			&user.Username,
			&user.Email,
			&user.PasswordHash,
			&user.Role,
		)
		if err != nil {
			return nil, err
		}

		contacts = append(contacts, user)
	}

	return contacts, nil
}

func (r *ContactRepository) DeleteContact(
	ctx context.Context,
	userID uuid.UUID,
	contactID uuid.UUID,
) error {

	_, err := r.db.Exec(ctx, `
        DELETE FROM contacts
        WHERE user_id = $1 AND contact_id = $2
    `, userID, contactID)

	return err
}

func (r *ContactRepository) BlockContact(
	ctx context.Context,
	userID uuid.UUID,
	blockedID uuid.UUID,
) error {

	_, err := r.db.Exec(ctx, `
        INSERT INTO blocked_contacts (user_id, blocked_user_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
    `, userID, blockedID)

	return err
}

func (r *ContactRepository) UnblockContact(
	ctx context.Context,
	userID uuid.UUID,
	blockedID uuid.UUID,
) error {

	_, err := r.db.Exec(ctx, `
        DELETE FROM blocked_contacts 
        WHERE user_id = $1 AND blocked_user_id = $2
    `, userID, blockedID)

	return err
}

func (r *ContactRepository) GetBlockedUsers(
	ctx context.Context,
	userID uuid.UUID,
) ([]models.User, error) {

	sql := `
        SELECT
            u.id,
            u.username,
            u.email,
            u.password_hash,
            u.role
        FROM blocked_contacts b
        JOIN users u
            ON u.id = b.blocked_user_id
        WHERE b.user_id = $1
    `

	rows, err := r.db.Query(ctx, sql, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var blockedUsers []models.User

	for rows.Next() {
		var user models.User

		err := rows.Scan(
			&user.ID,
			&user.Username,
			&user.Email,
			&user.PasswordHash,
			&user.Role,
		)
		if err != nil {
			return nil, err
		}

		blockedUsers = append(blockedUsers, user)
	}

	return blockedUsers, nil
}
