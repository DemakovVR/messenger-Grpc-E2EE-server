package service

import (
	"Server/internal/models"
	"Server/internal/repository"
	"context"

	"github.com/google/uuid"
)

type KeysService struct {
	repo         *repository.KeysRepository
	auditService *AuditService
}

func NewKeysService(
	r *repository.KeysRepository,
	auditService *AuditService,
) *KeysService {

	return &KeysService{
		repo:         r,
		auditService: auditService,
	}
}

func (s *KeysService) UploadKeys(
	ctx context.Context,
	userID uuid.UUID,
	deviceID string,
	identity, prekey, sig string,
) error {

	err := s.repo.SaveDeviceKeys(
		ctx,
		userID,
		deviceID,
		identity,
		prekey,
		sig,
	)

	if err != nil {
		return err
	}

	details := "device keys uploaded"

	_ = s.auditService.Log(
		ctx,
		userID,
		"upload_keys",
		&details,
	)

	return nil
}

func (s *KeysService) GetBundle(
	ctx context.Context,
	userID uuid.UUID,
) (models.DeviceKey, error) {

	k, err := s.repo.GetDeviceKeys(
		ctx,
		userID,
	)

	if err != nil {
		return models.DeviceKey{}, err
	}

	details := "prekey bundle requested"

	_ = s.auditService.Log(
		ctx,
		userID,
		"get_prekey_bundle",
		&details,
	)

	return k, nil
}

func (s *KeysService) GetOneTimeKey(
	ctx context.Context,
	deviceKeyID uuid.UUID,
) (models.OneTimePreKey, error) {

	return s.repo.GetOneTimePreKey(ctx, deviceKeyID)
}

func (s *KeysService) MarkOneTimeKeyUsed(
	ctx context.Context,
	id uuid.UUID,
) error {

	return s.repo.MarkOneTimePreKeyUsed(ctx, id)
}

func (s *KeysService) UploadOneTimeKeys(
	ctx context.Context,
	deviceKeyID uuid.UUID,
	keys []models.OneTimePreKey,
) error {

	err := s.repo.SaveOTPKs(
		ctx,
		deviceKeyID,
		keys,
	)

	if err != nil {
		return err
	}

	details := "one-time prekeys uploaded"

	_ = s.auditService.Log(
		ctx,
		uuid.Nil,
		"upload_otpk",
		&details,
	)

	return nil
}

func (s *KeysService) RotateSignedPreKey(
	ctx context.Context,
	userID uuid.UUID,
	deviceID string,
	publicKey string,
	signature string,
) error {

	err := s.repo.UpdateSignedPreKey(
		ctx,
		userID,
		deviceID,
		publicKey,
		signature,
	)

	if err != nil {
		return err
	}

	details := "signed prekey rotated"

	_ = s.auditService.Log(
		ctx,
		userID,
		"rotate_signed_prekey",
		&details,
	)

	return nil
}
