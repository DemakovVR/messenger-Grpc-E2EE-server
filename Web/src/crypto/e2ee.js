import CryptoJS from "crypto-js";

export function generateKeyPair() {
  const privateKey = CryptoJS.lib.WordArray.random(32).toString();
  const publicKey = CryptoJS.enc.Base64.stringify(
    CryptoJS.SHA256(privateKey)
  );
  return { privateKey, publicKey };
}

export function deriveSharedSecret(privateKey, peerPublicKey) {
  return CryptoJS.SHA256(privateKey + peerPublicKey).toString();
}

export function encryptMessage(sharedSecret, message) {
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(message, sharedSecret, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return {
    ciphertext: encrypted.toString(),
    iv: CryptoJS.enc.Base64.stringify(iv),
  };
}

export function decryptMessage(sharedSecret, ciphertext, ivBase64) {
  const iv = CryptoJS.enc.Base64.parse(ivBase64);
  const decrypted = CryptoJS.AES.decrypt(ciphertext, sharedSecret, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
}

export function getOrCreateKeys() {
  let privateKey = localStorage.getItem("e2ee_private_key");
  let publicKey = localStorage.getItem("e2ee_public_key");

  if (!privateKey || !publicKey) {
    const keys = generateKeyPair();
    privateKey = keys.privateKey;
    publicKey = keys.publicKey;
    localStorage.setItem("e2ee_private_key", privateKey);
    localStorage.setItem("e2ee_public_key", publicKey);
  }

  return { privateKey, publicKey };
}

export async function publishPublicKey() {
  const { publicKey } = getOrCreateKeys();
  const token = localStorage.getItem("access_token");

  try {
    const response = await fetch("/api/keys/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ publicKey: publicKey }),
    });
    return response.ok;
  } catch (error) {
    console.error("Failed to publish public key:", error);
    return false;
  }
}

export async function fetchUserPublicKey(userId) {
  const token = localStorage.getItem("access_token");

  try {
    const response = await fetch(`/api/keys/user/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    return data.success ? data.publicKey : null;
  } catch (error) {
    console.error("Failed to fetch user public key:", error);
    return null;
  }
}

export function getSharedSecret(peerUserId) {
  const { privateKey } = getOrCreateKeys();
  const peerPublicKey = localStorage.getItem(`e2ee_public_key_${peerUserId}`);

  if (!peerPublicKey) {
    return null;
  }

  return deriveSharedSecret(privateKey, peerPublicKey);
}

export async function ensureSharedSecret(peerUserId) {
  let peerPublicKey = localStorage.getItem(`e2ee_public_key_${peerUserId}`);

  if (!peerPublicKey) {
    peerPublicKey = await fetchUserPublicKey(peerUserId);
    if (peerPublicKey) {
      localStorage.setItem(`e2ee_public_key_${peerUserId}`, peerPublicKey);
    } else {
      return null;
    }
  }

  const { privateKey } = getOrCreateKeys();
  return deriveSharedSecret(privateKey, peerPublicKey);
}