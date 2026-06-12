const { BadRequestError } = require('../utils/appError');

/**
 * Express middleware to validate request parameters, queries, and bodies against a Zod schema.
 * @param {import('zod').ZodSchema} schema 
 */
const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params
    });
    
    // Assign validated data back to req to ensure type-safe/sanitized data is used
    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query;
    if (parsed.params) req.params = parsed.params;
    
    next();
  } catch (error) {
    if (error.name === 'ZodError') {
      const details = error.errors
        .map((e) => `${e.path.slice(1).join('.') || e.path[0]}: ${e.message}`)
        .join(', ');
      return next(new BadRequestError(`Validation failed: ${details}`));
    }
    next(error);
  }
};

module.exports = validate;
