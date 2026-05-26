package grpc

import (
	"context"

	authpb "Server/gen/auth"
	"Server/internal/service"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type AuthServer struct {
	authpb.UnimplementedAuthServiceServer

	authService *service.AuthService
}

func NewAuthServer(
	authService *service.AuthService,
) *AuthServer {
	return &AuthServer{
		authService: authService,
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
		UserId:  userID,
		Message: "User registered successfully",
	}, nil
}

func (s *AuthServer) Login(
	ctx context.Context,
	req *authpb.LoginRequest,
) (*authpb.LoginResponse, error) {

	accessToken, refreshToken, err := s.authService.Login(
		ctx,
		req.Email,
		req.Password,
	)
	if err != nil {
		return nil, status.Errorf(codes.Unauthenticated, err.Error())
	}

	return &authpb.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
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
