package service

import (
	"context"
	"errors"
	"time"

	messagepb "Server/gen/message"
	"Server/internal/models"
	"Server/internal/repository"

	"github.com/google/uuid"
)

type MessageService struct {
	repo    *repository.MessageRepository
	manager *ConnectionManager
}

func NewMessageService(
	repo *repository.MessageRepository,
	manager *ConnectionManager,
) *MessageService {
	return &MessageService{
		repo:    repo,
		manager: manager,
	}
}

func (s *MessageService) Subscribe(
	userID uuid.UUID,
) chan *messagepb.MessageResponse {

	return s.manager.Subscribe(userID)
}

func (s *MessageService) Unsubscribe(
	userID uuid.UUID,
	ch chan *messagepb.MessageResponse,
) {
	s.manager.Unsubscribe(userID, ch)
}

func (s *MessageService) SendMessage(
	ctx context.Context,
	chatID uuid.UUID,
	userID uuid.UUID,
	content string,
	isEncrypted bool,
) (uuid.UUID, error) {

	ok, err := s.repo.IsParticipant(ctx, chatID, userID)
	if err != nil {
		return uuid.Nil, err
	}

	if !ok {
		return uuid.Nil, errors.New("user is not participant of chat")
	}

	messageID, err := s.repo.SendMessage(
		ctx,
		chatID,
		userID,
		content,
		isEncrypted,
	)
	if err != nil {
		return uuid.Nil, err
	}

	participants, err := s.repo.GetChatParticipants(ctx, chatID)
	if err == nil {

		for _, participantID := range participants {

			if participantID == userID {
				continue
			}

			s.manager.Publish(
				participantID,
				&messagepb.MessageResponse{
					Id:               messageID.String(),
					ChatId:           chatID.String(),
					SenderId:         userID.String(),
					EncryptedContent: content,
					IsEncrypted:      isEncrypted,
					SentAt:           time.Now().Format(time.RFC3339),
					CreatedAt:        time.Now().Format(time.RFC3339),
				},
			)
		}
	}

	return messageID, nil
}

func (s *MessageService) GetMessages(
	ctx context.Context,
	chatID uuid.UUID,
	userID uuid.UUID,
) ([]models.Message, error) {

	ok, err := s.repo.IsParticipant(ctx, chatID, userID)
	if err != nil {
		return nil, err
	}

	if !ok {
		return nil, errors.New("user is not participant of chat")
	}

	return s.repo.GetMessages(ctx, chatID)
}

func (s *MessageService) DeleteMessage(
	ctx context.Context,
	messageID uuid.UUID,
	userID uuid.UUID,
) error {

	return s.repo.DeleteMessage(
		ctx,
		messageID,
		userID,
	)
}

func (s *MessageService) EditMessage(
	ctx context.Context,
	messageID uuid.UUID,
	userID uuid.UUID,
	content string,
	isEncrypted bool,
) error {

	return s.repo.EditMessage(
		ctx,
		messageID,
		userID,
		content,
		isEncrypted,
	)
}

func (s *MessageService) GetChatParticipants(
	ctx context.Context,
	chatID uuid.UUID,
) ([]uuid.UUID, error) {
	return s.repo.GetChatParticipants(ctx, chatID)
}

func (s *MessageService) PublishMessage(
	peerUserID uuid.UUID,
	messageID string,
	chatID string,
	senderID string,
	content string,
	isEncrypted bool,
) {
	s.manager.Publish(
		peerUserID,
		&messagepb.MessageResponse{
			Id:               messageID,
			ChatId:           chatID,
			SenderId:         senderID,
			EncryptedContent: content,
			IsEncrypted:      isEncrypted,
			SentAt:           time.Now().Format(time.RFC3339),
			CreatedAt:        time.Now().Format(time.RFC3339),
		},
	)
}
