package configs

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string

	ServerPort string
	JWTSecret  string

	LogLevel    string
	LogEncoding string

	TLSCertFile string
	TLSKeyFile  string
}

func LoadConfig() *Config {
	_ = godotenv.Load()

	return &Config{
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "postgres"),
		DBName:     getEnv("DB_NAME", "securetalk"),

		ServerPort: getEnv("SERVER_PORT", "50051"),
		JWTSecret:  getEnv("JWT_SECRET", "secret"),

		LogLevel:    getEnv("LOG_LEVEL", "debug"),
		LogEncoding: getEnv("LOG_ENCODING", "json"),

		TLSCertFile: getEnv("TLS_CERT_FILE", "certs/server.crt"),
		TLSKeyFile:  getEnv("TLS_KEY_FILE", "certs/server.key"),
	}
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
