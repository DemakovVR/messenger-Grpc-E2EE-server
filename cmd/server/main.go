package main

import (
	"context"
	"os/signal"
	"syscall"

	"Server/configs"
	"Server/internal/logger"
	"Server/internal/repository"

	"go.uber.org/zap"
)

func main() {

	// Logger
	logger.InitLogger()
	defer logger.Sync()

	logger.Log.Info("Starting SecureTalk server")

	// Config
	cfg := configs.LoadConfig()

	// DB
	db := repository.NewPostgresDB(cfg, logger.Log)
	defer db.Close()

	logger.Log.Info("Database connected")

	// Graceful shutdown
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
