
// socket.js
const socketIo = require('socket.io');

module.exports = (server) => {
    const io = socketIo(server);

    io.on('connection', (socket) => {
        console.log('A user connected');
        // Handle events, emit messages, etc.
    });
};