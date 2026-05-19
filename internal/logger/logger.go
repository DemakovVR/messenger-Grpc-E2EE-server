package logger

import (
	"go.uber.org/zap"
)

var Log *zap.Logger

func InitLogger() {
	logger, err := zap.NewProduction()
	if err != nil {
		panic(err)
	}

	Log = logger
}

func Sync() {
	if Log != nil {
		_ = Log.Sync()
	}
}
