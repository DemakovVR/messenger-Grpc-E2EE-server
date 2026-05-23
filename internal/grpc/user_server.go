package grpc

import (
	"context"

	authpb "Server/gen/auth"
	"Server/internal/middleware"
	"Server/internal/service"
)

type UserServer struct {
	authpb.UnimplementedUserServiceServer

	userService *service.UserService
}

func NewUserServer(
	userService *service.UserService,
) *UserServer {

	return &UserServer{
		userService: userService,
	}
}

func (s *UserServer) GetProfile(
	ctx context.Context,
	req *authpb.GetProfileRequest,
) (*authpb.GetProfileResponse, error) {

	userID := ctx.Value(
		middleware.UserIDKey,
	).(string)

	user, err := s.userService.GetProfile(
		ctx,
		userID,
	)

	if err != nil {
		return nil, err
	}

	return &authpb.GetProfileResponse{
		Id:       user.ID.String(),
		Username: user.Username,
		Email:    user.Email,
		Role:     user.Role,
	}, nil
}
