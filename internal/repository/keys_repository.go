package repository

import (
	"Server/internal/models"
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type KeysRepository struct {
	db *pgxpool.Pool
}

func NewKeysRepository(db *pgxpool.Pool) *KeysRepository {
	return &KeysRepository{db: db}
}

func (r *KeysRepository) SaveDeviceKeys(
	ctx context.Context,
	userID, deviceID string,
	identity, prekey, signature string,
) error {

	_, err := r.db.Exec(ctx, `
		INSERT INTO device_keys (
			user_id, device_id,
			identity_key_public,
			signed_prekey_public,
			signed_prekey_signature
		)
		VALUES ($1,$2,$3,$4,$5)
		ON CONFLICT (user_id, device_id)
		DO UPDATE SET
			identity_key_public = EXCLUDED.identity_key_public,
			signed_prekey_public = EXCLUDED.signed_prekey_public,
			signed_prekey_signature = EXCLUDED.signed_prekey_signature,
			updated_at = NOW()
	`,
		userID, deviceID, identity, prekey, signature,
	)

	return err
}

func (r *KeysRepository) GetDeviceKeys(ctx context.Context, userID string) (models.DeviceKey, error) {
	var k models.DeviceKey

	err := r.db.QueryRow(ctx, `
		SELECT user_id, device_id,
		       identity_key_public,
		       signed_prekey_public,
		       signed_prekey_signature
		FROM device_keys
		WHERE user_id=$1 AND active=true
		LIMIT 1
	`, userID).Scan(
		&k.UserID,
		&k.DeviceID,
		&k.IdentityKeyPublic,
		&k.SignedPreKeyPublic,
		&k.SignedPreKeySignature,
	)

	return k, err
}

func (r *KeysRepository) GetOneTimePreKey(ctx context.Context, deviceKeyID string) (models.OneTimePreKey, error) {
	var k models.OneTimePreKey

	err := r.db.QueryRow(ctx, `
		SELECT id, key_id, public_key
		FROM one_time_prekeys
		WHERE device_key_id=$1 AND used=false
		ORDER BY key_id ASC
		LIMIT 1
	`, deviceKeyID).Scan(
		&k.ID,
		&k.KeyID,
		&k.PublicKey,
	)

	return k, err
}

func (r *KeysRepository) MarkOneTimePreKeyUsed(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE one_time_prekeys
		SET used=true, used_at=NOW()
		WHERE id=$1
	`, id)

	return err
}

func (r *KeysRepository) SaveOTPKs(
	ctx context.Context,
	deviceKeyID string,
	keys []models.OneTimePreKey,
) error {

	for _, k := range keys {
		_, err := r.db.Exec(ctx, `
			INSERT INTO one_time_prekeys (
				device_key_id,
				key_id,
				public_key
			)
			VALUES ($1,$2,$3)
			ON CONFLICT (device_key_id, key_id)
			DO NOTHING
		`, deviceKeyID, k.KeyID, k.PublicKey)

		if err != nil {
			return err
		}
	}

	return nil
}
