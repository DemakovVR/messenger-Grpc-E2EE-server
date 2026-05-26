package grpc

import (
	"context"

	keyspb "Server/gen/keys"
	"Server/internal/middleware"
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

	// device_id у тебя UUID в protobuf → string в БД → НЕ парсим в UUID
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
	}, nil
}
