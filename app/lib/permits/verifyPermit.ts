import jwt from "jsonwebtoken";

const SECRET = 'permit-secret-key';

export function verifyPermit(token : any) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}
