package models

import (
	"time"

	"github.com/google/uuid"
)

type File struct {
	ID         uuid.UUID `db:"id"`
	UploaderID uuid.UUID `db:"uploader_id"`

	FileName  string    `db:"file_name"`
	FilePath  string    `db:"file_path"`
	FileSize  int64     `db:"file_size"`
	CreatedAt time.Time `db:"created_at"`
}
