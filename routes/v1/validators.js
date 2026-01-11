const isEmail = (v) => {
  if (typeof v !== 'string') return false;
  // Simple RFC-ish check
  return /^\S+@\S+\.\S+$/.test(v.trim());
};

const str = (v) => (typeof v === 'string' ? v.trim() : v);

const required = (obj, field, errors) => {
  if (obj[field] === undefined || obj[field] === null || str(obj[field]) === '') {
    errors.push({ field, message: `${field} is required` });
  }
};

const validate = (req, res, next, fn) => {
  const errors = [];
  fn(errors);
  if (errors.length) {
    return res.status(400).send({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: errors } });
  }
  return next();
};

module.exports = {
  isEmail,
  validate,
  required,
};
