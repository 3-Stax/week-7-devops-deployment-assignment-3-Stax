// server/server.js

// --- 1. Environment Setup ---
// Conditionally load environment variables from .env.development if not in production.
// Hosting platforms (like Railway, Render) inject variables directly in production.
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '.env.development' });
}

// --- 2. Core Imports ---
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
const asyncHandler = require('express-async-handler');

// --- 3. Winston Logger Setup ---
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json() // JSON format for production logs
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // Colorized for local dev readability
        winston.format.simple()
      ),
      silent: process.env.NODE_ENV === 'test' // Suppress logs during tests
    }),
  ],
});

// --- 4. MongoDB Connection ---
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1); // Exit process on connection failure
  }
};
connectDB();
logger.info('MongoDB connection attempted and connectDB function called.'); // VERBOSE LOG

// --- 5. Mongoose Schema ---
const messageSchema = new mongoose.Schema({
  username: { type: String, required: true },
  text: { type: String, required: true },
  room: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  readBy: [{ type: String }],
  isPrivate: { type: Boolean, default: false },
  senderId: { type: String },
  recipientId: { type: String }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

messageSchema.index({ room: 1 });
messageSchema.index({ senderId: 1, recipientId: 1, isPrivate: 1 });

const Message = mongoose.model('Message', messageSchema);
logger.info('Mongoose schema and model for Message defined.'); // VERBOSE LOG

// --- 6. Express & Middleware ---
const app = express();

// Security Headers
app.use(helmet());

// CORS Configuration (CRITICAL for deployment)
// TEMPORARY & INSECURE: Allowing all origins for assignment submission.
// *** YOU MUST REVERT THIS FOR PRODUCTION DEPLOYMENTS AFTER SUBMISSION ***
app.use(cors({
  origin: "*", // Allows requests from any origin
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
logger.info('Express CORS middleware configured with origin: "*"'); // VERBOSE LOG

// Logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
} else {
  app.use(morgan('dev'));
}
logger.info('Morgan HTTP request logger configured.'); // VERBOSE LOG

// Body Parser
app.use(express.json());
logger.info('Express JSON body parser configured.'); // VERBOSE LOG

// --- 7. Socket.IO Setup ---
const server = http.createServer(app);

// Socket.io CORS (CRITICAL for deployment)
// TEMPORARY & INSECURE: Allowing all Socket.io origins for assignment submission.
// *** YOU MUST REVERT THIS FOR PRODUCTION DEPLOYMENTS AFTER SUBMISSION ***
const io = new Server(server, {
  cors: {
    origin: "*", // Allows requests from any origin
    methods: ["GET", "POST"],
    credentials: true
  }
});
logger.info('Socket.IO server initialized with origin: "*"'); // VERBOSE LOG

// In-Memory Active Users
const activeUsers = new Map();
logger.info('In-memory activeUsers map initialized.'); // VERBOSE LOG

// --- 8. Socket.IO Events ---
io.on('connection', (socket) => {
  logger.info(`New connection: ${socket.id}`);

  // Join Room
  socket.on('joinRoom', asyncHandler(async ({ username, room }) => {
    // If the user was previously in another room, make them leave it first
    if (activeUsers.has(socket.id)) {
      const prevUser = activeUsers.get(socket.id);
      socket.leave(prevUser.room);
      logger.info(`${prevUser.username} (${socket.id}) left room: ${prevUser.room}`);
      // Update user list for the previous room
      const prevRoomUsers = Array.from(activeUsers.values()).filter(u => u.room === prevUser.room && u.id !== socket.id);
      io.to(prevUser.room).emit('roomUsers', prevRoomUsers);
    }

    const user = { id: socket.id, username, room };
    activeUsers.set(socket.id, user);
    socket.join(room);

    logger.info(`${username} (${socket.id}) joined room: ${room}`);

    // Fetch room messages (non-private)
    const messages = await Message.find({ room, isPrivate: false }).sort({ timestamp: 1 }).lean();

    // Emit a welcome message directly to the joining user
    socket.emit('message', {
      username: 'ChatBot',
      text: `Welcome to the ${room} chat room, ${username}!`,
      timestamp: new Date().toISOString(),
      id: new mongoose.Types.ObjectId().toHexString()
    });

    // Notify room
    socket.to(room).emit('message', {
      username: 'ChatBot',
      text: `${username} has joined the chat.`,
      timestamp: new Date().toISOString(),
      id: new mongoose.Types.ObjectId().toHexString()
    });

    // Send the updated list of users in the current room to everyone in that room
    const currentRoomUsers = Array.from(activeUsers.values()).filter(u => u.room === room);
    io.to(room).emit('roomUsers', currentRoomUsers);

    // Send existing messages for the room to the newly joined user
    socket.emit('roomMessages', messages);
  }));

  // Public Message
  socket.on('chatMessage', asyncHandler(async (text) => {
    const user = activeUsers.get(socket.id);
    if (!user) {
      logger.warn(`Attempt to send message by unknown user (socket ID): ${socket.id}`);
      socket.emit('message', {
        username: 'ChatBot',
        text: 'Error: You are not recognized. Please rejoin the chat.',
        timestamp: new Date().toISOString(),
        id: new mongoose.Types.ObjectId().toHexString()
      });
      return; // Exit to prevent further errors
    }

    const message = new Message({
      id: new mongoose.Types.ObjectId().toHexString(),
      username: user.username,
      text,
      room: user.room,
      readBy: [user.id],
      isPrivate: false
    });

    await message.save();
    io.to(user.room).emit('message', message.toObject());
    logger.info(`Message from ${user.username} in ${user.room}: ${text}`);
  }));

  // Typing
  socket.on('typing', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      socket.to(user.room).emit('typing', user.username);
    }
  });

  // Stop Typing
  socket.on('stopTyping', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      socket.to(user.room).emit('stopTyping', user.username);
    }
  });

  // Message Read
  socket.on('messageRead', asyncHandler(async ({ messageId, roomId }) => {
    const user = activeUsers.get(socket.id);
    if (user) {
      const messageToUpdate = await Message.findOne({ id: messageId, room: roomId });
      if (messageToUpdate && !messageToUpdate.readBy.includes(user.id)) {
        messageToUpdate.readBy.push(user.id);
        await messageToUpdate.save();
        io.to(roomId).emit('messageUpdated', messageToUpdate.toObject());
        logger.info(`Message ${messageId} in room ${roomId} read by ${user.username}`);
      }
    }
  }));

  // Private Message
  socket.on('privateMessage', asyncHandler(async ({ recipientId, message: msgText }) => {
    const sender = activeUsers.get(socket.id);
    const recipient = activeUsers.get(recipientId);

    if (!sender || !recipient) {
      socket.emit('message', {
        username: 'ChatBot',
        text: 'Error: Invalid sender or recipient for private message.',
        timestamp: new Date().toISOString(),
        id: new mongoose.Types.ObjectId().toHexString()
      });
      logger.warn(`Failed private message from ${sender?.username || socket.id} to ${recipientId}: Invalid sender/recipient.`);
      return; // Exit to prevent further errors
    }

    const privateRoomIdentifier = [sender.id, recipient.id].sort().join('-'); // Consistent ID

    const privateMsg = new Message({
      id: new mongoose.Types.ObjectId().toHexString(),
      username: sender.username,
      text: msgText,
      room: privateRoomIdentifier,
      isPrivate: true,
      senderId: sender.id,
      recipientId: recipient.id,
      timestamp: new Date(),
      readBy: [sender.id]
    });

    await privateMsg.save();
    io.to(recipientId).emit('message', privateMsg.toObject());
    socket.emit('message', privateMsg.toObject()); // Echo to sender
    logger.info(`Private message from ${sender.username} to ${recipient.username}: ${msgText}`);
  }));

  // Leave Room
  socket.on('leaveRoom', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      socket.leave(user.room);
      activeUsers.delete(socket.id);
      logger.info(`${user.username} (${socket.id}) explicitly left room: ${user.room}`);

      socket.to(user.room).emit('message', {
        username: 'ChatBot',
        text: `${user.username} has left the chat.`,
        timestamp: new Date().toISOString(),
        id: new mongoose.Types.ObjectId().toHexString()
      });

      const currentRoomUsers = Array.from(activeUsers.values()).filter(u => u.room === user.room);
      io.to(user.room).emit('roomUsers', currentRoomUsers);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      activeUsers.delete(socket.id);
      logger.info(`User disconnected: ${user.username} (${socket.id})`);

      const currentRoomUsers = Array.from(activeUsers.values()).filter(u => u.room === user.room);
      if (currentRoomUsers.length > 0) {
        socket.to(user.room).emit('message', {
          username: 'ChatBot',
          text: `${user.username} has left the chat.`,
          timestamp: new Date().toISOString(),
          id: new mongoose.Types.ObjectId().toHexString()
        });
        io.to(user.room).emit('roomUsers', currentRoomUsers);
      } else {
        logger.info(`Room ${user.room} is now empty after ${user.username} disconnected.`);
      }
    } else {
      logger.info(`User disconnected: ${socket.id} (unknown active user)`);
    }
  });
});
logger.info('Socket.IO connection handler and events defined.'); // VERBOSE LOG

// --- 9. API Routes ---
app.get('/', (req, res) => res.send('Socket.io chat server is running!'));
logger.info('Base API route defined.'); // VERBOSE LOG

// --- 10. Error Handling ---
// Catch 404 and forward to error handler
app.use((req, res, next) => {
  const error = new Error('Not Found');
  error.status = 404;
  next(error);
});

// General error handler
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack, status: err.status, url: req.originalUrl, method: req.method });

  res.status(err.status || 500).json({
    message: err.message,
    error: process.env.NODE_ENV === 'development' ? err.stack : {} // Include stack only in dev
  });
});
logger.info('Express error handling middleware configured.'); // VERBOSE LOG

// --- 11. Uncaught Exception/Rejection Handlers ---
// Catch all uncaught exceptions to prevent process from crashing silently
process.on('uncaughtException', (err) => {
  logger.error(`UNCAUGHT EXCEPTION: ${err.message}`, { stack: err.stack });
  process.exit(1); // Exit process after logging
});

// Catch all unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`UNHANDLED REJECTION at: ${promise}, reason: ${reason.message || reason}`, { stack: reason.stack });
  process.exit(1); // Exit process after logging
});
logger.info('Global uncaught exception and unhandled rejection handlers configured.'); // VERBOSE LOG

// --- 12. Start Server ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  logger.info('HTTP server successfully started and listening for requests.'); // VERBOSE LOG
});