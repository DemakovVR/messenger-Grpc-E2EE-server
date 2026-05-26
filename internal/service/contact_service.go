package service

import (
	"context"

	"github.com/google/uuid"

	"Server/internal/models"
	"Server/internal/repository"
)

type ContactService struct {
	repo *repository.ContactRepository
}

func NewContactService(
	repo *repository.ContactRepository,
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
