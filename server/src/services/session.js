import crypto from 'node:crypto';
import { env } from '../config/env.js';

const COOKIE = 'mystery_session';
const SESSION_HEADER = 'x-mystery-session';
const sign = (id) => crypto.createHmac('sha256', env.SESSION_SECRET).update(id).digest('hex');
export const sessionHash = (id) => crypto.createHash('sha256').update(`${env.SESSION_SECRET}:${id}`).digest('hex');

function signatureIsValid(id, signature) {
  const expected = sign(id);
  return typeof signature === 'string'
    && signature.length === expected.length
    && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function sessionMiddleware(req, res, next) {
  const bearer = (req.get(SESSION_HEADER) || '').split('.');
  const [bearerId, bearerSignature] = bearer;
  const validBearer = bearer.length === 2
    && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(bearerId)
    && signatureIsValid(bearerId, bearerSignature);

  const cookieId = req.cookies?.[COOKIE];
  const cookieSignature = req.cookies?.mystery_signature;
  const validCookie = typeof cookieId === 'string' && signatureIsValid(cookieId, cookieSignature);

  let id = validBearer ? bearerId : validCookie ? cookieId : null;
  if (!id) {
    id = crypto.randomUUID();
    const options = { httpOnly: true, sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax', secure: env.NODE_ENV === 'production', maxAge: env.SESSION_TTL_HOURS * 3600000, path: '/' };
    res.cookie(COOKIE, id, options);
    res.cookie('mystery_signature', sign(id), options);
  }

  res.setHeader('Access-Control-Expose-Headers', 'X-Mystery-Session');
  res.setHeader(SESSION_HEADER, `${id}.${sign(id)}`);
  req.sessionHash = sessionHash(id);
  next();
}
