package tls

import (
	"google.golang.org/grpc/credentials"
)

func LoadTLSCredentials(
	certFile string,
	keyFile string,
) (credentials.TransportCredentials, error) {

	return credentials.NewServerTLSFromFile(
		certFile,
		keyFile,
	)
}
