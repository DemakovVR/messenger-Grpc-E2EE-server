package service

import (
	"context"

	"Server/internal/models"
	"Server/internal/repository"

	"github.com/google/uuid"
)

type KeysService struct {
	repo *repository.KeysRepository
}

func NewKeysService(
	r *repository.KeysRepository,
) *KeysService {

	return &KeysService{
		repo: r,
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

	return k, nil
}

func (s *KeysService) GetOneTimeKey(
	ctx context.Context,
	deviceKeyID uuid.UUID,
) (models.OneTimePreKey, error) {

	k, err := s.repo.GetOneTimePreKey(ctx, deviceKeyID)
	if err != nil {
		return models.OneTimePreKey{}, err
	}

	return k, nil
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

	return nil
}

func (s *KeysService) GetDeviceKeyIDByUserID(ctx context.Context,
	userID uuid.UUID,
) (uuid.UUID, error) {
	return s.repo.GetDeviceKeyIDByUserID(ctx, userID)
}
