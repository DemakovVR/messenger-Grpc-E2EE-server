package chat

import (
	"Server/internal/models"
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ChatRepository struct {
	db *pgxpool.Pool
}

func NewChatRepository(
	db *pgxpool.Pool,
) *ChatRepository {
	return &ChatRepository{
		db: db,
	}
}

func (r *ChatRepository) CreatePrivateChat(
	ctx context.Context,
	user1 uuid.UUID,
	user2 uuid.UUID,
) (uuid.UUID, bool, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return uuid.Nil, false, err
	}
	defer tx.Rollback(ctx)

	var chatID uuid.UUID

	err = tx.QueryRow(
		ctx,
		`
		SELECT c.id
		FROM chats c
		WHERE c.type = 'private'
		AND EXISTS (
			SELECT 1 FROM chat_participants cp1 
			WHERE cp1.chat_id = c.id AND cp1.user_id = $1
		)
		AND EXISTS (
			SELECT 1 FROM chat_participants cp2 
			WHERE cp2.chat_id = c.id AND cp2.user_id = $2
		)
		`,
		user1, user2,
	).Scan(&chatID)

	if err == nil {
		tx.Commit(ctx)
		return chatID, true, nil
	}

	err = tx.QueryRow(
		ctx,
		`
		INSERT INTO chats(type)
		VALUES('private')
		RETURNING id
		`,
	).Scan(&chatID)

	if err != nil {
		return uuid.Nil, false, err
	}

	_, err = tx.Exec(
		ctx,
		`
		INSERT INTO chat_participants (chat_id, user_id)
		VALUES ($1, $2), ($1, $3)
		ON CONFLICT (chat_id, user_id) DO NOTHING
		`,
		chatID,
		user1,
		user2,
	)

	if err != nil {
		return uuid.Nil, false, err
	}

	if err := tx.Commit(ctx); err != nil {
		return uuid.Nil, false, err
	}

	return chatID, false, nil
}

func (r *ChatRepository) CreateGroupChat(
	ctx context.Context,
	name string,
	participants []uuid.UUID,
	createdBy uuid.UUID,
) (uuid.UUID, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return uuid.Nil, err
	}
	defer tx.Rollback(ctx)

	var chatID uuid.UUID

	err = tx.QueryRow(
		ctx,
		`
		INSERT INTO chats(type, name, created_by)
		VALUES('group', $1, $2)
		RETURNING id
		`,
		name,
		createdBy,
	).Scan(&chatID)

	if err != nil {
		return uuid.Nil, err
	}

	for _, userID := range participants {
		_, err := tx.Exec(
			ctx,
			`
			INSERT INTO chat_participants (chat_id, user_id)
			VALUES ($1, $2)
			ON CONFLICT (chat_id, user_id) DO NOTHING
			`,
			chatID,
			userID,
		)
		if err != nil {
			return uuid.Nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return uuid.Nil, err
	}

	return chatID, nil
}

func (r *ChatRepository) GetChats(
	ctx context.Context,
	userID uuid.UUID,
) ([]models.Chat, error) {
	rows, err := r.db.Query(
		ctx,
		`
		SELECT
			c.id,
			c.type,
			COALESCE(c.name, '') as name,
			c.created_at,
			c.updated_at,
			COALESCE(c.created_by, '00000000-0000-0000-0000-000000000000') as created_by
		FROM chats c
		JOIN chat_participants cp ON cp.chat_id = c.id
		WHERE cp.user_id = $1
		`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var chats []models.Chat
	for rows.Next() {
		var chat models.Chat
		err := rows.Scan(
			&chat.ID,
			&chat.Type,
			&chat.Name,
			&chat.CreatedAt,
			&chat.UpdatedAt,
			&chat.CreatedBy,
		)
		if err != nil {
			return nil, err
		}
		chats = append(chats, chat)
	}
	return chats, nil
}

func (r *ChatRepository) GetChat(
	ctx context.Context,
	chatID uuid.UUID,
) (*models.Chat, error) {
	var chat models.Chat
	err := r.db.QueryRow(ctx, `
		SELECT id, type, COALESCE(name, ''), created_at, updated_at, COALESCE(created_by, '00000000-0000-0000-0000-000000000000') as created_by
		FROM chats
		WHERE id = $1
	`, chatID).Scan(
		&chat.ID,
		&chat.Type,
		&chat.Name,
		&chat.CreatedAt,
		&chat.UpdatedAt,
		&chat.CreatedBy,
	)
	if err != nil {
		return nil, err
	}
	return &chat, nil
}

func (r *ChatRepository) DeleteChat(
	ctx context.Context,
	chatID uuid.UUID,
) error {

	_, err := r.db.Exec(ctx, `
		DELETE FROM chats
		WHERE id = $1
	`, chatID)

	return err
}

func (r *ChatRepository) AddParticipants(
	ctx context.Context,
	chatID uuid.UUID,
	userIDs []uuid.UUID,
) error {

	for _, userID := range userIDs {
		_, err := r.db.Exec(ctx, `
			INSERT INTO chat_participants(chat_id, user_id)
			VALUES ($1, $2)
			ON CONFLICT DO NOTHING
		`, chatID, userID)

		if err != nil {
			return err
		}
	}

	return nil
}

func (r *ChatRepository) RemoveParticipants(
	ctx context.Context,
	chatID uuid.UUID,
	userIDs []uuid.UUID,
) error {

	_, err := r.db.Exec(ctx, `
		DELETE FROM chat_participants
		WHERE chat_id = $1
		AND user_id = ANY($2)
	`, chatID, userIDs)

	return err
}

func (r *ChatRepository) CountParticipants(
	ctx context.Context,
	chatID uuid.UUID,
) (int, error) {

	var count int

	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM chat_participants
		WHERE chat_id = $1
	`, chatID).Scan(&count)

	return count, err
}

func (r *ChatRepository) IsParticipant(
	ctx context.Context,
	chatID uuid.UUID,
	userID uuid.UUID,
) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM chat_participants
			WHERE chat_id = $1 AND user_id = $2
		)
	`, chatID, userID).Scan(&exists)
	return exists, err
}

func (r *ChatRepository) GetParticipants(
	ctx context.Context,
	chatID uuid.UUID,
) ([]models.User, error) {
	rows, err := r.db.Query(ctx, `
		SELECT u.id, u.username, u.email, u.password_hash, u.public_key, u.role
		FROM users u
		JOIN chat_participants cp ON cp.user_id = u.id
		WHERE cp.chat_id = $1
	`, chatID)
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
			&user.PublicKey,
			&user.Role,
		)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	return users, nil
}
