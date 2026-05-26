package service

import (
	"context"
	"errors"

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
	)
	if err != nil {
		return uuid.Nil, err
	}

	participants, err := s.repo.GetChatParticipants(ctx, chatID)
	if err == nil {

		for _, participantID := range participants {

			uuidParticipantID := participantID

			s.manager.Publish(
				uuidParticipantID,
				&messagepb.MessageResponse{
					Id:               messageID.String(),
					ChatId:           chatID.String(),
					SenderId:         userID.String(),
					EncryptedContent: content,
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
