-- +goose Up

CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    uploader_id UUID REFERENCES users(id)
        ON DELETE SET NULL,

    file_name VARCHAR(255) NOT NULL,

    file_path TEXT NOT NULL,

    file_size BIGINT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_files_uploader_id
ON files(uploader_id);

-- +goose Down

DROP TABLE IF EXISTS files;