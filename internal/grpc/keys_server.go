package grpc

import (
	"context"

	keyspb "Server/gen/keys"
	"Server/internal/middleware"
	"Server/internal/models"
	"Server/internal/service"

	"github.com/google/uuid"
)

type KeysServer struct {
	keyspb.UnimplementedKeyServiceServer
	service *service.KeysService
}

func NewKeysServer(s *service.KeysService) *KeysServer {
	return &KeysServer{service: s}
}

func (s *KeysServer) UploadKeys(
	ctx context.Context,
	req *keyspb.UploadKeysRequest,
) (*keyspb.Empty, error) {

	userIDStr := ctx.Value(middleware.UserIDKey).(string)

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, err
	}

	err = s.service.UploadKeys(
		ctx,
		userID,
		req.DeviceId,
		req.IdentityKeyPublic,
		req.SignedPrekeyPublic,
		req.SignedPrekeySignature,
	)

	return &keyspb.Empty{}, err
}

func (s *KeysServer) GetPreKeyBundle(
	ctx context.Context,
	req *keyspb.GetPreKeyBundleRequest,
) (*keyspb.PreKeyBundle, error) {

	userID, err := uuid.Parse(req.UserId)
	if err != nil {
		return nil, err
	}

	k, err := s.service.GetBundle(ctx, userID)
	if err != nil {
		return nil, err
	}

	otpk, err := s.service.GetOneTimeKey(ctx, k.ID)
	if err == nil && otpk.ID != uuid.Nil {
		_ = s.service.MarkOneTimeKeyUsed(ctx, otpk.ID)
	}

	return &keyspb.PreKeyBundle{
		UserId:                k.UserID.String(),
		DeviceId:              k.DeviceID,
		IdentityKeyPublic:     k.IdentityKeyPublic,
		SignedPrekeyPublic:    k.SignedPreKeyPublic,
		SignedPrekeySignature: k.SignedPreKeySignature,
		OneTimePrekey:         otpk.PublicKey,
		OneTimePrekeyId:       int32(otpk.KeyID),
	}, nil
}

func (s *KeysServer) UploadOneTimeKeys(
	ctx context.Context,
	req *keyspb.UploadOneTimeKeysRequest,
) (*keyspb.Empty, error) {

	deviceKeyID, err := uuid.Parse(
		req.DeviceKeyId,
	)

	if err != nil {
		return nil, err
	}

	var keys []models.OneTimePreKey

	for _, k := range req.Keys {

		keys = append(
			keys,
			models.OneTimePreKey{
				KeyID:     int(k.KeyId),
				PublicKey: k.PublicKey,
			},
		)
	}

	err = s.service.UploadOneTimeKeys(
		ctx,
		deviceKeyID,
		keys,
	)

	if err != nil {
		return nil, err
	}

	return &keyspb.Empty{}, nil
}

func (s *KeysServer) RotateSignedPreKey(
	ctx context.Context,
	req *keyspb.RotateSignedPreKeyRequest,
) (*keyspb.Empty, error) {

	userIDStr := ctx.Value(
		middleware.UserIDKey,
	).(string)

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, err
	}

	err = s.service.RotateSignedPreKey(
		ctx,
		userID,
		req.DeviceId,
		req.SignedPrekeyPublic,
		req.SignedPrekeySignature,
	)

	if err != nil {
		return nil, err
	}

	return &keyspb.Empty{}, nil
}
