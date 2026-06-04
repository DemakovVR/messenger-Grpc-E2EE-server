package repository

import (
	"context"
	"os"

	"Server/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type FileRepository struct {
	db *pgxpool.Pool
}

func NewFileRepository(db *pgxpool.Pool) *FileRepository {
	return &FileRepository{
		db: db,
	}
}

func (r *FileRepository) SaveFile(path string, data []byte) error {
	return os.WriteFile(path, data, 0644)
}

func (r *FileRepository) ReadFile(path string) ([]byte, error) {
	return os.ReadFile(path)
}

func (r *FileRepository) EnsureDir(path string) error {
	return os.MkdirAll(path, 0755)
}

func (r *FileRepository) SaveMetadata(file models.File) error {
	_, err := r.db.Exec(
		context.Background(),
		`
		INSERT INTO files (
			id,
			uploader_id,
			file_name,
			file_path,
			file_size,
			created_at
		)
		VALUES ($1,$2,$3,$4,$5,$6)
		`,
		file.ID,
		file.UploaderID,
		file.FileName,
		file.FilePath,
		file.FileSize,
		file.CreatedAt,
	)

	return err
}
