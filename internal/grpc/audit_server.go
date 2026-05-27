package grpc

import (
	"context"
	"time"

	auditpb "Server/gen/audit"
	"Server/internal/service"

	"github.com/google/uuid"
)

type AuditServer struct {
	auditpb.UnimplementedAuditServiceServer

	auditService *service.AuditService
}

func NewAuditServer(auditService *service.AuditService) *AuditServer {
	return &AuditServer{
		auditService: auditService,
	}
}

func (s *AuditServer) GetUserLogs(
	ctx context.Context,
	req *auditpb.GetUserLogsRequest,
) (*auditpb.GetUserLogsResponse, error) {

	userID, err := uuid.Parse(req.UserId)
	if err != nil {
		return nil, err
	}

	logs, err := s.auditService.GetUserLogs(ctx, userID)
	if err != nil {
		return nil, err
	}

	result := make([]*auditpb.AuditLog, 0, len(logs))

	for _, l := range logs {
		result = append(result, &auditpb.AuditLog{
			Id:     l.ID.String(),
			UserId: l.UserID.String(),
			Action: l.Action,
			Details: func() string {
				if l.Details == nil {
					return ""
				}
				return *l.Details
			}(),
			CreatedAt: l.CreatedAt.Format(time.RFC3339),
		})
	}

	return &auditpb.GetUserLogsResponse{
		Logs: result,
	}, nil
}

func (s *AuditServer) GetChatLogs(
	ctx context.Context,
	req *auditpb.GetChatLogsRequest,
) (*auditpb.GetChatLogsResponse, error) {

	chatID, err := uuid.Parse(req.ChatId)
	if err != nil {
		return nil, err
	}

	logs, err := s.auditService.GetChatLogs(ctx, chatID)
	if err != nil {
		return nil, err
	}

	result := make([]*auditpb.AuditLog, 0, len(logs))

	for _, l := range logs {
		result = append(result, &auditpb.AuditLog{
			Id:     l.ID.String(),
			UserId: l.UserID.String(),
			Action: l.Action,
			Details: func() string {
				if l.Details == nil {
					return ""
				}
				return *l.Details
			}(),
			CreatedAt: l.CreatedAt.Format(time.RFC3339),
		})
	}

	return &auditpb.GetChatLogsResponse{
		Logs: result,
	}, nil
}
