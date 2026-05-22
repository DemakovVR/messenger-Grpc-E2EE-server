package main

import (
	"context"
	"fmt"
	"net"
	"os/signal"
	"syscall"

	"Server/configs"
	authpb "Server/gen/auth"
	internalgrpc "Server/internal/grpc"
	"Server/internal/logger"
	"Server/internal/repository"
	"Server/internal/service"

	"go.uber.org/zap"
	"google.golang.org/grpc"
)

func main() {
	cfg := configs.LoadConfig()

	logger.InitLogger(cfg.LogLevel, cfg.LogEncoding)
	defer logger.Sync()

	logger.Log.Info("Starting SecureTalk gRPC server")

	dsn := fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=disable",
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBHost,
		cfg.DBPort,
		cfg.DBName,
	)

	// Миграции
	if err := repository.RunMigrations(logger.Log, dsn); err != nil {
		logger.Log.Fatal("Failed to run migrations", zap.Error(err))
	}

	// База данных
	db := repository.NewPostgresDB(cfg, logger.Log)
	defer db.Close()

	logger.Log.Info("Database connected")

	// Repository
	userRepo := repository.NewUserRepository(db)

	// Service
	authService := service.NewAuthService(
		userRepo,
		cfg.JWTSecret,
	)

	// gRPC Auth Server
	authServer := internalgrpc.NewAuthServer(
		authService,
	)

	// Listener
	lis, err := net.Listen("tcp", ":"+cfg.ServerPort)
	if err != nil {
		logger.Log.Fatal("Failed to listen", zap.Error(err))
	}

	// gRPC Server
	grpcServer := grpc.NewServer()

	authpb.RegisterAuthServiceServer(
		grpcServer,
		authServer,
	)

	ctx, stop := signal.NotifyContext(
		context.Background(),
		syscall.SIGINT,
		syscall.SIGTERM,
	)
	defer stop()

	go func() {
		logger.Log.Info(
			"gRPC server started",
			zap.String("port", cfg.ServerPort),
		)

		if err := grpcServer.Serve(lis); err != nil {
			logger.Log.Fatal(
				"gRPC server failed",
				zap.Error(err),
			)
		}
	}()

	<-ctx.Done()

	logger.Log.Info("Shutting down server...")

	grpcServer.GracefulStop()

	logger.Log.Info("Server stopped")
}
