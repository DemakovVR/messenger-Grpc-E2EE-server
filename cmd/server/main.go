package main

import (
	"context"
	"fmt"
	"net"
	"net/http"
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

	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	grpcserver "google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
)

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

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

	if err := repository.RunMigrations(logger.Log, dsn); err != nil {
		logger.Log.Fatal("Failed migrations", zap.Error(err))
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
	auditRepo := repository.NewAuditRepository(db)
	refreshRepo := repository.NewRefreshRepository(db)

	auditService := service.NewAuditService(auditRepo)
	refreshService := service.NewRefreshService()
	rateLimiter := service.NewRateLimiter()

	authService := service.NewAuthService(
		userRepo,
		refreshRepo,
		auditService,
		refreshService,
		cfg.JWTSecret,
	)

	userService := service.NewUserService(userRepo, refreshRepo)
	contactService := service.NewContactService(contactRepo)
	chatService := service.NewChatService(chatRepo)
	connectionManager := service.NewConnectionManager()
	messageService := service.NewMessageService(messageRepo, connectionManager)
	keysService := service.NewKeysService(keysRepo)
	fileService := service.NewFileService(fileRepo)

	authServer := internalgrpc.NewAuthServer(authService, userService)
	userServer := internalgrpc.NewUserServer(userService)
	contactServer := internalgrpc.NewContactServer(contactService)
	chatServer := internalgrpc.NewChatServer(chatService)
	messageServer := internalgrpc.NewMessageServer(messageService)
	keysServer := internalgrpc.NewKeysServer(keysService)
	fileServer := internalgrpc.NewFileServer(fileService)

	auditMiddleware := middleware.NewAuditMiddleware(auditRepo)

	creds, err := tlsutil.LoadTLSCredentials(cfg.TLSCertFile, cfg.TLSKeyFile)
	if err != nil {
		logger.Log.Fatal("TLS error", zap.Error(err))
	}

	lis, err := net.Listen("tcp", ":"+cfg.ServerPort)
	if err != nil {
		logger.Log.Fatal("Listen error", zap.Error(err))
	}

	grpcServer := grpcserver.NewServer(
		grpcserver.Creds(creds),
		grpcserver.ChainUnaryInterceptor(
			middleware.AuthInterceptor(cfg.JWTSecret),
			middleware.RateLimitInterceptor(rateLimiter),
			auditMiddleware.Unary(),
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
		logger.Log.Fatal("storage error", zap.Error(err))
	}

	go func() {
		ctx := context.Background()

		mux := runtime.NewServeMux()

		creds, err := credentials.NewClientTLSFromFile(cfg.TLSCertFile, "")
		if err != nil {
			logger.Log.Fatal("failed to load TLS cert for gateway", zap.Error(err))
		}

		opts := []grpc.DialOption{
			grpc.WithTransportCredentials(creds),
		}

		err = authpb.RegisterAuthServiceHandlerFromEndpoint(
			ctx,
			mux,
			"localhost:"+cfg.ServerPort,
			opts,
		)
		if err != nil {
			logger.Log.Fatal("gateway error", zap.Error(err))
		}

		err = chatpb.RegisterChatServiceHandlerFromEndpoint(
			ctx,
			mux,
			"localhost:"+cfg.ServerPort,
			opts,
		)
		if err != nil {
			logger.Log.Fatal("gateway error", zap.Error(err))
		}

		err = messagepb.RegisterMessageServiceHandlerFromEndpoint(
			ctx,
			mux,
			"localhost:"+cfg.ServerPort,
			opts,
		)
		if err != nil {
			logger.Log.Fatal("gateway error", zap.Error(err))
		}

		err = contactpb.RegisterContactServiceHandlerFromEndpoint(
			ctx,
			mux,
			"localhost:"+cfg.ServerPort,
			opts,
		)
		if err != nil {
			logger.Log.Fatal("gateway error", zap.Error(err))
		}

		err = filepb.RegisterFileServiceHandlerFromEndpoint(
			ctx,
			mux,
			"localhost:"+cfg.ServerPort,
			opts,
		)
		if err != nil {
			logger.Log.Fatal("gateway error", zap.Error(err))
		}

		err = keyspb.RegisterKeyServiceHandlerFromEndpoint(
			ctx,
			mux,
			"localhost:"+cfg.ServerPort,
			opts,
		)
		if err != nil {
			logger.Log.Fatal("gateway error", zap.Error(err))
		}

		logger.Log.Info("HTTP gateway started on :8080")

		if err := http.ListenAndServe(":8080", corsMiddleware(mux)); err != nil {
			logger.Log.Fatal("HTTP server error", zap.Error(err))
		}
	}()

	go func() {
		logger.Log.Info("gRPC server started", zap.String("port", cfg.ServerPort))

		if err := grpcServer.Serve(lis); err != nil {
			logger.Log.Fatal("gRPC failed", zap.Error(err))
		}
	}()

	ctx, stop := signal.NotifyContext(
		context.Background(),
		syscall.SIGINT,
		syscall.SIGTERM,
	)
	defer stop()

	<-ctx.Done()

	logger.Log.Info("Shutting down server...")

	grpcServer.GracefulStop()

	logger.Log.Info("Server stopped")
}
