package file

import (
	"Server/internal/models"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

type FileService struct {
	basePath string
	repo     *FileRepository
}

func NewFileService(repo *FileRepository) *FileService {
	return &FileService{
		basePath: "storage/files",
		repo:     repo,
	}
}

func (s *FileService) SaveUploadedFile(
	uploaderID uuid.UUID,
	originalName string,
	data []byte,
) (models.File, error) {

	fileID := uuid.New()

	safeName := filepath.Base(originalName)
	safeName = strings.ReplaceAll(safeName, " ", "_")

	filePath := filepath.Join(
		s.basePath,
		fileID.String()+"_"+safeName,
	)

	err := s.repo.SaveFile(filePath, data)
	if err != nil {
		return models.File{}, err
	}

	file := models.File{
		ID:         fileID,
		UploaderID: uploaderID,
		FileName:   originalName,
		FilePath:   filePath,
		FileSize:   int64(len(data)),
		CreatedAt:  time.Now(),
	}

	err = s.repo.SaveMetadata(file)
	if err != nil {
		return models.File{}, err
	}

	return file, nil
}

func (s *FileService) EnsureStorage() error {
	return s.repo.EnsureDir(s.basePath)
}
