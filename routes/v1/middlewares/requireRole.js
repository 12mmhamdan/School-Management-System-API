module.exports = (roles = []) => {
  const set = new Set(roles);
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).send({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
    }
    if (!set.has(req.auth.role)) {
      return res.status(403).send({ ok: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } });
    }
    return next();
  };
};
