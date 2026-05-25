package service

import (
	"os"
	"path/filepath"

	"github.com/google/uuid"
)

type FileService struct {
}

func NewFileService() *FileService {
	return &FileService{}
}

func (s *FileService) GenerateFilePath(
	originalName string,
) string {

	id := uuid.New()

	return filepath.Join(
		"storage",
		"files",
		id.String()+"_"+originalName,
	)
}

func (s *FileService) EnsureStorage() error {

	return os.MkdirAll(
		"storage/files",
		0755,
	)
}
