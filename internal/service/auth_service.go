package service

import (
	"context"
	"errors"
	"time"

	"Server/internal/auth"
	"Server/internal/repository"
)

var ErrInvalidCredentials = errors.New(
	"invalid email or password",
)

type AuthService struct {
	userRepo       *repository.UserRepository
	refreshRepo    *repository.RefreshRepository
	auditService   *AuditService
	refreshService *RefreshService

	jwtSecret string
}

func NewAuthService(
	userRepo *repository.UserRepository,
	refreshRepo *repository.RefreshRepository,
	auditService *AuditService,
	refreshService *RefreshService,
	jwtSecret string,
) *AuthService {

	return &AuthService{
		userRepo:       userRepo,
		refreshRepo:    refreshRepo,
		auditService:   auditService,
		refreshService: refreshService,
		jwtSecret:      jwtSecret,
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
) (string, string, error) {

	user, err := s.userRepo.GetByEmail(
		ctx,
		email,
	)

	if err != nil {
		return "", "", err
	}

	if !auth.CheckPasswordHash(
		password,
		user.PasswordHash,
	) {
		return "", "", ErrInvalidCredentials
	}

	accessToken, err := auth.GenerateAccessToken(
		user.ID.String(),
		s.jwtSecret,
	)

	if err != nil {
		return "", "", err
	}

	refreshToken :=
		s.refreshService.Generate()

	err = s.refreshRepo.Save(
		ctx,
		user.ID.String(),
		refreshToken,
		time.Now().Add(
			7*24*time.Hour,
		),
	)

	if err != nil {
		return "", "", err
	}

	s.auditService.Log(
		ctx,
		user.ID.String(),
		"login",
		"user login",
	)

	return accessToken,
		refreshToken,
		nil
}

func (s *AuthService) Refresh(
	ctx context.Context,
	refreshToken string,
) (string, error) {

	userID, err := s.refreshRepo.GetByToken(
		ctx,
		refreshToken,
	)

	if err != nil {
		return "", err
	}

	accessToken, err := auth.GenerateAccessToken(
		userID,
		s.jwtSecret,
	)

	if err != nil {
		return "", err
	}

	return accessToken, nil
}
