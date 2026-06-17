package auth

import (
	"context"

	authpb "Server/gen/auth"
	"Server/internal/contextkeys"

	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type AuthServer struct {
	authpb.UnimplementedAuthServiceServer
	authService *AuthService
	userService *UserService
}

func NewAuthServer(authService *AuthService, userService *UserService) *AuthServer {
	return &AuthServer{
		authService: authService,
		userService: userService,
	}
}

func (s *AuthServer) Register(
	ctx context.Context,
	req *authpb.RegisterRequest,
) (*authpb.RegisterResponse, error) {

	userID, err := s.authService.Register(
		ctx,
		req.Username,
		req.Email,
		req.Password,
	)
	if err != nil {
		return nil, status.Errorf(codes.Internal, err.Error())
	}

	return &authpb.RegisterResponse{
		UserId:  userID.String(),
		Message: "User registered successfully",
	}, nil
}

func (s *AuthServer) Login(
	ctx context.Context,
	req *authpb.LoginRequest,
) (*authpb.LoginResponse, error) {
	accessToken, refreshToken, err := s.authService.Login(
		ctx,
		req.Username,
		req.Password,
	)
	if err != nil {
		return nil, status.Errorf(codes.Unauthenticated, err.Error())
	}

	user, err := s.userService.GetByUsername(ctx, req.Username)
	if err != nil {
		return nil, status.Errorf(codes.Internal, err.Error())
	}

	return &authpb.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		Username:     user.Username,
	}, nil
}

func (s *AuthServer) Logout(
	ctx context.Context,
	req *authpb.LogoutRequest,
) (*authpb.Empty, error) {

	err := s.authService.Logout(ctx, req.RefreshToken)
	if err != nil {
		return nil, status.Errorf(codes.Internal, err.Error())
	}

	return &authpb.Empty{}, nil
}

func (s *AuthServer) RefreshToken(
	ctx context.Context,
	req *authpb.RefreshTokenRequest,
) (*authpb.RefreshTokenResponse, error) {

	accessToken, err := s.authService.Refresh(
		ctx,
		req.RefreshToken,
	)
	if err != nil {
		return nil, status.Errorf(codes.Unauthenticated, err.Error())
	}

	return &authpb.RefreshTokenResponse{
		AccessToken: accessToken,
	}, nil
}

func (s *AuthServer) ChangePassword(
	ctx context.Context,
	req *authpb.ChangePasswordRequest,
) (*authpb.Empty, error) {

	userIDStr := ctx.Value(contextkeys.UserIDKey).(string)

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, status.Errorf(codes.Unauthenticated, "invalid user")
	}

	err = s.authService.ChangePassword(
		ctx,
		userID,
		req.OldPassword,
		req.NewPassword,
	)

	if err != nil {
		return nil, status.Errorf(codes.Internal, err.Error())
	}

	return &authpb.Empty{}, nil
}
