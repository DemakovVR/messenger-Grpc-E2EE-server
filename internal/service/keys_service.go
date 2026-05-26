package service

import (
	"Server/internal/models"
	"Server/internal/repository"
	"context"

	"github.com/google/uuid"
)

type KeysService struct {
	repo *repository.KeysRepository
}

func NewKeysService(r *repository.KeysRepository) *KeysService {
	return &KeysService{repo: r}
}

func (s *KeysService) UploadKeys(
	ctx context.Context,
	userID uuid.UUID,
	deviceID string,
	identity, prekey, sig string,
) error {

	return s.repo.SaveDeviceKeys(
		ctx,
		userID,
		deviceID,
		identity,
		prekey,
		sig,
	)
}

func (s *KeysService) GetBundle(
	ctx context.Context,
	userID uuid.UUID,
) (models.DeviceKey, error) {

	return s.repo.GetDeviceKeys(ctx, userID)
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
