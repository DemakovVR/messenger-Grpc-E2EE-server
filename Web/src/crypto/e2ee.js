function getUserIdFromToken() {
  try {
    const token = localStorage.getItem("access_token");
    if (!token) return "";
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    return payload.user_id || payload.id || payload.sub || "";
  } catch (e) {
    return "";
  }
}

export async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );
  
  const publicKey = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const privateKey = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  
  return {
    privateKey: btoa(String.fromCharCode(...new Uint8Array(privateKey))),
    publicKey: btoa(String.fromCharCode(...new Uint8Array(publicKey)))
  };
}

export async function generateSignedPreKey() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );
  
  const publicKey = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const privateKey = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  
  return {
    privateKey: btoa(String.fromCharCode(...new Uint8Array(privateKey))),
    publicKey: btoa(String.fromCharCode(...new Uint8Array(publicKey))),
    cryptoKeyPair: keyPair
  };
}

export async function generateOneTimePreKeys(count = 20) {
  const keys = [];
  for (let i = 1; i <= count; i++) {
    const keyPair = await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveKey", "deriveBits"]
    );
    const publicKey = await crypto.subtle.exportKey("spki", keyPair.publicKey);
    const publicKeyB64 = btoa(String.fromCharCode(...new Uint8Array(publicKey)));
    
    keys.push({ keyId: i, publicKey: publicKeyB64 });
  }
  return keys;
}

export async function signWithIdentityKey(privateKeyB64, dataString) {
  const privateKeyBytes = Uint8Array.from(atob(privateKeyB64), c => c.charCodeAt(0));
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBytes.buffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(dataString);
  
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    privateKey,
    dataBytes
  );
  
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export async function verifySignature(publicKeyB64, dataString, signatureB64) {
  try {
    const publicKeyBytes = Uint8Array.from(atob(publicKeyB64), c => c.charCodeAt(0));
    const publicKey = await crypto.subtle.importKey(
      "spki",
      publicKeyBytes.buffer,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    );
    
    const signatureBytes = Uint8Array.from(atob(signatureB64), c => c.charCodeAt(0));
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(dataString);
    
    return await crypto.subtle.verify(
      { name: "ECDSA", hash: { name: "SHA-256" } },
      publicKey,
      signatureBytes,
      dataBytes
    );
  } catch (error) {
    return false;
  }
}

export function getOrCreateDeviceId() {
  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    const randomBuffer = new Uint8Array(16);
    crypto.getRandomValues(randomBuffer);
    deviceId = Array.from(randomBuffer, b => b.toString(16).padStart(2, "0")).join("");
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
}

export async function generateEphemeralKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );
  
  const publicKey = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const publicKeyB64 = btoa(String.fromCharCode(...new Uint8Array(publicKey)));
  
  return {
    privateKey: null,
    publicKey: publicKeyB64,
    cryptoKeyPair: keyPair
  };
}

export async function encryptMessageForPeer(peerUserId, message, forceRefresh = false) {
  const currentUserId = getUserIdFromToken();
  const ephemeralPeer = await generateEphemeralKeyPair();
  
  let peerSignedPrekeyPublic = localStorage.getItem(`e2eePeerSignedPrekey_${peerUserId}`);
  let peerIdentityKeyPublic = localStorage.getItem(`e2eePeerIdentityKey_${peerUserId}`);
  let peerSignedPrekeySignature = localStorage.getItem(`e2eePeerSignature_${peerUserId}`);
  
  if (forceRefresh || !peerSignedPrekeyPublic) {
    const bundle = await fetchPreKeyBundle(peerUserId);
    if (!bundle || !bundle.signedPrekeyPublic) return null;
    
    peerSignedPrekeyPublic = bundle.signedPrekeyPublic;
    peerIdentityKeyPublic = bundle.identityKeyPublic;
    peerSignedPrekeySignature = bundle.signedPrekeySignature;
    
    localStorage.setItem(`e2eePeerSignedPrekey_${peerUserId}`, peerSignedPrekeyPublic);
    if (peerIdentityKeyPublic) localStorage.setItem(`e2eePeerIdentityKey_${peerUserId}`, peerIdentityKeyPublic);
    if (peerSignedPrekeySignature) localStorage.setItem(`e2eePeerSignature_${peerUserId}`, peerSignedPrekeySignature);
  }
  
  if (peerIdentityKeyPublic && peerSignedPrekeySignature) {
    const isSignatureValid = await verifySignature(peerIdentityKeyPublic, peerSignedPrekeyPublic, peerSignedPrekeySignature);
    if (!isSignatureValid) {
      localStorage.removeItem(`e2eePeerSignedPrekey_${peerUserId}`);
      return null;
    }
  }
  
  const peerPublicKeyBytes = Uint8Array.from(atob(peerSignedPrekeyPublic), c => c.charCodeAt(0));
  const peerPublicCryptoKey = await crypto.subtle.importKey(
    "spki", peerPublicKeyBytes.buffer, { name: "ECDH", namedCurve: "P-256" }, false, []
  );
  
  const sharedBitsPeer = await crypto.subtle.deriveBits(
    { name: "ECDH", public: peerPublicCryptoKey }, ephemeralPeer.cryptoKeyPair.privateKey, 256
  );
  const sharedSecretPeer = await crypto.subtle.digest("SHA-256", sharedBitsPeer);
  const ivPeer = crypto.getRandomValues(new Uint8Array(12));
  const aesKeyPeer = await crypto.subtle.importKey(
    "raw", sharedSecretPeer, { name: "AES-GCM", length: 256 }, false, ["encrypt"]
  );
  
  const encodedMessage = new TextEncoder().encode(message);
  const encryptedPeer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ivPeer }, aesKeyPeer, encodedMessage
  );

  const mySignedPrekeyPublic = localStorage.getItem(`e2ee_${currentUserId}_SignedPrekeyPublic`) || localStorage.getItem("e2eeSignedPrekeyPublic");
  let encryptedSelfB64 = null;
  let ivSelfB64 = null;
  let ephemeralPublicKeySelfB64 = null;

  if (mySignedPrekeyPublic) {
    try {
      const ephemeralSelf = await generateEphemeralKeyPair();
      const myPublicKeyBytes = Uint8Array.from(atob(mySignedPrekeyPublic), c => c.charCodeAt(0));
      const myPublicCryptoKey = await crypto.subtle.importKey(
        "spki", myPublicKeyBytes.buffer, { name: "ECDH", namedCurve: "P-256" }, false, []
      );
      
      const sharedBitsSelf = await crypto.subtle.deriveBits(
        { name: "ECDH", public: myPublicCryptoKey }, ephemeralSelf.cryptoKeyPair.privateKey, 256
      );
      const sharedSecretSelf = await crypto.subtle.digest("SHA-256", sharedBitsSelf);
      const ivSelf = crypto.getRandomValues(new Uint8Array(12));
      const aesKeySelf = await crypto.subtle.importKey(
        "raw", sharedSecretSelf, { name: "AES-GCM", length: 256 }, false, ["encrypt"]
      );
      
      const encryptedSelf = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: ivSelf }, aesKeySelf, encodedMessage
      );

      encryptedSelfB64 = btoa(String.fromCharCode(...new Uint8Array(encryptedSelf)));
      ivSelfB64 = btoa(String.fromCharCode(...ivSelf));
      ephemeralPublicKeySelfB64 = ephemeralSelf.publicKey;
    } catch (e) {}
  }
  
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encryptedPeer))),
    iv: btoa(String.fromCharCode(...ivPeer)),
    ephemeralPublicKey: ephemeralPeer.publicKey,
    
    ciphertextForSelf: encryptedSelfB64,
    ivForSelf: ivSelfB64,
    ephemeralPublicKeyForSelf: ephemeralPublicKeySelfB64
  };
}

export async function decryptMessageFromPeer(encryptedData, myUserId, senderId) {
  const userId = myUserId || getUserIdFromToken();
  
  const isMyOwnMessage = senderId ? (userId === senderId) : false;
  
  const ciphertext = (isMyOwnMessage && encryptedData.ciphertextForSelf) 
    ? encryptedData.ciphertextForSelf 
    : encryptedData.ciphertext;
    
  const ivBase64 = (isMyOwnMessage && encryptedData.ivForSelf) 
    ? encryptedData.ivForSelf 
    : encryptedData.iv;
    
  const ephemeralPublicKey = (isMyOwnMessage && encryptedData.ephemeralPublicKeyForSelf) 
    ? encryptedData.ephemeralPublicKeyForSelf 
    : encryptedData.ephemeralPublicKey;
  
  if (!ciphertext || !ivBase64 || !ephemeralPublicKey) {
    return null;
  }
  
  let signedPrekeyCryptoKey = localStorage.getItem(`e2ee_${userId}_SignedPrekeyCryptoKey`) || localStorage.getItem("e2eeSignedPrekeyCryptoKey");
  let mySignedPrekeyPrivate;
  
  if (signedPrekeyCryptoKey) {
    try {
      mySignedPrekeyPrivate = JSON.parse(signedPrekeyCryptoKey);
    } catch(e) {
      mySignedPrekeyPrivate = null;
    }
  }
  
  if (!mySignedPrekeyPrivate) {
    const mySignedPrekeyPrivateB64 = localStorage.getItem(`e2ee_${userId}_SignedPrekeyPrivate`) || localStorage.getItem("e2eeSignedPrekeyPrivate");
    if (!mySignedPrekeyPrivateB64) {
      return null;
    }
    const privateKeyBytes = Uint8Array.from(atob(mySignedPrekeyPrivateB64), c => c.charCodeAt(0));
    mySignedPrekeyPrivate = await crypto.subtle.importKey(
      "pkcs8",
      privateKeyBytes.buffer,
      { name: "ECDH", namedCurve: "P-256" },
      false,
      ["deriveBits"]
    );
  }
  
  const ephemeralPublicBytes = Uint8Array.from(atob(ephemeralPublicKey), c => c.charCodeAt(0));
  const ephemeralPublicCryptoKey = await crypto.subtle.importKey(
    "spki",
    ephemeralPublicBytes.buffer,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  
  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: ephemeralPublicCryptoKey },
    mySignedPrekeyPrivate,
    256
  );
  
  const sharedSecret = await crypto.subtle.digest("SHA-256", sharedBits);
  
  const aesKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  
  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
  const ciphertextBuffer = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      aesKey,
      ciphertextBuffer
    );
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    return null;
  }
}

export async function publishKeys() {
  const deviceId = getOrCreateDeviceId();
  const userId = getUserIdFromToken();
  
  let identityPrivate = localStorage.getItem(`e2ee_${userId}_IdentityPrivate`) || localStorage.getItem("e2eeIdentityPrivate");
  let identityPublic = localStorage.getItem(`e2ee_${userId}_IdentityPublic`) || localStorage.getItem("e2eeIdentityPublic");
  
  if (!identityPrivate || !identityPublic) {
    const identity = await generateKeyPair();
    identityPrivate = identity.privateKey;
    identityPublic = identity.publicKey;
    if (userId) {
      localStorage.setItem(`e2ee_${userId}_IdentityPrivate`, identityPrivate);
      localStorage.setItem(`e2ee_${userId}_IdentityPublic`, identityPublic);
    }
    localStorage.setItem("e2eeIdentityPrivate", identityPrivate);
    localStorage.setItem("e2eeIdentityPublic", identityPublic);
  }
  
  let signedPrekeyPrivate = localStorage.getItem(`e2ee_${userId}_SignedPrekeyPrivate`) || localStorage.getItem("e2eeSignedPrekeyPrivate");
  let signedPrekeyPublic = localStorage.getItem(`e2ee_${userId}_SignedPrekeyPublic`) || localStorage.getItem("e2eeSignedPrekeyPublic");
  
  if (!signedPrekeyPrivate || !signedPrekeyPublic) {
    const spk = await generateSignedPreKey();
    signedPrekeyPrivate = spk.privateKey;
    signedPrekeyPublic = spk.publicKey;
    if (userId) {
      localStorage.setItem(`e2ee_${userId}_SignedPrekeyPrivate`, signedPrekeyPrivate);
      localStorage.setItem(`e2ee_${userId}_SignedPrekeyPublic`, signedPrekeyPublic);
    }
    localStorage.setItem("e2eeSignedPrekeyPrivate", signedPrekeyPrivate);
    localStorage.setItem("e2eeSignedPrekeyPublic", signedPrekeyPublic);
  }
  
  const signature = await signWithIdentityKey(identityPrivate, signedPrekeyPublic);
  
  let oneTimePrekeys = localStorage.getItem(`e2ee_${userId}_OneTimePrekeys`) || localStorage.getItem("e2eeOneTimePrekeys");
  let prekeysList = [];
  if (!oneTimePrekeys) {
    prekeysList = await generateOneTimePreKeys(20);
    if (userId) {
      localStorage.setItem(`e2ee_${userId}_OneTimePrekeys`, JSON.stringify(prekeysList));
    }
    localStorage.setItem("e2eeOneTimePrekeys", JSON.stringify(prekeysList));
  } else {
    prekeysList = JSON.parse(oneTimePrekeys);
  }
  
  const token = localStorage.getItem("access_token");
  
  try {
    const response = await fetch("/api/keys/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        deviceId: deviceId,
        identityKeyPublic: identityPublic,
        signedPrekeyPublic: signedPrekeyPublic,
        signedPrekeySignature: signature,
        oneTimePrekeys: prekeysList.map(p => ({
          keyId: p.keyId,
          publicKey: p.publicKey
        })),
      }),
    });
    
    if (!response.ok) {
      return false;
    }
    
    const publicKeyResponse = await fetch("/api/auth/me/public-key", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ public_key: identityPublic }),
    });
    
    return true;
  } catch (error) {
    return false;
  }
}

export async function fetchPreKeyBundle(userId) {
  const token = localStorage.getItem("access_token");
  
  try {
    const response = await fetch(`/api/keys/user/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await response.json();
  } catch (error) {
    return null;
  }
}