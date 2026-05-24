package service

import (
	"context"
	"errors"

	"Server/internal/repository"

	"github.com/google/uuid"
)

type MessageService struct {
	repo *repository.MessageRepository
}

func NewMessageService(
	repo *repository.MessageRepository,
) *MessageService {

	return &MessageService{
		repo: repo,
	}
}

func (s *MessageService) SendMessage(
	ctx context.Context,
	chatID string,
	userID string,
	content string,
) (uuid.UUID, error) {

	ok, err := s.repo.IsParticipant(
		ctx,
		chatID,
		userID,
	)

	if err != nil {
		return uuid.Nil, err
	}

	if !ok {
		return uuid.Nil, errors.New(
			"user is not participant of chat",
		)
	}

	return s.repo.SendMessage(
		ctx,
		chatID,
		userID,
		content,
	)
}

func (s *MessageService) GetMessages(
	ctx context.Context,
	chatID string,
	userID string,
) ([]repository.Message, error) {

	ok, err := s.repo.IsParticipant(
		ctx,
		chatID,
		userID,
	)

	if err != nil {
		return nil, err
	}

	if !ok {
		return nil, errors.New(
			"user is not participant of chat",
		)
	}

	return s.repo.GetMessages(
		ctx,
		chatID,
	)
}
