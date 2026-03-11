const { validationResult } = require('express-validator');

// Strips null bytes and trims all string fields in body/query/params
const sanitizeInput = (req, res, next) => {
  const clean = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key].replace(/\0/g, '').trim(); // strip null bytes
      } else if (typeof obj[key] === 'object') {
        clean(obj[key]);
      }
    }
  };
  clean(req.body);
  clean(req.query);
  next();
};

// Validates express-validator results and returns 422 on failure
const validateResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(({ path, msg }) => ({ field: path, message: msg }))
    });
  }
  next();
};

module.exports = { sanitizeInput, validateResult };
