package middleware

import (
	"context"
	"time"

	"Server/internal/repository"

	"github.com/google/uuid"
	"google.golang.org/grpc"
)

type AuditMiddleware struct {
	auditRepo *repository.AuditRepository
}

func NewAuditMiddleware(r *repository.AuditRepository) *AuditMiddleware {
	return &AuditMiddleware{
		auditRepo: r,
	}
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

		var userID uuid.UUID
		if v := ctx.Value(UserIDKey); v != nil {
			userID, _ = v.(uuid.UUID)
		}

		action := info.FullMethod
		details := time.Since(start).String()

		_ = m.auditRepo.CreateLog(
			ctx,
			userID,
			nil,
			action,
			&details,
		)

		return resp, err
	}
}
