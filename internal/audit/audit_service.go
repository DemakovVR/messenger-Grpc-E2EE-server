package audit

import (
	"context"

	"Server/internal/models"

	"github.com/google/uuid"
)

type AuditService struct {
	repo *AuditRepository
}

func NewAuditService(repo *AuditRepository) *AuditService {
	return &AuditService{repo: repo}
}

func (s *AuditService) CreateLog(ctx context.Context, userID uuid.UUID, chatID *uuid.UUID, action string, details *string) error {
	return s.repo.CreateLog(ctx, userID, chatID, action, details)
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
