/* eslint-disable @typescript-eslint/no-explicit-any */
// utils/auth.ts
import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';

// Interface for decoded token
interface DecodedToken {
  role: string;
  userId: string;
  [key: string]: any; // Allow other properties
}

// Interface for the return type of getUserIdFromSocket


const SECRET_KEY = 'Aloyebolu.123'; // In production, use: process.env.JWT_SECRET_KEY as string

export function decodeToken(token: string): DecodedToken | null {
  try {
    const decoded = jwt.verify(token, SECRET_KEY) as DecodedToken;
    return decoded;
  } catch (err) {
    console.error("❌ Invalid or expired token:", err);
    console.log("The token is", token, SECRET_KEY);
    return null;
  }
}

export function getUserIdFromSocket(socket: Socket): any {
  const rawToken = socket.handshake.auth?.token || '';
  console.log(rawToken)
  // Handle 'Bearer <token>' format
  const token = rawToken.startsWith('Bearer ') ? rawToken.split(' ')[1] : rawToken;
  if (!token) {
    console.error("❌ WebSocket auth: Token missing");
    return null;
  }

  const decoded = decodeToken(token);
  if (!decoded) return null;

  const overrideUserId = socket.handshake.headers?.['x-user-override'] as string | undefined;
  const effectiveUserId = decoded.role === 'admin' && overrideUserId 
    ? overrideUserId 
    : decoded.userId;

  if (overrideUserId && decoded.role === "admin") {
    console.log(`🔐 Admin override via WebSocket: ${decoded.userId} as ${overrideUserId}`);
  }

  return {
    userId: effectiveUserId,
    token
  };
}