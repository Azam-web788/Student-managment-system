/**
 * Standardized API response helpers
 */

export function success(res, data = null, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
}

export function paginated(res, data, total, page, limit, message = 'Success') {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
    timestamp: new Date().toISOString(),
  });
}

export function created(res, data = null, message = 'Created successfully') {
  return res.status(201).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
}

export function error(res, message = 'Internal server error', statusCode = 500, errors = null) {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
    timestamp: new Date().toISOString(),
  });
}

export function notFound(res, message = 'Resource not found') {
  return error(res, message, 404);
}

export function badRequest(res, message = 'Bad request', errors = null) {
  return error(res, message, 400, errors);
}

export function unauthorized(res, message = 'Unauthorized') {
  return error(res, message, 401);
}

export function forbidden(res, message = 'Forbidden') {
  return error(res, message, 403);
}
