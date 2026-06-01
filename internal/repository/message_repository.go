package repository

import (
	"context"
	"errors"
	"log"

	"Server/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type MessageRepository struct {
	db *pgxpool.Pool
}

func NewMessageRepository(db *pgxpool.Pool) *MessageRepository {
	return &MessageRepository{db: db}
}

func (r *MessageRepository) SendMessage(
	ctx context.Context,
	chatID uuid.UUID,
	senderID uuid.UUID,
	content string,
) (uuid.UUID, error) {
	var messageID uuid.UUID

	err := r.db.QueryRow(
		ctx,
		`
		INSERT INTO messages (
			chat_id,
			sender_id,
			encrypted_content,
			sent_at,
			created_at,
			updated_at
		)
		VALUES ($1, $2, $3, NOW(), NOW(), NOW())
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
	chatID uuid.UUID,
) ([]models.Message, error) {
	log.Printf("GetMessages called for chatID: %s", chatID)

	rows, err := r.db.Query(
		ctx,
		`
		SELECT
			id,
			chat_id,
			sender_id,
			encrypted_content,
			encrypted_file_url,
			is_edited,
			is_deleted,
			sent_at,
			created_at,
			updated_at
		FROM messages
		WHERE chat_id = $1
		ORDER BY sent_at ASC
		`,
		chatID,
	)
	if err != nil {
		log.Printf("Query error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var messages []models.Message

	for rows.Next() {
		var msg models.Message
		err := rows.Scan(
			&msg.ID,
			&msg.ChatID,
			&msg.SenderID,
			&msg.EncryptedContent,
			&msg.EncryptedFileURL,
			&msg.IsEdited,
			&msg.IsDeleted,
			&msg.SentAt,
			&msg.CreatedAt,
			&msg.UpdatedAt,
		)
		if err != nil {
			log.Printf("Scan error: %v", err)
			return nil, err
		}
		messages = append(messages, msg)
	}

	log.Printf("Found %d messages", len(messages))
	return messages, nil
}

func (r *MessageRepository) IsParticipant(
	ctx context.Context,
	chatID uuid.UUID,
	userID uuid.UUID,
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

func (r *MessageRepository) GetChatParticipants(
	ctx context.Context,
	chatID uuid.UUID,
) ([]uuid.UUID, error) {

	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT user_id
		FROM chat_participants
		WHERE chat_id = $1
	`, chatID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []uuid.UUID

	for rows.Next() {

		var userID uuid.UUID

		if err := rows.Scan(&userID); err != nil {
			return nil, err
		}

		users = append(users, userID)
	}

	return users, nil
}

func (r *MessageRepository) DeleteMessage(
	ctx context.Context,
	messageID uuid.UUID,
	userID uuid.UUID,
) error {

	commandTag, err := r.db.Exec(
		ctx,
		`
		UPDATE messages
		SET
			encrypted_content = '',
			is_deleted = true,
			updated_at = NOW()
		WHERE id = $1
		AND sender_id = $2
		`,
		messageID,
		userID,
	)

	if err != nil {
		return err
	}

	if commandTag.RowsAffected() == 0 {
		return errors.New("message not found or access denied")
	}

	return nil
}

func (r *MessageRepository) EditMessage(
	ctx context.Context,
	messageID uuid.UUID,
	userID uuid.UUID,
	content string,
) error {

	commandTag, err := r.db.Exec(
		ctx,
		`
		UPDATE messages
		SET
			encrypted_content = $1,
			is_edited = true,
			updated_at = NOW()
		WHERE id = $2
		AND sender_id = $3
		AND is_deleted = false
		`,
		content,
		messageID,
		userID,
	)

	if err != nil {
		return err
	}

	if commandTag.RowsAffected() == 0 {
		return errors.New(
			"message not found or access denied",
		)
	}

	return nil
}
