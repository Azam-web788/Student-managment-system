import xss from 'xss';

/**
 * XSS sanitization middleware
 * Sanitizes all request body, query, and params strings
 */
export function sanitizeInput(obj) {
  if (typeof obj === 'string') {
    return xss(obj, {
      whiteList: {}, // Strip all HTML tags
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style', 'iframe'],
    });
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeInput(item));
  }

  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return obj;
}

export function xssSanitize(req, res, next) {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  if (req.query) {
    req.query = sanitizeInput(req.query);
  }
  if (req.params) {
    req.params = sanitizeInput(req.params);
  }
  next();
}
