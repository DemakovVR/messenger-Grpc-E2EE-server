package grpc

import (
	"context"
	"time"

	auditpb "Server/gen/audit"
	"Server/internal/logger"
	"Server/internal/models"
	"Server/internal/service"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type AuditServer struct {
	auditpb.UnimplementedAuditServiceServer
	auditService *service.AuditService
}

func NewAuditServer(auditService *service.AuditService) *AuditServer {
	return &AuditServer{auditService: auditService}
}

func (s *AuditServer) GetUserLogs(ctx context.Context, req *auditpb.GetUserLogsRequest) (*auditpb.GetUserLogsResponse, error) {
	userID, err := uuid.Parse(req.UserId)
	if err != nil {
		logger.Log.Error("GetUserLogs: failed to parse userID string", zap.String("user_id", req.UserId), zap.Error(err))
		return nil, status.Errorf(codes.InvalidArgument, "invalid user_id format: %v", err)
	}

	logs, err := s.auditService.GetUserLogs(ctx, userID)
	if err != nil {
		logger.Log.Error("GetUserLogs: database error", zap.String("user_id", req.UserId), zap.Error(err))
		return nil, status.Errorf(codes.Internal, "internal database error")
	}

	return &auditpb.GetUserLogsResponse{Logs: s.mapToProto(logs)}, nil
}

func (s *AuditServer) GetChatLogs(ctx context.Context, req *auditpb.GetChatLogsRequest) (*auditpb.GetChatLogsResponse, error) {
	chatID, err := uuid.Parse(req.ChatId)
	if err != nil {
		logger.Log.Error("GetChatLogs: failed to parse chatID string", zap.String("chat_id", req.ChatId), zap.Error(err))
		return nil, status.Errorf(codes.InvalidArgument, "invalid chat_id format: %v", err)
	}

	logs, err := s.auditService.GetChatLogs(ctx, chatID)
	if err != nil {
		logger.Log.Error("GetChatLogs: database error", zap.String("chat_id", req.ChatId), zap.Error(err))
		return nil, status.Errorf(codes.Internal, "internal database error")
	}

	return &auditpb.GetChatLogsResponse{Logs: s.mapToProto(logs)}, nil
}

func (s *AuditServer) mapToProto(logs []models.AuditLog) []*auditpb.AuditLog {
	result := make([]*auditpb.AuditLog, 0, len(logs))
	for _, l := range logs {
		result = append(result, &auditpb.AuditLog{
			Id:     l.ID.String(),
			UserId: l.UserID.String(),
			ChatId: func() string {
				if l.ChatID == nil {
					return ""
				}
				return l.ChatID.String()
			}(),
			Action: l.Action,
			Details: func() string {
				if l.Details == nil {
					return ""
				}
				return *l.Details
			}(),
			CreatedAt:     l.CreatedAt.Format(time.RFC3339),
			ActorUsername: l.ActorUsername,
		})
	}
	return result
}
