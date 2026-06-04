package middleware

import (
	"context"
	"strings"

	"Server/internal/auth"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

type wrappedStream struct {
	grpc.ServerStream
	ctx context.Context
}

func (w *wrappedStream) Context() context.Context {
	return w.ctx
}

func AuthInterceptor(jwtSecret string) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		if isPublic(info.FullMethod) {
			return handler(ctx, req)
		}
		userID, err := authorize(ctx, jwtSecret)
		if err != nil {
			return nil, err
		}
		newCtx := context.WithValue(ctx, UserIDKey, userID)
		return handler(newCtx, req)
	}
}

func AuthStreamInterceptor(jwtSecret string) grpc.StreamServerInterceptor {
	return func(srv interface{}, ss grpc.ServerStream, info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
		if isPublic(info.FullMethod) {
			return handler(srv, ss)
		}
		userID, err := authorize(ss.Context(), jwtSecret)
		if err != nil {
			return err
		}
		newCtx := context.WithValue(ss.Context(), UserIDKey, userID)
		newStream := &wrappedStream{ss, newCtx}
		return handler(srv, newStream)
	}
}

func isPublic(method string) bool {
	return strings.Contains(method, "Register") || strings.Contains(method, "Login")
}

func authorize(ctx context.Context, jwtSecret string) (string, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return "", status.Errorf(codes.Unauthenticated, "metadata missing")
	}
	values := md.Get("authorization")
	if len(values) == 0 {
		return "", status.Errorf(codes.Unauthenticated, "token missing")
	}
	token := strings.TrimPrefix(values[0], "Bearer ")
	claims, err := auth.ValidateToken(token, jwtSecret)
	if err != nil {
		return "", status.Errorf(codes.Unauthenticated, "invalid token")
	}
	return claims.UserID, nil
}
