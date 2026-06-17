package auth

import (
	"crypto/rand"
	"encoding/hex"
)

type RefreshService struct {
}

func NewRefreshService() *RefreshService {
	return &RefreshService{}
}

func (s *RefreshService) Generate() string {

	b := make([]byte, 32)

	rand.Read(b)

	return hex.EncodeToString(b)
}
