module.exports = () => {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).send({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
    }
    if (req.auth.role === 'SUPERADMIN') return next();
    const schoolId = req.params.schoolId;
    if (req.auth.role !== 'SCHOOL_ADMIN' || !req.auth.schoolId) {
      return res.status(403).send({ ok: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } });
    }
    if (String(req.auth.schoolId) !== String(schoolId)) {
      return res.status(403).send({ ok: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } });
    }
    return next();
  };
};
