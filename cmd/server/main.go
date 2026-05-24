package main

import (
	"context"
	"fmt"
	"net"
	"os/signal"
	"syscall"

	"Server/configs"

	authpb "Server/gen/auth"
	chatpb "Server/gen/chat"
	contactpb "Server/gen/contact"

	internalgrpc "Server/internal/grpc"
	"Server/internal/logger"
	"Server/internal/middleware"
	"Server/internal/repository"
	"Server/internal/service"

	"go.uber.org/zap"
	grpcserver "google.golang.org/grpc"
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

	if err := repository.RunMigrations(
		logger.Log,
		dsn,
	); err != nil {
		logger.Log.Fatal(
			"Failed to run migrations",
			zap.Error(err),
		)
	}

	db := repository.NewPostgresDB(
		cfg,
		logger.Log,
	)
	defer db.Close()

	logger.Log.Info("Database connected")

	// Repositories
	userRepo := repository.NewUserRepository(db)
	contactRepo := repository.NewContactRepository(db)
	chatRepo := repository.NewChatRepository(db)

	// Services
	authService := service.NewAuthService(
		userRepo,
		cfg.JWTSecret,
	)

	userService := service.NewUserService(
		userRepo,
	)

	contactService := service.NewContactService(
		contactRepo,
	)

	chatService := service.NewChatService(
		chatRepo,
	)

	// gRPC Servers
	authServer := internalgrpc.NewAuthServer(
		authService,
	)

	userServer := internalgrpc.NewUserServer(
		userService,
	)

	contactServer := internalgrpc.NewContactServer(
		contactService,
	)

	chatServer := internalgrpc.NewChatServer(
		chatService,
	)

	lis, err := net.Listen(
		"tcp",
		":"+cfg.ServerPort,
	)
	if err != nil {
		logger.Log.Fatal(
			"Failed to listen",
			zap.Error(err),
		)
	}

	grpcServer := grpcserver.NewServer(
		grpcserver.UnaryInterceptor(
			middleware.AuthInterceptor(
				cfg.JWTSecret,
			),
		),
	)

	// Auth
	authpb.RegisterAuthServiceServer(
		grpcServer,
		authServer,
	)

	// User
	authpb.RegisterUserServiceServer(
		grpcServer,
		userServer,
	)

	// Contacts
	contactpb.RegisterContactServiceServer(
		grpcServer,
		contactServer,
	)

	// Chats
	chatpb.RegisterChatServiceServer(
		grpcServer,
		chatServer,
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
