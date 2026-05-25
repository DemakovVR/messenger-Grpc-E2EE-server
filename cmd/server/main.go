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
	filepb "Server/gen/file"
	keyspb "Server/gen/keys"
	messagepb "Server/gen/message"

	internalgrpc "Server/internal/grpc"
	"Server/internal/logger"
	"Server/internal/middleware"
	"Server/internal/repository"
	"Server/internal/service"
	tlsutil "Server/internal/tls"

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

	if err := repository.RunMigrations(logger.Log, dsn); err != nil {
		logger.Log.Fatal("Failed to run migrations", zap.Error(err))
	}

	db := repository.NewPostgresDB(cfg, logger.Log)
	defer db.Close()

	logger.Log.Info("Database connected")

	userRepo := repository.NewUserRepository(db)
	contactRepo := repository.NewContactRepository(db)
	chatRepo := repository.NewChatRepository(db)
	messageRepo := repository.NewMessageRepository(db)
	keysRepo := repository.NewKeysRepository(db)
	fileRepo := repository.NewFileRepository()

	authService := service.NewAuthService(userRepo, cfg.JWTSecret)
	userService := service.NewUserService(userRepo)
	contactService := service.NewContactService(contactRepo)
	chatService := service.NewChatService(chatRepo)
	connectionManager := service.NewConnectionManager()
	messageService := service.NewMessageService(messageRepo, connectionManager)
	keysService := service.NewKeysService(keysRepo)
	fileService := service.NewFileService()

	authServer := internalgrpc.NewAuthServer(authService)
	userServer := internalgrpc.NewUserServer(userService)
	contactServer := internalgrpc.NewContactServer(contactService)
	chatServer := internalgrpc.NewChatServer(chatService)
	messageServer := internalgrpc.NewMessageServer(messageService)
	keysServer := internalgrpc.NewKeysServer(keysService)
	fileServer := internalgrpc.NewFileServer(fileService, fileRepo)

	lis, err := net.Listen("tcp", ":"+cfg.ServerPort)
	if err != nil {
		logger.Log.Fatal("Failed to listen", zap.Error(err))
	}

	creds, err := tlsutil.LoadTLSCredentials(
		cfg.TLSCertFile,
		cfg.TLSKeyFile,
	)

	if err != nil {
		logger.Log.Fatal(
			"Failed to load TLS certificates",
			zap.Error(err),
		)
	}

	grpcServer := grpcserver.NewServer(
		grpcserver.Creds(creds),

		grpcserver.UnaryInterceptor(
			middleware.AuthInterceptor(cfg.JWTSecret),
		),
	)

	authpb.RegisterAuthServiceServer(grpcServer, authServer)
	authpb.RegisterUserServiceServer(grpcServer, userServer)

	contactpb.RegisterContactServiceServer(grpcServer, contactServer)
	chatpb.RegisterChatServiceServer(grpcServer, chatServer)

	messagepb.RegisterMessageServiceServer(grpcServer, messageServer)

	keyspb.RegisterKeyServiceServer(grpcServer, keysServer)
	filepb.RegisterFileServiceServer(grpcServer, fileServer)

	if err := fileService.EnsureStorage(); err != nil {
		logger.Log.Fatal(
			"failed to create storage",
			zap.Error(err),
		)
	}

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
			logger.Log.Fatal("gRPC server failed", zap.Error(err))
		}
	}()

	<-ctx.Done()

	logger.Log.Info("Shutting down server...")

	grpcServer.GracefulStop()

	logger.Log.Info("Server stopped")
}
