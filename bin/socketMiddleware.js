/*
// socketMiddleware.js
const socketMiddleware = (io) => (req, res, next) => {
    req.io = io; // Attach 'io' to the request object
    next(); // Move to the next middleware or route handler
};

module.exports = socketMiddleware;
*/