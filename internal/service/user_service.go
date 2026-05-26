package service

import (
	"context"

	"Server/internal/models"
	"Server/internal/repository"

	"github.com/google/uuid"
)

type UserService struct {
	userRepo *repository.UserRepository
}

func NewUserService(
	userRepo *repository.UserRepository,
) *UserService {
	return &UserService{
		userRepo: userRepo,
	}
}

func (s *UserService) GetProfile(
	ctx context.Context,
	userID uuid.UUID,
) (*models.User, error) {

	return s.userRepo.GetByID(ctx, userID)
}
