package middleware

import (
	"context"
	"errors"

	"Server/internal/service"

	"google.golang.org/grpc"
)

func RateLimitInterceptor(
	limiter *service.RateLimiter,
) grpc.UnaryServerInterceptor {

	return func(
		ctx context.Context,
		req interface{},
		info *grpc.UnaryServerInfo,
		handler grpc.UnaryHandler,
	) (interface{}, error) {

		userID, _ := ctx.Value(
			UserIDKey,
		).(string)

		if userID != "" {

			if !limiter.Allow(userID) {
				return nil, errors.New(
					"rate limit exceeded",
				)
			}
		}

		return handler(
			ctx,
			req,
		)
	}
}
