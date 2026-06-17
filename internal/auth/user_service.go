package auth

import (
	"context"

	"Server/internal/models"

	"github.com/google/uuid"
)

type UserService struct {
	userRepo    *UserRepository
	refreshRepo *RefreshRepository
}

func NewUserService(
	userRepo *UserRepository,
	refreshRepo *RefreshRepository,
) *UserService {

	return &UserService{
		userRepo:    userRepo,
		refreshRepo: refreshRepo,
	}
}

func (s *UserService) GetByUsername(
	ctx context.Context,
	username string,
) (*models.User, error) {
	return s.userRepo.GetByUsername(ctx, username)
}

func (s *UserService) GetProfile(
	ctx context.Context,
	userID uuid.UUID,
) (*models.User, error) {

	return s.userRepo.GetByID(ctx, userID)
}

func (s *UserService) UpdateProfile(
	ctx context.Context,
	userID uuid.UUID,
	username string,
	email string,
) error {

	return s.userRepo.UpdateProfile(ctx, userID, username, email)
}

func (s *UserService) UpdatePublicKey(
	ctx context.Context,
	userID uuid.UUID,
	publicKey string,
) error {

	return s.userRepo.UpdatePublicKey(ctx, userID, publicKey)
}

func (s *UserService) DeleteAccount(
	ctx context.Context,
	userID uuid.UUID,
) error {

	err := s.refreshRepo.DeleteByUserID(ctx, userID)
	if err != nil {
		return err
	}

	return s.userRepo.DeleteUser(ctx, userID)
}
