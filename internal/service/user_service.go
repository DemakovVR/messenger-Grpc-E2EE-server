package service

import (
	"context"

	"Server/internal/repository"
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
	userID string,
) (*repository.User, error) {

	return s.userRepo.GetByID(
		ctx,
		userID,
	)
}
