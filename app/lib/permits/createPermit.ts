import jwt from "jsonwebtoken";

const SECRET = 'permit-secret-key';

export function createPermit({ action, by, to, data = {}, expiresIn = "10m" }) {
  const payload = { action, by, to, data };
  return jwt.sign(payload, SECRET, { expiresIn });
}
