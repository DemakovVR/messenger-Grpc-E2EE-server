package grpc

import (
	"context"

	authpb "Server/gen/auth"
	"Server/internal/middleware"
	"Server/internal/service"

	"github.com/google/uuid"
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

	userIDStr := ctx.Value(middleware.UserIDKey).(string)

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, err
	}

	user, err := s.userService.GetProfile(ctx, userID)
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

func (s *UserServer) UpdateProfile(
	ctx context.Context,
	req *authpb.UpdateProfileRequest,
) (*authpb.Empty, error) {

	userIDStr := ctx.Value(middleware.UserIDKey).(string)

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, err
	}

	err = s.userService.UpdateProfile(
		ctx,
		userID,
		req.Username,
		req.Email,
	)

	if err != nil {
		return nil, err
	}

	return &authpb.Empty{}, nil
}

func (s *UserServer) UpdatePublicKey(
	ctx context.Context,
	req *authpb.UpdatePublicKeyRequest,
) (*authpb.Empty, error) {

	userIDStr := ctx.Value(middleware.UserIDKey).(string)

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, err
	}

	err = s.userService.UpdatePublicKey(
		ctx,
		userID,
		req.PublicKey,
	)

	if err != nil {
		return nil, err
	}

	return &authpb.Empty{}, nil
}

func (s *UserServer) DeleteAccount(
	ctx context.Context,
	req *authpb.Empty,
) (*authpb.Empty, error) {

	userIDStr := ctx.Value(middleware.UserIDKey).(string)

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, err
	}

	err = s.userService.DeleteAccount(ctx, userID)
	if err != nil {
		return nil, err
	}

	return &authpb.Empty{}, nil
}
