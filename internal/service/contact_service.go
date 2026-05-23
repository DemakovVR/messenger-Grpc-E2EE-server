package service

import (
	"context"

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
) ([]repository.User, error) {

	return s.repo.SearchUsers(
		ctx,
		query,
	)
}

func (s *ContactService) AddContact(
	ctx context.Context,
	userID string,
	contactID string,
) error {

	return s.repo.AddContact(
		ctx,
		userID,
		contactID,
	)
}

func (s *ContactService) GetContacts(
	ctx context.Context,
	userID string,
) ([]repository.User, error) {

	return s.repo.GetContacts(
		ctx,
		userID,
	)
}
