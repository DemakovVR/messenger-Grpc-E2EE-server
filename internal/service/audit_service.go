package service

import (
	"context"

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
	userID string,
	action string,
	details string,
) {

	_ = s.repo.CreateLog(
		ctx,
		userID,
		action,
		details,
	)
}
