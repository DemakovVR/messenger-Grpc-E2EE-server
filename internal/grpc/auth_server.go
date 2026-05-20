package grpc

import (
	"context"

	authpb "Server/gen/auth"
)

type AuthServer struct {
	authpb.UnimplementedAuthServiceServer
}

func NewAuthServer() *AuthServer {
	return &AuthServer{}
}

func (s *AuthServer) Register(ctx context.Context, req *authpb.RegisterRequest) (*authpb.RegisterResponse, error) {
	return &authpb.RegisterResponse{
		UserId:  "test-id",
		Message: "registered",
	}, nil
}

func (s *AuthServer) Login(ctx context.Context, req *authpb.LoginRequest) (*authpb.LoginResponse, error) {
	return &authpb.LoginResponse{
		Token: "test-token",
	}, nil
}
