package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Chat struct {
	ID   uuid.UUID
	Type string
	Name string
}

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
	user1 string,
	user2 string,
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
		INSERT INTO chats(type)
		VALUES('private')
		RETURNING id
		`,
	).Scan(&chatID)

	if err != nil {
		return uuid.Nil, err
	}

	_, err = tx.Exec(
		ctx,
		`
		INSERT INTO chat_participants
		(chat_id, user_id)
		VALUES ($1, $2), ($1, $3)
		`,
		chatID,
		user1,
		user2,
	)

	if err != nil {
		return uuid.Nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return uuid.Nil, err
	}

	return chatID, nil
}

func (r *ChatRepository) CreateGroupChat(
	ctx context.Context,
	name string,
	participants []string,
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
		INSERT INTO chats(type, name)
		VALUES('group', $1)
		RETURNING id
		`,
		name,
	).Scan(&chatID)

	if err != nil {
		return uuid.Nil, err
	}

	for _, userID := range participants {

		_, err := tx.Exec(
			ctx,
			`
			INSERT INTO chat_participants
			(chat_id, user_id)
			VALUES ($1, $2)
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
	userID string,
) ([]Chat, error) {

	rows, err := r.db.Query(
		ctx,
		`
		SELECT
			c.id,
			c.type,
			COALESCE(c.name, '')
		FROM chats c
		JOIN chat_participants cp
			ON cp.chat_id = c.id
		WHERE cp.user_id = $1
		`,
		userID,
	)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var chats []Chat

	for rows.Next() {

		var chat Chat

		err := rows.Scan(
			&chat.ID,
			&chat.Type,
			&chat.Name,
		)

		if err != nil {
			return nil, err
		}

		chats = append(chats, chat)
	}

	return chats, nil
}
