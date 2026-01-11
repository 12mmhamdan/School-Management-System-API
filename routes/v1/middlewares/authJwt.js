const jwt = require('jsonwebtoken');

module.exports = ({ config }) => {
  return (req, res, next) => {
    const auth = req.headers.authorization || '';
    const parts = auth.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).send({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' } });
    }
    const token = parts[1];
    try {
      const decoded = jwt.verify(token, config.dotEnv.JWT_SECRET);
      req.auth = {
        userId: decoded.sub,
        role: decoded.role,
        schoolId: decoded.schoolId,
      };
      return next();
    } catch (err) {
      return res.status(401).send({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
    }
  };
};
