import crypto from 'crypto';

// Generate a random salt
export function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

// Hash password with salt using PBKDF2
export function hashPassword(password : string, salt : string) {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

// Verify password against stored hash
export function verifyPassword(inputPassword : string, storedHash : string, salt : string) {
  const inputHash = hashPassword(inputPassword, salt);
  return inputHash === storedHash;
}