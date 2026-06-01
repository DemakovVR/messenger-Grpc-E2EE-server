package service

import (
	"context"

	"Server/internal/models"
	"Server/internal/repository"

	"github.com/google/uuid"
)

type ChatService struct {
	repo *repository.ChatRepository
}

func NewChatService(
	repo *repository.ChatRepository,
) *ChatService {

	return &ChatService{
		repo: repo,
	}
}

func (s *ChatService) CreatePrivateChat(
	ctx context.Context,
	user1 uuid.UUID,
	user2 uuid.UUID,
) (uuid.UUID, bool, error) {
	return s.repo.CreatePrivateChat(ctx, user1, user2)
}

func (s *ChatService) CreateGroupChat(
	ctx context.Context,
	name string,
	participants []uuid.UUID,
) (uuid.UUID, error) {

	return s.repo.CreateGroupChat(
		ctx,
		name,
		participants,
	)
}

func (s *ChatService) GetChats(
	ctx context.Context,
	userID uuid.UUID,
) ([]models.Chat, error) {

	return s.repo.GetChats(
		ctx,
		userID,
	)
}

func (s *ChatService) DeleteChat(
	ctx context.Context,
	chatID uuid.UUID,
	userID uuid.UUID,
) error {

	return s.repo.DeleteChat(ctx, chatID)
}

func (s *ChatService) AddParticipants(
	ctx context.Context,
	chatID uuid.UUID,
	userIDs []uuid.UUID,
) error {

	return s.repo.AddParticipants(ctx, chatID, userIDs)
}

func (s *ChatService) RemoveParticipants(
	ctx context.Context,
	chatID uuid.UUID,
	userIDs []uuid.UUID,
) error {

	return s.repo.RemoveParticipants(ctx, chatID, userIDs)
}

func (s *ChatService) LeaveGroup(
	ctx context.Context,
	chatID uuid.UUID,
	userID uuid.UUID,
) error {

	err := s.repo.RemoveParticipants(ctx, chatID, []uuid.UUID{userID})
	if err != nil {
		return err
	}

	count, err := s.repo.CountParticipants(ctx, chatID)
	if err != nil {
		return err
	}

	if count == 0 {
		return s.repo.DeleteChat(ctx, chatID)
	}

	return nil
}
