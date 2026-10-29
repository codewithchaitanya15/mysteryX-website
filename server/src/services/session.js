import crypto from 'node:crypto';
import { env } from '../config/env.js';

const COOKIE = 'mystery_session';
const sign = (id) => crypto.createHmac('sha256', env.SESSION_SECRET).update(id).digest('hex');
export const sessionHash = (id) => crypto.createHash('sha256').update(`${env.SESSION_SECRET}:${id}`).digest('hex');
export function sessionMiddleware(req, res, next) {
  let id = req.cookies?.[COOKIE];
  const signature = req.cookies?.mystery_signature;
  const expected = id ? sign(id) : '';
  const validSignature = typeof signature === 'string' && signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!id || !validSignature) {
    id = crypto.randomUUID();
    const options = { httpOnly: true, sameSite: 'lax', secure: env.NODE_ENV === 'production', maxAge: env.SESSION_TTL_HOURS * 3600000, path: '/' };
    res.cookie(COOKIE, id, options);
    res.cookie('mystery_signature', sign(id), options);
  }
  req.sessionHash = sessionHash(id);
  next();
}
