import crypto from 'crypto';

export function md5(str: string) {
  return crypto.createHash('md5').update(str).digest('hex');
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function newRefreshToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
export function randomNonce(len = 48): string {
  return crypto.randomBytes(len).toString('base64url');
}

export function randomId() {
  return crypto.randomBytes(16).toString('hex');
}
