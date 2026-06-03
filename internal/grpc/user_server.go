package grpc

import (
	"context"

	authpb "Server/gen/auth"
	"Server/internal/logger"
	"Server/internal/middleware"
	"Server/internal/service"

	"github.com/google/uuid"
	"go.uber.org/zap"
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

	logger.Log.Info("UpdatePublicKey called", zap.String("public_key", req.PublicKey))

	userIDStr := ctx.Value(middleware.UserIDKey).(string)

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		logger.Log.Error("Failed to parse userID", zap.Error(err))
		return nil, err
	}

	err = s.userService.UpdatePublicKey(
		ctx,
		userID,
		req.PublicKey,
	)

	if err != nil {
		logger.Log.Error("Failed to update public key", zap.Error(err))
		return nil, err
	}

	logger.Log.Info("Public key updated successfully", zap.String("user_id", userID.String()))

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

func (s *UserServer) GetPublicKey(ctx context.Context, req *authpb.GetPublicKeyRequest) (*authpb.GetPublicKeyResponse, error) {
	userID, err := uuid.Parse(req.UserId)
	if err != nil {
		return nil, err
	}

	user, err := s.userService.GetProfile(ctx, userID)
	if err != nil {
		return nil, err
	}

	publicKey := ""
	if user.PublicKey != nil {
		publicKey = *user.PublicKey
	}

	return &authpb.GetPublicKeyResponse{
		PublicKey: publicKey,
	}, nil
}
