package main

import (
	"context"
	"fmt"
	"os/signal"
	"syscall"

	"Server/configs"
	"Server/internal/logger"
	"Server/internal/repository"

	"go.uber.org/zap"
)

func main() {
	cfg := configs.LoadConfig()

	logger.InitLogger(cfg.LogLevel, cfg.LogEncoding)
	defer logger.Sync()

	logger.Log.Info("Starting SecureTalk server")

	dsn := fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=disable",
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBHost,
		cfg.DBPort,
		cfg.DBName,
	)

	// Сначала миграции
	if err := repository.RunMigrations(logger.Log, dsn); err != nil {
		logger.Log.Fatal("Failed to run migrations", zap.Error(err))
	}

	// Потом создаем pool
	db := repository.NewPostgresDB(cfg, logger.Log)
	defer db.Close()

	logger.Log.Info("Database connected and migrations applied")

	ctx, stop := signal.NotifyContext(
		context.Background(),
		syscall.SIGINT,
		syscall.SIGTERM,
	)
	defer stop()

	logger.Log.Info("Service started", zap.String("port", cfg.ServerPort))

	<-ctx.Done()
	logger.Log.Info("Shutting down...")
}
