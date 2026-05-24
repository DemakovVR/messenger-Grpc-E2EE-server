package grpc

import (
	keyspb "Server/gen/keys"
	"Server/internal/service"
	"context"
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

	userID := ctx.Value("user_id").(string)

	err := s.service.UploadKeys(
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

	k, err := s.service.GetBundle(ctx, req.UserId)
	if err != nil {
		return nil, err
	}

	otpk, err := s.service.GetOneTimeKey(ctx, k.DeviceID)
	if err == nil && otpk.ID != "" {
		_ = s.service.MarkOneTimeKeyUsed(ctx, otpk.ID)
	}

	return &keyspb.PreKeyBundle{
		UserId:                k.UserID,
		DeviceId:              k.DeviceID,
		IdentityKeyPublic:     k.IdentityKeyPublic,
		SignedPrekeyPublic:    k.SignedPreKeyPublic,
		SignedPrekeySignature: k.SignedPreKeySignature,
		OneTimePrekey:         otpk.PublicKey,
	}, nil
}
