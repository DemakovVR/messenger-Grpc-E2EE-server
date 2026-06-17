package middleware

import (
	"context"
	"encoding/json"
	"time"

	"Server/internal/audit"
	"Server/internal/contextkeys"
	"Server/internal/logger"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/peer"
	"google.golang.org/grpc/status"
)

type AuditMiddleware struct {
	auditRepo *audit.AuditRepository
}

func NewAuditMiddleware(r *audit.AuditRepository) *AuditMiddleware {
	return &AuditMiddleware{
		auditRepo: r,
	}
}

type AuditLogDetails struct {
	Duration string `json:"duration"`
	Status   string `json:"status"`
	Error    string `json:"error,omitempty"`
	ClientIP string `json:"client_ip,omitempty"`
}

func (m *AuditMiddleware) Unary() grpc.UnaryServerInterceptor {
	return func(
		ctx context.Context,
		req any,
		info *grpc.UnaryServerInfo,
		handler grpc.UnaryHandler,
	) (any, error) {

		start := time.Now()

		resp, err := handler(ctx, req)

		duration := time.Since(start).String()

		statusCode := "OK"
		var errorMessage string
		if err != nil {
			if st, ok := status.FromError(err); ok {
				statusCode = st.Code().String()
			} else {
				statusCode = "UnknownError"
			}
			errorMessage = err.Error()
		}

		clientIP := "unknown"
		if p, ok := peer.FromContext(ctx); ok && p.Addr != nil {
			clientIP = p.Addr.String()
		}

		logDetails := AuditLogDetails{
			Duration: duration,
			Status:   statusCode,
			Error:    errorMessage,
			ClientIP: clientIP,
		}

		detailsBytes, jsonErr := json.Marshal(logDetails)
		var detailsStr string
		if jsonErr == nil {
			detailsStr = string(detailsBytes)
		} else {
			detailsStr = "{" + `"duration":"` + duration + `"` + "}"
		}

		var userID uuid.UUID
		if v := ctx.Value(contextkeys.UserIDKey); v != nil {
			switch val := v.(type) {
			case uuid.UUID:
				userID = val
			case string:
				if parsed, err := uuid.Parse(val); err == nil {
					userID = parsed
				}
			}
		}

		var chatID *uuid.UUID
		type chatRequest interface {
			GetChatId() string
		}
		if cr, ok := req.(chatRequest); ok && cr.GetChatId() != "" {
			if parsedChatID, err := uuid.Parse(cr.GetChatId()); err == nil {
				chatID = &parsedChatID
			}
		}

		if userID != uuid.Nil {
			logErr := m.auditRepo.CreateLog(
				ctx,
				userID,
				chatID,
				info.FullMethod,
				&detailsStr,
			)
			if logErr != nil {
				logger.Log.Error("Failed to save audit log", zap.Error(logErr))
			}
		}

		return resp, err
	}
}
