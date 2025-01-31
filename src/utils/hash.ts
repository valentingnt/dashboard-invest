/**
 * Utility function to hash passwords using Web Crypto API with SHA-256
 * @param password - The password to hash
 * @returns A promise that resolves to the hashed password as a hex string
 */
export async function hashPassword(password: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(password)
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', msgUint8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('')
} 