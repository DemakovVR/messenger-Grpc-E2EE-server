package middleware

import (
	"context"
	"strings"

	"Server/internal/auth"

	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

type contextKey string

const UserIDKey contextKey = "user_id"

func AuthInterceptor(jwtSecret string) grpc.UnaryServerInterceptor {

	return func(
		ctx context.Context,
		req interface{},
		info *grpc.UnaryServerInfo,
		handler grpc.UnaryHandler,
	) (interface{}, error) {

		if strings.Contains(info.FullMethod, "Register") ||
			strings.Contains(info.FullMethod, "Login") {
			return handler(ctx, req)
		}

		md, ok := metadata.FromIncomingContext(ctx)
		if !ok {
			return nil, ErrMissingMetadata
		}

		values := md.Get("authorization")
		if len(values) == 0 {
			return nil, ErrMissingToken
		}

		token := strings.TrimPrefix(values[0], "Bearer ")

		claims, err := auth.ValidateToken(
			token,
			jwtSecret,
		)

		if err != nil {
			return nil, err
		}

		ctx = context.WithValue(
			ctx,
			UserIDKey,
			claims.UserID,
		)

		return handler(ctx, req)
	}
}
