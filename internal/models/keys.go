package models

import "time"

type DeviceKey struct {
	ID       string `json:"id" db:"id"`
	UserID   string `json:"user_id" db:"user_id"`
	DeviceID string `json:"device_id" db:"device_id"`

	IdentityKeyPublic     string `json:"identity_key_public" db:"identity_key_public"`
	SignedPreKeyPublic    string `json:"signed_prekey_public" db:"signed_prekey_public"`
	SignedPreKeySignature string `json:"signed_prekey_signature" db:"signed_prekey_signature"`

	Active bool `json:"active" db:"active"`

	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

type OneTimePreKey struct {
	ID          string `json:"id" db:"id"`
	DeviceKeyID string `json:"device_key_id" db:"device_key_id"`

	KeyID     int    `json:"key_id" db:"key_id"`
	PublicKey string `json:"public_key" db:"public_key"`

	Used   bool       `json:"used" db:"used"`
	UsedAt *time.Time `json:"used_at,omitempty" db:"used_at"`

	CreatedAt time.Time `json:"created_at" db:"created_at"`
}
