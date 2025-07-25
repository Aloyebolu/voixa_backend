import jwt from "jsonwebtoken";

const SECRET = 'permit-secret-key';

export function createPermit({
  action,
  by,
  to,
  data = {},
}: {
  action: string;
  by: string;
  to: string;
  data?: Record<string, unknown>;
  expiresIn?: string | number;
}): string {
  const payload = { action, by, to, data };
  return jwt.sign(payload, SECRET, );
/**
 * To fix TypeScript errors with 'jsonwebtoken', install its types:
 * 
 *   npm install --save-dev @types/jsonwebtoken
 * 
 * This will provide proper type definitions for 'jsonwebtoken'.
 */
}