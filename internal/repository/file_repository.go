package repository

import (
	"os"
)

type FileRepository struct {
}

func NewFileRepository() *FileRepository {
	return &FileRepository{}
}

func (r *FileRepository) SaveFile(
	path string,
	data []byte,
) error {

	return os.WriteFile(
		path,
		data,
		0644,
	)
}

func (r *FileRepository) ReadFile(
	path string,
) ([]byte, error) {

	return os.ReadFile(path)
}
