// utils/apiResponse.js
// Centralised success/error response helpers

/**
 * Send a successful JSON response.
 */
const sendSuccess = (res, { data = null, message = 'Success', statusCode = 200, meta = null } = {}) => {
  const body = { success: true, message };
  if (data !== null)  body.data  = data;
  if (meta !== null)  body.meta  = meta;
  return res.status(statusCode).json(body);
};

/**
 * Send an error JSON response.
 */
const sendError = (res, { message = 'An error occurred', statusCode = 500, errors = null } = {}) => {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

/**
 * Build pagination metadata from mongoose query.
 */
const paginate = (page, limit, total) => ({
  total,
  page:       parseInt(page),
  limit:      parseInt(limit),
  totalPages: Math.ceil(total / limit),
  hasNext:    page * limit < total,
  hasPrev:    page > 1,
});

module.exports = { sendSuccess, sendError, paginate };