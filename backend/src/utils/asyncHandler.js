// Express 4 doesn't catch rejected promises from async route handlers on
// its own, an unhandled one just hangs the request. Wrap every async
// handler with this so errors reach the error middleware in server.js.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = asyncHandler;
