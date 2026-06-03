package repository

import (
	"Server/internal/models"
	"context"

	"github.com/google/uuid"
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
	userID uuid.UUID,
	deviceID string,
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

func (r *KeysRepository) GetDeviceKeys(
	ctx context.Context,
	userID uuid.UUID,
) (models.DeviceKey, error) {
	var k models.DeviceKey

	err := r.db.QueryRow(ctx, `
        SELECT 
            id,
            user_id, device_id,
            identity_key_public,
            signed_prekey_public,
            signed_prekey_signature,
            active,
            created_at,
            updated_at
        FROM device_keys
        WHERE user_id = $1 
        AND active = true 
        AND identity_key_public != ''
        AND signed_prekey_public != ''
        ORDER BY created_at DESC
        LIMIT 1
    `, userID).Scan(
		&k.ID,
		&k.UserID,
		&k.DeviceID,
		&k.IdentityKeyPublic,
		&k.SignedPreKeyPublic,
		&k.SignedPreKeySignature,
		&k.Active,
		&k.CreatedAt,
		&k.UpdatedAt,
	)

	return k, err
}

func (r *KeysRepository) GetOneTimePreKey(
	ctx context.Context,
	deviceKeyID uuid.UUID,
) (models.OneTimePreKey, error) {

	var k models.OneTimePreKey

	err := r.db.QueryRow(ctx, `
		SELECT id, device_key_id, key_id, public_key, used, used_at, created_at
		FROM one_time_prekeys
		WHERE device_key_id=$1 AND used=false
		ORDER BY key_id ASC
		LIMIT 1
		FOR UPDATE SKIP LOCKED
	`, deviceKeyID).Scan(
		&k.ID, &k.DeviceKeyID, &k.KeyID, &k.PublicKey, &k.Used, &k.UsedAt, &k.CreatedAt,
	)

	return k, err
}

func (r *KeysRepository) MarkOneTimePreKeyUsed(
	ctx context.Context,
	id uuid.UUID,
) error {

	_, err := r.db.Exec(ctx, `
		UPDATE one_time_prekeys
		SET used=true, used_at=NOW()
		WHERE id=$1
	`, id)

	return err
}

func (r *KeysRepository) SaveOTPKs(
	ctx context.Context,
	deviceKeyID uuid.UUID,
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

func (r *KeysRepository) UpdateSignedPreKey(
	ctx context.Context,
	userID uuid.UUID,
	deviceID string,
	publicKey string,
	signature string,
) error {

	_, err := r.db.Exec(ctx, `
		UPDATE device_keys
		SET
			signed_prekey_public = $1,
			signed_prekey_signature = $2,
			updated_at = NOW()
		WHERE user_id = $3
		AND device_id = $4
	`,
		publicKey,
		signature,
		userID,
		deviceID,
	)

	return err
}

func (r *KeysRepository) GetDeviceKeyIDByUserID(
	ctx context.Context,
	userID uuid.UUID,
) (uuid.UUID, error) {
	var deviceKeyID uuid.UUID
	err := r.db.QueryRow(ctx, `
        SELECT id FROM device_keys
		WHERE user_id = $1 AND active = true
		ORDER BY created_at
		DESC LIMIT 1
    `, userID).Scan(&deviceKeyID)
	return deviceKeyID, err
}
