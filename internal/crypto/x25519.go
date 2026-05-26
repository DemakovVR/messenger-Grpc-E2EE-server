package crypto

import (
	"crypto/rand"

	"golang.org/x/crypto/curve25519"
)

func GenerateX25519KeyPair() (
	publicKey []byte,
	privateKey []byte,
	err error,
) {

	privateKey = make([]byte, 32)

	_, err = rand.Read(privateKey)
	if err != nil {
		return nil, nil, err
	}

	publicKey, err = curve25519.X25519(
		privateKey,
		curve25519.Basepoint,
	)

	return
}

func ComputeSharedSecret(
	privateKey []byte,
	publicKey []byte,
) ([]byte, error) {

	return curve25519.X25519(
		privateKey,
		publicKey,
	)
}
