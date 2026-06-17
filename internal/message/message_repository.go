package message

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

func (r *MessageRepository) GetMessage(ctx context.Context, id uuid.UUID) (*models.Message, error) {
	var msg models.Message
	err := r.db.QueryRow(
		ctx,
		`SELECT id, chat_id, sender_id, encrypted_content, is_encrypted, sent_at FROM messages WHERE id = $1`,
		id,
	).Scan(&msg.ID, &msg.ChatID, &msg.SenderID, &msg.EncryptedContent, &msg.IsEncrypted, &msg.SentAt)
	if err != nil {
		return nil, err
	}
	return &msg, nil
}

func (r *MessageRepository) SendMessage(
	ctx context.Context,
	chatID uuid.UUID,
	senderID uuid.UUID,
	content string,
	isEncrypted bool,
	replyToID *uuid.UUID,
) (uuid.UUID, error) {
	var messageID uuid.UUID

	err := r.db.QueryRow(
		ctx,
		`
		INSERT INTO messages (
			chat_id,
			sender_id,
			encrypted_content,
			is_encrypted,
			reply_to_id,
			sent_at,
			created_at,
			updated_at
		)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())
		RETURNING id
		`,
		chatID,
		senderID,
		content,
		isEncrypted,
		replyToID,
	).Scan(&messageID)

	if err != nil {
		return uuid.Nil, err
	}

	return messageID, nil
}

func (r *MessageRepository) GetMessages(
	ctx context.Context,
	chatID uuid.UUID,
) ([]models.MessageResponse, error) {
	log.Printf("GetMessages called for chatID: %s", chatID)

	rows, err := r.db.Query(
		ctx,
		`
		SELECT
			m.id,
			m.chat_id,
			m.sender_id,
			m.encrypted_content,
			m.encrypted_file_url,
			m.is_edited,
			m.is_deleted,
			m.is_encrypted,
			m.sent_at,
			m.created_at,
			m.updated_at,
			m.reply_to_id,
			p.sender_id AS parent_sender_id,
			p.encrypted_content AS parent_content,
			p.is_encrypted AS parent_is_encrypted
		FROM messages m
		LEFT JOIN messages p ON m.reply_to_id = p.id
		WHERE m.chat_id = $1
		ORDER BY m.sent_at ASC
		`,
		chatID,
	)
	if err != nil {
		log.Printf("Query error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var messages []models.MessageResponse

	for rows.Next() {
		var msg models.MessageResponse
		err := rows.Scan(
			&msg.ID,
			&msg.ChatID,
			&msg.SenderID,
			&msg.EncryptedContent,
			&msg.EncryptedFileURL,
			&msg.IsEdited,
			&msg.IsDeleted,
			&msg.IsEncrypted,
			&msg.SentAt,
			&msg.CreatedAt,
			&msg.UpdatedAt,
			&msg.ReplyToID,
			&msg.ParentSenderID,
			&msg.ParentContent,
			&msg.ParentIsEncrypted,
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

func (r *MessageRepository) IsParticipant(ctx context.Context, chatID uuid.UUID, userID uuid.UUID) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2
		)
	`, chatID, userID).Scan(&exists)
	return exists, err
}

func (r *MessageRepository) GetChatParticipants(ctx context.Context, chatID uuid.UUID) ([]uuid.UUID, error) {
	rows, err := r.db.Query(ctx, `SELECT DISTINCT user_id FROM chat_participants WHERE chat_id = $1`, chatID)
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

func (r *MessageRepository) DeleteMessage(ctx context.Context, messageID uuid.UUID, userID uuid.UUID) (uuid.UUID, error) {
	var chatID uuid.UUID
	err := r.db.QueryRow(ctx, `
		UPDATE messages SET encrypted_content = '', is_deleted = true, updated_at = NOW()
		WHERE id = $1 AND sender_id = $2 RETURNING chat_id
	`, messageID, userID).Scan(&chatID)
	if err != nil {
		return uuid.Nil, errors.New("message not found or access denied")
	}
	return chatID, nil
}

func (r *MessageRepository) EditMessage(ctx context.Context, messageID uuid.UUID, userID uuid.UUID, content string, isEncrypted bool) (uuid.UUID, error) {
	var chatID uuid.UUID
	err := r.db.QueryRow(ctx, `
		UPDATE messages SET encrypted_content = $1, is_encrypted = $2, is_edited = true, updated_at = NOW()
		WHERE id = $3 AND sender_id = $4 AND is_deleted = false RETURNING chat_id
	`, content, isEncrypted, messageID, userID).Scan(&chatID)
	if err != nil {
		return uuid.Nil, errors.New("message not found or access denied")
	}
	return chatID, nil
}
