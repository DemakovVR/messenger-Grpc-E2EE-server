package service

import (
	"context"

	"github.com/google/uuid"

	"Server/internal/repository"
)

type AuditService struct {
	repo *repository.AuditRepository
}

func NewAuditService(
	repo *repository.AuditRepository,
) *AuditService {

	return &AuditService{
		repo: repo,
	}
}

func (s *AuditService) Log(
	ctx context.Context,
	userID uuid.UUID,
	action string,
	details string,
) error {

	return s.repo.CreateLog(
		ctx,
		userID,
		action,
		details,
	)
}
