// [보안] IP 기반 Rate Limiting (로그인 브루트포스 방지)

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const attempts = new Map<string, RateLimitRecord>();

// 오래된 레코드 정리 (메모리 누수 방지)
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of attempts) {
    if (now > record.resetAt) {
      attempts.delete(key);
    }
  }
}, 60 * 1000); // 1분마다 정리

export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15분
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || now > record.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (record.count >= maxAttempts) {
    return { allowed: false, retryAfterMs: record.resetAt - now };
  }

  record.count++;
  return { allowed: true, retryAfterMs: 0 };
}

export function resetRateLimit(key: string) {
  attempts.delete(key);
}
