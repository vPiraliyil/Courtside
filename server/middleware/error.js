function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  res.status(status).json({ error: message });
}

module.exports = errorHandler;
