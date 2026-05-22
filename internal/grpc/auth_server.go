package grpc

import (
	"context"

	authpb "Server/gen/auth"
	"Server/internal/service"
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
		return nil, err
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

	token, err := s.authService.Login(
		ctx,
		req.Email,
		req.Password,
	)

	if err != nil {
		return nil, err
	}

	return &authpb.LoginResponse{
		Token: token,
	}, nil
}
