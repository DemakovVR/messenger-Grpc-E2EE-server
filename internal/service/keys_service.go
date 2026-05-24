package service

import (
	"Server/internal/models"
	"Server/internal/repository"
	"context"
)

type KeysService struct {
	repo *repository.KeysRepository
}

func NewKeysService(r *repository.KeysRepository) *KeysService {
	return &KeysService{repo: r}
}

func (s *KeysService) UploadKeys(
	ctx context.Context,
	userID, deviceID, identity, prekey, sig string,
) error {
	return s.repo.SaveDeviceKeys(ctx, userID, deviceID, identity, prekey, sig)
}

func (s *KeysService) GetBundle(ctx context.Context, userID string) (models.DeviceKey, error) {
	return s.repo.GetDeviceKeys(ctx, userID)
}

func (s *KeysService) GetOneTimeKey(ctx context.Context, deviceID string) (models.OneTimePreKey, error) {
	key, err := s.repo.GetOneTimePreKey(ctx, deviceID)
	if err != nil {
		return key, err
	}

	return key, nil
}

func (s *KeysService) MarkOneTimeKeyUsed(ctx context.Context, id string) error {
	return s.repo.MarkOneTimePreKeyUsed(ctx, id)
}
