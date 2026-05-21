/**
 * AES-256-GCM symmetric encryption for sensitive fields stored in the DB.
 *
 * Requires env var: OAUTH_TOKEN_ENCRYPTION_KEY — a 64-character hex string
 * representing 32 bytes. Generate with:
 *   openssl rand -hex 32
 *
 * Encrypted format (colon-delimited, all segments base64):
 *   <iv>:<authTag>:<ciphertext>
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const ALGORITHM  = "aes-256-gcm"
const IV_BYTES   = 12   // 96-bit IV (recommended for GCM)
const TAG_BYTES  = 16   // 128-bit authentication tag

function getKey(): Buffer {
  const hex = process.env.OAUTH_TOKEN_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error(
      "OAUTH_TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). " +
      "Generate one with: openssl rand -hex 32"
    )
  }
  return Buffer.from(hex, "hex")
}

/**
 * Encrypt a plaintext string.
 * Returns a colon-separated base64 string: "<iv>:<authTag>:<ciphertext>"
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv  = randomBytes(IV_BYTES)

  const cipher    = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag   = cipher.getAuthTag()

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":")
}

/**
 * Decrypt a string previously encrypted with encrypt().
 * Throws if the format is invalid or the auth tag doesn't match (tampered data).
 */
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(":")
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted format — expected '<iv>:<authTag>:<ciphertext>'")
  }

  const [ivB64, tagB64, encB64] = parts
  const key      = getKey()
  const iv       = Buffer.from(ivB64,  "base64")
  const authTag  = Buffer.from(tagB64, "base64")
  const encrypted = Buffer.from(encB64, "base64")

  if (iv.length !== IV_BYTES) {
    throw new Error("Invalid IV length in encrypted payload")
  }
  if (authTag.length !== TAG_BYTES) {
    throw new Error("Invalid auth tag length in encrypted payload")
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
}
