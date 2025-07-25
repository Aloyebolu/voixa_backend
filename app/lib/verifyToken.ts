import jwt from 'jsonwebtoken';

const SECRET_KEY = 'your_secret_key'; // Use environment variable in production

export function extractUserIdFromToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, SECRET_KEY) as { userId: string; email: string };
    return decoded.userId; // Extracts the userId from the decoded token
  } catch (err) {
    console.error('❌ Invalid or expired token:', err);
    return null;
  }
}
