package service

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

type FileService struct {
	basePath string
}

func NewFileService() *FileService {
	return &FileService{
		basePath: "storage/files",
	}
}

func (s *FileService) GenerateFilePath(originalName string) string {

	id := uuid.New()

	safeName := filepath.Base(originalName)
	safeName = strings.ReplaceAll(safeName, " ", "_")

	return filepath.Join(
		s.basePath,
		id.String()+"_"+safeName,
	)
}

func (s *FileService) EnsureStorage() error {
	return os.MkdirAll(s.basePath, 0755)
}

func (s *FileService) SaveFile(path string, data []byte) error {
	return os.WriteFile(path, data, 0644)
}

func (s *FileService) OpenFile(path string) (*os.File, error) {
	return os.Open(path)
}
