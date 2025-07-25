import jwt from "jsonwebtoken";

const SECRET = 'permit-secret-key';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function verifyPermit(token : any) {
  try {
    return jwt.verify(token, SECRET) as {
      action: string;
      by: string;
      to: string;
    };
  } catch {
    return null;
  }
}
