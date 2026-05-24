package service

import (
	"context"

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
	user1 string,
	user2 string,
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
	participants []string,
) (uuid.UUID, error) {

	return s.repo.CreateGroupChat(
		ctx,
		name,
		participants,
	)
}

func (s *ChatService) GetChats(
	ctx context.Context,
	userID string,
) ([]repository.Chat, error) {

	return s.repo.GetChats(
		ctx,
		userID,
	)
}
