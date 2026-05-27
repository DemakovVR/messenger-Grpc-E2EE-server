package service

import (
	"context"

	"Server/internal/models"
	"Server/internal/repository"

	"github.com/google/uuid"
)

type AuditService struct {
	repo *repository.AuditRepository
}

func NewAuditService(repo *repository.AuditRepository) *AuditService {
	return &AuditService{repo: repo}
}

func (s *AuditService) Log(
	ctx context.Context,
	userID uuid.UUID,
	action string,
	details *string,
) error {

	return s.repo.CreateLog(
		ctx,
		userID,
		action,
		details,
	)
}

func (s *AuditService) GetUserLogs(
	ctx context.Context,
	userID uuid.UUID,
) ([]models.AuditLog, error) {
	return s.repo.GetUserLogs(ctx, userID)
}

func (s *AuditService) GetChatLogs(
	ctx context.Context,
	chatID uuid.UUID,
) ([]models.AuditLog, error) {
	return s.repo.GetChatLogs(ctx, chatID)
}
