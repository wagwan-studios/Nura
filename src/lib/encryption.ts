import crypto from "crypto";

const algorithm = "aes-256-gcm";

function getKey() {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error("ENCRYPTION_KEY is missing");
  }

  return Buffer.from(key, "hex");
}

export function encryptToken(value: string) {
  const iv = crypto.randomBytes(12);
  const key = getKey();

  const cipher = crypto.createCipheriv(algorithm, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptToken(value: string) {
  const data = Buffer.from(value, "base64");

  const iv = data.subarray(0, 12);
  const authTag = data.subarray(12, 28);
  const encrypted = data.subarray(28);

  const key = getKey();

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}