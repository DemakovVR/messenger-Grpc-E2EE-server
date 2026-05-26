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
) (uuid.UUID, error) {

	return s.repo.CreatePrivateChat(
		ctx,
		user1,
		user2,
	)
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
