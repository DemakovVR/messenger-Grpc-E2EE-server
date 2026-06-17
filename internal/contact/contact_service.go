package contact

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"Server/internal/models"
)

type ContactService struct {
	repo *ContactRepository
}

func NewContactService(
	repo *ContactRepository,
) *ContactService {

	return &ContactService{
		repo: repo,
	}
}

func (s *ContactService) SearchUsers(
	ctx context.Context,
	query string,
) ([]models.User, error) {

	return s.repo.SearchUsers(
		ctx,
		query,
	)
}

func (s *ContactService) AddContact(
	ctx context.Context,
	userID uuid.UUID,
	contactID uuid.UUID,
) error {

	return s.repo.AddContact(
		ctx,
		userID,
		contactID,
	)
}

func (s *ContactService) GetContacts(
	ctx context.Context,
	userID uuid.UUID,
) ([]models.User, error) {

	return s.repo.GetContacts(
		ctx,
		userID,
	)
}

func (s *ContactService) DeleteContact(
	ctx context.Context,
	userID uuid.UUID,
	contactID uuid.UUID,
) error {

	return s.repo.DeleteContact(ctx, userID, contactID)
}

func (s *ContactService) BlockContact(
	ctx context.Context,
	userID uuid.UUID,
	blockedID uuid.UUID,
) error {

	if userID == blockedID {
		return errors.New("cannot block yourself")
	}

	return s.repo.BlockContact(ctx, userID, blockedID)
}

func (s *ContactService) UnblockContact(
	ctx context.Context,
	userID uuid.UUID,
	blockedID uuid.UUID,
) error {

	if userID == blockedID {
		return errors.New("cannot unblock yourself")
	}

	return s.repo.UnblockContact(ctx, userID, blockedID)
}

func (s *ContactService) GetBlockedUsers(
	ctx context.Context,
	userID uuid.UUID,
) ([]models.User, error) {
	return s.repo.GetBlockedUsers(ctx, userID)
}
