package service

import (
	"context"
	"errors"

	"Server/internal/auth"
	"Server/internal/repository"
)

var ErrInvalidCredentials = errors.New(
	"invalid email or password",
)

type AuthService struct {
	userRepo  *repository.UserRepository
	jwtSecret string
}

func NewAuthService(
	userRepo *repository.UserRepository,
	jwtSecret string,
) *AuthService {

	return &AuthService{
		userRepo:  userRepo,
		jwtSecret: jwtSecret,
	}
}

func (s *AuthService) Register(
	ctx context.Context,
	username string,
	email string,
	password string,
) (string, error) {

	hash, err := auth.HashPassword(password)
	if err != nil {
		return "", err
	}

	user := &repository.User{
		Username:     username,
		Email:        email,
		PasswordHash: hash,
		Role:         "user",
	}

	err = s.userRepo.CreateUser(
		ctx,
		user,
	)
	if err != nil {
		return "", err
	}

	return user.ID.String(), nil
}

func (s *AuthService) Login(
	ctx context.Context,
	email string,
	password string,
) (string, error) {

	user, err := s.userRepo.GetByEmail(
		ctx,
		email,
	)

	if err != nil {
		return "", err
	}

	if !auth.CheckPasswordHash(
		password,
		user.PasswordHash,
	) {
		return "", ErrInvalidCredentials
	}

	token, err := auth.GenerateAccessToken(
		user.ID.String(),
		s.jwtSecret,
	)

	if err != nil {
		return "", err
	}

	return token, nil
}
