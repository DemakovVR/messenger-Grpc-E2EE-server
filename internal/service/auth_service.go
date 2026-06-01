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
	username string,
	password string,
) (string, string, error) {

	user, err := s.userRepo.GetByUsername(ctx, username)
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

	_ = s.refreshRepo.DeleteByUserID(ctx, user.ID)

	rt := models.RefreshToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		Token:     refreshToken,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
		CreatedAt: time.Now(),
	}

	err = s.refreshRepo.Save(ctx, rt)
	if err != nil {
		return "", "", err
	}

	return accessToken, refreshToken, nil
}

func (s *AuthService) Logout(
	ctx context.Context,
	refreshToken string,
) error {

	rt, err := s.refreshRepo.GetByToken(ctx, refreshToken)
	if err == nil {
		_ = s.refreshRepo.DeleteByUserID(ctx, rt.UserID)
	}

	return nil
}

func (s *AuthService) Refresh(
	ctx context.Context,
	refreshToken string,
) (string, error) {

	rt, err := s.refreshRepo.GetByToken(ctx, refreshToken)
	if err != nil {
		return "", err
	}

	_ = s.refreshRepo.DeleteByToken(ctx, refreshToken)

	newAccessToken, err := auth.GenerateAccessToken(
		rt.UserID.String(),
		s.jwtSecret,
	)
	if err != nil {
		return "", err
	}

	return newAccessToken, nil
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
