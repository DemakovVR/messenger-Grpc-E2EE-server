package repository

import (
	"context"
	"fmt"
	"time"

	"Server/configs"

	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

func NewPostgresDB(cfg *configs.Config, log *zap.Logger) *pgxpool.Pool {

	dsn := fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=disable",
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBHost,
		cfg.DBPort,
		cfg.DBName,
	)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		log.Fatal("Failed to connect to PostgreSQL", zap.Error(err))
	}

	return pool
}
