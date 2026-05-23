package middleware

import (
	"errors"
)

var ErrMissingMetadata = errors.New(
	"missing metadata",
)

var ErrMissingToken = errors.New(
	"missing authorization token",
)
