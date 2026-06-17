package main

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"net/http"
	"os/exec"
	"os/signal"
	"syscall"
	"time"

	"Server/configs"

	auditpb "Server/gen/audit"
	authpb "Server/gen/auth"
	chatpb "Server/gen/chat"
	contactpb "Server/gen/contact"
	filepb "Server/gen/file"
	keyspb "Server/gen/keys"
	messagepb "Server/gen/message"

	"Server/internal/audit"
	"Server/internal/auth"
	"Server/internal/chat"
	"Server/internal/contact"
	repository "Server/internal/database"
	"Server/internal/file"
	"Server/internal/keys"
	"Server/internal/logger"
	"Server/internal/message"
	"Server/internal/middleware"

	tlsutil "Server/internal/tls"
	stdruntime "runtime"

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
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, Authorization, Origin, X-Requested-With, Content-Transfer-Encoding")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func maxBytesMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, 105*1024*1024)
		next.ServeHTTP(w, r)
	})
}

func main() {
	cfg := configs.LoadConfig()

	if conn, err := net.Dial("tcp", ":8080"); err == nil {
		conn.Close()
		if stdruntime.GOOS == "windows" {
			exec.Command("powershell", "-Command", "Stop-Process -Id (Get-NetTCPConnection -LocalPort 8080).OwningProcess -Force").Run()
			time.Sleep(1 * time.Second)
		}
	}

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

	userRepo := auth.NewUserRepository(db)
	contactRepo := contact.NewContactRepository(db)
	chatRepo := chat.NewChatRepository(db)
	messageRepo := message.NewMessageRepository(db)
	keysRepo := keys.NewKeysRepository(db)
	fileRepo := file.NewFileRepository(db)
	auditRepo := audit.NewAuditRepository(db)
	refreshRepo := auth.NewRefreshRepository(db)

	auditService := audit.NewAuditService(auditRepo)
	refreshService := auth.NewRefreshService()
	rateLimiter := middleware.NewRateLimiter()

	authService := auth.NewAuthService(
		userRepo,
		refreshRepo,
		auditService,
		refreshService,
		cfg.JWTSecret,
	)

	userService := auth.NewUserService(userRepo, refreshRepo)
	contactService := contact.NewContactService(contactRepo)
	chatService := chat.NewChatService(chatRepo)
	connectionManager := message.NewConnectionManager()
	messageService := message.NewMessageService(messageRepo, connectionManager, auditService)
	keysService := keys.NewKeysService(keysRepo)
	fileService := file.NewFileService(fileRepo)

	authServer := auth.NewAuthServer(authService, userService)
	userServer := auth.NewUserServer(userService)
	contactServer := contact.NewContactServer(contactService)
	chatServer := chat.NewChatServer(chatService)
	messageServer := message.NewMessageServer(messageService)
	keysServer := keys.NewKeysServer(keysService)
	fileServer := file.NewFileServer(fileService)
	auditServer := audit.NewAuditServer(auditService)
	auditMiddleware := middleware.NewAuditMiddleware(auditRepo)

	creds, err := tlsutil.LoadTLSCredentials(cfg.TLSCertFile, cfg.TLSKeyFile)
	if err != nil {
		logger.Log.Fatal("TLS error", zap.Error(err))
	}

	lis, err := net.Listen("tcp", ":"+cfg.ServerPort)
	if err != nil {
		logger.Log.Fatal("Listen error", zap.Error(err))
	}

	const maxMsgSize = 105 * 1024 * 1024

	grpcServer := grpcserver.NewServer(
		grpcserver.Creds(creds),
		grpc.MaxRecvMsgSize(maxMsgSize),
		grpc.MaxSendMsgSize(maxMsgSize),
		grpc.StreamInterceptor(middleware.AuthStreamInterceptor(cfg.JWTSecret)),
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
	auditpb.RegisterAuditServiceServer(grpcServer, auditServer)
	if err := fileService.EnsureStorage(); err != nil {
		logger.Log.Fatal("storage error", zap.Error(err))
	}

	go func() {
		ctx := context.Background()

		mux := runtime.NewServeMux()

		opts := []grpc.DialOption{
			grpc.WithTransportCredentials(credentials.NewTLS(&tls.Config{
				InsecureSkipVerify: true,
			})),
			grpc.WithDefaultCallOptions(
				grpc.MaxCallRecvMsgSize(maxMsgSize),
				grpc.MaxCallSendMsgSize(maxMsgSize),
			),
		}

		err = authpb.RegisterAuthServiceHandlerFromEndpoint(ctx, mux, "localhost:"+cfg.ServerPort, opts)
		if err != nil {
			logger.Log.Fatal("gateway error", zap.Error(err))
		}

		err = authpb.RegisterUserServiceHandlerFromEndpoint(ctx, mux, "localhost:"+cfg.ServerPort, opts)
		if err != nil {
			logger.Log.Fatal("gateway error", zap.Error(err))
		}

		err = chatpb.RegisterChatServiceHandlerFromEndpoint(ctx, mux, "localhost:"+cfg.ServerPort, opts)
		if err != nil {
			logger.Log.Fatal("gateway error", zap.Error(err))
		}

		err = messagepb.RegisterMessageServiceHandlerFromEndpoint(ctx, mux, "localhost:"+cfg.ServerPort, opts)
		if err != nil {
			logger.Log.Fatal("gateway error", zap.Error(err))
		}

		err = contactpb.RegisterContactServiceHandlerFromEndpoint(ctx, mux, "localhost:"+cfg.ServerPort, opts)
		if err != nil {
			logger.Log.Fatal("gateway error", zap.Error(err))
		}

		err = filepb.RegisterFileServiceHandlerFromEndpoint(ctx, mux, "localhost:"+cfg.ServerPort, opts)
		if err != nil {
			logger.Log.Fatal("gateway error", zap.Error(err))
		}

		err = keyspb.RegisterKeyServiceHandlerFromEndpoint(ctx, mux, "localhost:"+cfg.ServerPort, opts)
		if err != nil {
			logger.Log.Fatal("gateway error", zap.Error(err))
		}

		err = auditpb.RegisterAuditServiceHandlerFromEndpoint(ctx, mux, "localhost:"+cfg.ServerPort, opts)
		if err != nil {
			logger.Log.Fatal("gateway error", zap.Error(err))
		}

		logger.Log.Info("HTTP gateway started on :8080")

		handlerChain := corsMiddleware(maxBytesMiddleware(mux))
		if err := http.ListenAndServe(":8080", handlerChain); err != nil {
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
