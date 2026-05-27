package service

import (
	"context"
	"errors"
	"time"

	"Server/internal/auth"
	"Server/internal/models"
	"Server/internal/repository"

	"github.com/google/uuid"
)

var ErrInvalidCredentials = errors.New("invalid email or password")

type AuthService struct {
	userRepo       *repository.UserRepository
	refreshRepo    *repository.RefreshRepository
	auditService   *AuditService
	refreshService *RefreshService
	jwtSecret      string
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
) (uuid.UUID, error) {

	hash, err := auth.HashPassword(password)
	if err != nil {
		return uuid.Nil, err
	}

	user := &models.User{
		Username:     username,
		Email:        email,
		PasswordHash: hash,
		Role:         "user",
	}

	err = s.userRepo.CreateUser(ctx, user)
	if err != nil {
		return uuid.Nil, err
	}

	return user.ID, nil
}

func (s *AuthService) Login(
	ctx context.Context,
	email string,
	password string,
) (string, string, error) {

	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return "", "", err
	}

	if !auth.CheckPasswordHash(password, user.PasswordHash) {
		return "", "", ErrInvalidCredentials
	}

	accessToken, err := auth.GenerateAccessToken(
		user.ID.String(),
		s.jwtSecret,
	)
	if err != nil {
		return "", "", err
	}

	refreshToken := s.refreshService.Generate()

	err = s.refreshRepo.Save(
		ctx,
		user.ID,
		refreshToken,
		time.Now().Add(7*24*time.Hour),
	)
	if err != nil {
		return "", "", err
	}

	details := "user login"
	_ = s.auditService.Log(ctx, user.ID, "login", &details)

	return accessToken, refreshToken, nil
}

func (s *AuthService) Logout(
	ctx context.Context,
	refreshToken string,
) error {

	return s.refreshRepo.DeleteByToken(ctx, refreshToken)
}

func (s *AuthService) Refresh(
	ctx context.Context,
	refreshToken string,
) (string, error) {

	userID, err := s.refreshRepo.GetByToken(ctx, refreshToken)
	if err != nil {
		return "", err
	}

	return auth.GenerateAccessToken(
		userID.String(),
		s.jwtSecret,
	)
}

func (s *AuthService) ChangePassword(
	ctx context.Context,
	userID uuid.UUID,
	oldPassword string,
	newPassword string,
) error {

	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return err
	}

	if !auth.CheckPasswordHash(oldPassword, user.PasswordHash) {
		return ErrInvalidCredentials
	}

	newHash, err := auth.HashPassword(newPassword)
	if err != nil {
		return err
	}

	err = s.userRepo.UpdatePassword(ctx, userID, newHash)
	if err != nil {
		return err
	}

	_ = s.refreshRepo.DeleteByUserID(ctx, userID)

	return nil
}
