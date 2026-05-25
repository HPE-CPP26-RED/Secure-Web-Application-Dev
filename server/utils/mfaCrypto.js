const crypto = require("crypto");

const MFA_KEY_BYTES = 32;
const MFA_IV_BYTES = 12;

const getMfaKey = () => {
  const raw = process.env.MFA_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("MFA_ENCRYPTION_KEY is not set");
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== MFA_KEY_BYTES) {
    throw new Error("MFA_ENCRYPTION_KEY must be 32 bytes (base64-encoded)");
  }

  return key;
};

const encryptMfaSecret = (secret) => {
  const key = getMfaKey();
  const iv = crypto.randomBytes(MFA_IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    secretEnc: encrypted.toString("base64"),
    secretIv: iv.toString("base64"),
    secretTag: tag.toString("base64"),
  };
};

const decryptMfaSecret = ({ secretEnc, secretIv, secretTag }) => {
  const key = getMfaKey();
  const iv = Buffer.from(secretIv, "base64");
  const tag = Buffer.from(secretTag, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);

  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(secretEnc, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
};

module.exports = {
  encryptMfaSecret,
  decryptMfaSecret,
};
