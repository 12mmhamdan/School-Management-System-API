const buckets = new Map();

const nowSec = () => Math.floor(Date.now() / 1000);

/**
 * Dependency-free, in-memory rate limiter.
 * NOTE: In-memory is fine for a coding challenge. For distributed deployments, swap to Redis.
 */
module.exports = ({ windowSec, max, keyFn }) => {
  return (req, res, next) => {
    const key = keyFn ? keyFn(req) : `${req.ip}:${req.originalUrl}`;
    const t = nowSec();
    const entry = buckets.get(key) || { reset: t + windowSec, count: 0 };
    if (t > entry.reset) {
      entry.reset = t + windowSec;
      entry.count = 0;
    }
    entry.count += 1;
    buckets.set(key, entry);

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    res.setHeader('X-RateLimit-Reset', String(entry.reset));

    if (entry.count > max) {
      return res.status(429).send({ ok: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } });
    }
    return next();
  };
};
