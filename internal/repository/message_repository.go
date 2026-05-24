package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Message struct {
	ID       uuid.UUID
	ChatID   uuid.UUID
	SenderID uuid.UUID
	Content  string
	SentAt   time.Time
}

type MessageRepository struct {
	db *pgxpool.Pool
}

func NewMessageRepository(
	db *pgxpool.Pool,
) *MessageRepository {

	return &MessageRepository{
		db: db,
	}
}

func (r *MessageRepository) SendMessage(
	ctx context.Context,
	chatID string,
	senderID string,
	content string,
) (uuid.UUID, error) {

	var messageID uuid.UUID

	err := r.db.QueryRow(
		ctx,
		`
		INSERT INTO messages (
			chat_id,
			sender_id,
			encrypted_content
		)
		VALUES ($1,$2,$3)
		RETURNING id
		`,
		chatID,
		senderID,
		content,
	).Scan(&messageID)

	if err != nil {
		return uuid.Nil, err
	}

	return messageID, nil
}

func (r *MessageRepository) GetMessages(
	ctx context.Context,
	chatID string,
) ([]Message, error) {

	rows, err := r.db.Query(
		ctx,
		`
		SELECT
			id,
			chat_id,
			sender_id,
			encrypted_content,
			sent_at
		FROM messages
		WHERE chat_id = $1
		ORDER BY sent_at ASC
		`,
		chatID,
	)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []Message

	for rows.Next() {

		var msg Message

		err := rows.Scan(
			&msg.ID,
			&msg.ChatID,
			&msg.SenderID,
			&msg.Content,
			&msg.SentAt,
		)

		if err != nil {
			return nil, err
		}

		messages = append(messages, msg)
	}

	return messages, nil
}

func (r *MessageRepository) IsParticipant(
	ctx context.Context,
	chatID string,
	userID string,
) (bool, error) {

	var exists bool

	err := r.db.QueryRow(
		ctx,
		`
		SELECT EXISTS(
			SELECT 1
			FROM chat_participants
			WHERE chat_id = $1
			AND user_id = $2
		)
		`,
		chatID,
		userID,
	).Scan(&exists)

	return exists, err
}
