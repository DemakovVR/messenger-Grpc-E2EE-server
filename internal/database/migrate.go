package repository

import (
	_ "github.com/jackc/pgx/v5/stdlib"

	"github.com/pressly/goose/v3"
	"go.uber.org/zap"
)

func RunMigrations(log *zap.Logger, dsn string) error {
	db, err := goose.OpenDBWithDriver("pgx", dsn)
	if err != nil {
		return err
	}
	defer db.Close()

	if err := goose.SetDialect("postgres"); err != nil {
		return err
	}

	if err := goose.Up(db, "migrations"); err != nil {
		return err
	}

	log.Info("Migrations completed successfully")
	return nil
}
