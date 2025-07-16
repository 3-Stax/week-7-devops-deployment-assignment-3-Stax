// server/server.js

// --- 1. Load Environment Variables ---
// Conditionally load environment variables based on NODE_ENV.
// In production, hosting platforms typically inject these directly.
if (process.env.NODE_ENV !== 'production') {
  // For local development, load from .env.development
  require('dotenv').config({ path: '.env.development' });
} else {
  // In a production build process, you might only rely on injected env vars.
  // This line is often omitted in true production deploys if env vars are guaranteed.
  // However, it's kept here if there's a need to load from a file in a production-like local setup.
  require('dotenv').config({ path: '.env.production' });
}

// Import necessary modules
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose'); // Mongoose for MongoDB interaction
const helmet = require('helmet');     // Helmet for security headers
const morgan = require('morgan');     // Morgan for HTTP request logging
const winston = require('winston');   // Winston for structured logging
const asyncHandler = require('express-async-handler'); // For handling async errors in routes

// --- 2. Configure Logging with Winston ---
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json() // Use JSON format for production logs for easier parsing by log aggregators
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // Colorize for console readability during development
        winston.format.simple()    // Simple format for clear console output
      ),
      silent: process.env.NODE_ENV === 'test' // Suppress logs during automated tests
    }),
    // For a robust production environment, consider adding file transports
    // or integrating with external logging services like Sentry, CloudWatch, DataDog, etc.
    // new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// --- 3. MongoDB Connection Setup ---
const connectDB = async () => {
  try {
    // Attempt to connect to MongoDB using the URI from environment variables
    const conn = await mongoose.connect(process.env.MONGO_URI);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    // Log the error and exit the process if connection fails
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    // A more graceful shutdown might involve specific error codes or retries
    process.exit(1); // Exit process with a failure code
  }
};

// Initiate database connection
connectDB();

// --- 4. Define Mongoose Schema and Model for Messages ---
const messageSchema = new mongoose.Schema({
  // 'id' is often redundant if '_id' (MongoDB's default) is used directly.
  // Keeping it if there's a specific frontend requirement for 'id' distinct from '_id'.
  // If not, consider removing 'id' and using '_id' (from Mongoose) directly.
  id: { type: String, required: true, unique: true }, // For client-side tracking, potentially redundant with _id
  username: { type: String, required: true },
  text: { type: String, required: true },
  room: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  readBy: [{ type: String }], // Array of socket IDs or user IDs who have read the message
  isPrivate: { type: Boolean, default: false },
  senderId: { type: String }, // Storing sender's socket ID or user ID
  recipientId: { type: String } // Storing recipient's socket ID or user ID for private messages
});

// Add an index to 'room' for efficient querying of room messages
messageSchema.index({ room: 1 });
// Add an index for private messages if querying by sender/recipient pairs is common
messageSchema.index({ senderId: 1, recipientId: 1, isPrivate: 1 });

const Message = mongoose.model('Message', messageSchema);

// --- Initialize Express app ---
const app = express();

// --- 5. Middleware Setup ---
// Apply Security Headers using Helmet
app.use(helmet());

// CORS configuration for both Express and Socket.io
// In production, 'CLIENT_ORIGIN' should be your actual deployed frontend URL.
// Ensure this list accurately includes your local dev and deployed Vercel URL.
const allowedOrigins = [
  'http://localhost:3000', // Your local React development server
  'https://week-7-devops-deployment-assignment-3-stax.vercel.app', // Your DEPLOYED Vercel frontend URL
];

// CORS for Express HTTP routes
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., Postman, mobile apps, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the Origin: ${origin}.`;
      logger.warn(msg); // Log the blocked origin
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "DELETE"], // Define allowed HTTP methods
  credentials: true // Allow sending cookies/authorization headers
}));

// HTTP Request Logging with Morgan
if (process.env.NODE_ENV === 'production') {
  // Use 'combined' format for detailed production logs, piped to Winston
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
} else {
  // Use 'dev' format for concise and colorful development logs
  app.use(morgan('dev'));
}

// Body parser for JSON requests
app.use(express.json());

// Create an HTTP server using the Express app
const server = http.createServer(app);

// Initialize Socket.io server with CORS configured to match allowed origins
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = `The CORS policy for this site does not allow Socket.io access from the Origin: ${origin}.`;
        logger.warn(msg); // Log the blocked origin
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    methods: ["GET", "POST"], // Socket.io typically only needs GET/POST for handshakes
    credentials: true
  }
});

// In-memory data store for currently active users (volatile, not persisted across server restarts)
// Map<socket.id, { username: string, room: string, id: string }>
const activeUsers = new Map();

// --- Socket.io Event Handling ---
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);

  // Handle 'joinRoom' event
  socket.on('joinRoom', asyncHandler(async ({ username, room }) => {
    // If the user was previously in another room, make them leave it first
    if (activeUsers.has(socket.id)) {
      const prevUser = activeUsers.get(socket.id);
      socket.leave(prevUser.room);
      logger.info(`${prevUser.username} (${socket.id}) left room: ${prevUser.room}`);
      // Update user list for the previous room (more robust cleanup logic might be needed for a complex app)
      const prevRoomUsers = Array.from(activeUsers.values()).filter(u => u.room === prevUser.room && u.id !== socket.id);
      io.to(prevUser.room).emit('roomUsers', prevRoomUsers);
    }

    // Add/update user in the activeUsers map and join the new room
    const user = { id: socket.id, username, room };
    activeUsers.set(socket.id, user);
    socket.join(room);

    logger.info(`${username} (${socket.id}) joined room: ${room}`);

    // Fetch message history for the room from the database
    // Only fetch non-private messages for the specific room
    const roomMessages = await Message.find({ room: room, isPrivate: false })
      .sort({ timestamp: 1 }) // Sort messages by timestamp in ascending order
      .lean(); // Use .lean() for performance when not modifying Mongoose documents

    // Emit a welcome message directly to the joining user
    socket.emit('message', {
      username: 'ChatBot',
      text: `Welcome to the ${room} chat room, ${username}!`,
      timestamp: new Date().toISOString(),
      id: new mongoose.Types.ObjectId().toHexString() // More robust unique ID
    });

    // Broadcast to others in the room that a new user has joined
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
    socket.emit('roomMessages', roomMessages);
  }));

  // Handle 'chatMessage' event (public messages)
  socket.on('chatMessage', asyncHandler(async (msgText) => {
    const user = activeUsers.get(socket.id);
    if (user) {
      // Create a new message document
      const message = new Message({
        id: new mongoose.Types.ObjectId().toHexString(), // Generate a unique ID for the message
        username: user.username,
        text: msgText,
        room: user.room,
        timestamp: new Date(),
        readBy: [user.id], // Mark as read by the sender initially
        isPrivate: false
      });
      await message.save(); // Save the message to MongoDB

      // Emit the saved message object to everyone in the room
      io.to(user.room).emit('message', message.toObject());
      logger.info(`Message from ${user.username} in ${user.room}: ${msgText}`);
    } else {
      logger.warn(`Attempt to send message by unknown user (socket ID): ${socket.id}`);
      // Optionally, emit an error back to the client
      socket.emit('message', {
        username: 'ChatBot',
        text: 'Error: You are not recognized. Please rejoin the chat.',
        timestamp: new Date().toISOString(),
        id: new mongoose.Types.ObjectId().toHexString()
      });
    }
  }));

  // Handle 'typing' event
  socket.on('typing', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      // Broadcast to others in the same room that this user is typing
      socket.to(user.room).emit('typing', user.username);
    }
  });

  // Handle 'stopTyping' event
  socket.on('stopTyping', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      // Broadcast to others in the same room that this user has stopped typing
      socket.to(user.room).emit('stopTyping', user.username);
    }
  });

  // Handle 'messageRead' event (for read receipts)
  socket.on('messageRead', asyncHandler(async ({ messageId, roomId }) => {
    const user = activeUsers.get(socket.id);
    if (user) {
      // Find the message by its client-side 'id' and room
      const messageToUpdate = await Message.findOne({ id: messageId, room: roomId });
      if (messageToUpdate && !messageToUpdate.readBy.includes(user.id)) {
        messageToUpdate.readBy.push(user.id); // Add the user's ID to the readBy array
        await messageToUpdate.save(); // Save the updated message with new readBy status

        // Emit the updated message to the room so all clients can update their UI
        io.to(roomId).emit('messageUpdated', messageToUpdate.toObject());
        logger.info(`Message ${messageId} in room ${roomId} read by ${user.username}`);
      }
    }
  }));

  // Handle 'privateMessage' event
  socket.on('privateMessage', asyncHandler(async ({ recipientId, message: msgText }) => {
    const sender = activeUsers.get(socket.id);
    const recipient = activeUsers.get(recipientId);

    if (sender && recipient) {
      // For private messages, the 'room' field in the DB could be a normalized private chat ID
      // (e.g., a combination of sender/recipient IDs) to easily retrieve history for that private chat.
      // For now, it might default to a general placeholder or a unique ID if not tied to public rooms.
      // Example: const privateRoomId = [sender.id, recipient.id].sort().join('-'); // Consistent ID

      const privateMsg = new Message({
        id: new mongoose.Types.ObjectId().toHexString(), // Unique ID for the private message
        username: sender.username,
        text: msgText,
        // Decide on a suitable 'room' value for private messages if you query them differently
        room: `private_${sender.id}_${recipient.id}`, // Placeholder, adjust as needed
        isPrivate: true,
        senderId: sender.id,
        recipientId: recipient.id,
        timestamp: new Date(),
        readBy: [sender.id] // Marked as read by the sender upon sending
      });
      await privateMsg.save(); // Save private message to MongoDB

      // Send the private message to the recipient
      io.to(recipientId).emit('message', privateMsg.toObject());
      // Also send a copy to the sender's own socket so they see it in their chat interface
      socket.emit('message', privateMsg.toObject());
      logger.info(`Private message from ${sender.username} to ${recipient.username}: ${msgText}`);
    } else {
      // Notify the sender if the recipient is not found or offline
      socket.emit('message', {
        username: 'ChatBot',
        text: 'Error: Recipient not found or offline for private message.',
        timestamp: new Date().toISOString(),
        id: new mongoose.Types.ObjectId().toHexString()
      });
      logger.warn(`Failed private message from ${sender?.username || socket.id} to ${recipientId}: Recipient not found or offline.`);
    }
  }));

  // Handle 'leaveRoom' event (for explicit client-side room departure)
  socket.on('leaveRoom', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      socket.leave(user.room);
      // Remove user from activeUsers map; the 'disconnect' handler will also do this,
      // but explicit 'leaveRoom' might precede a full disconnect.
      activeUsers.delete(socket.id);
      logger.info(`${user.username} (${socket.id}) explicitly left room: ${user.room}`);

      // Notify others in the room that the user has left
      socket.to(user.room).emit('message', {
        username: 'ChatBot',
        text: `${user.username} has left the chat.`,
        timestamp: new Date().toISOString(),
        id: new mongoose.Types.ObjectId().toHexString()
      });

      // Update and send the new list of users for that room
      const currentRoomUsers = Array.from(activeUsers.values()).filter(u => u.room === user.room);
      io.to(user.room).emit('roomUsers', currentRoomUsers);
    }
  });

  // Handle 'disconnect' event (when a user's socket connection closes)
  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      activeUsers.delete(socket.id); // Remove user from active users map
      logger.info(`User disconnected: ${user.username} (${socket.id})`);

      // Notify others in the room if the user was in a room and if the room still has active users
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

// --- 6. API Routes (Minimal for this chat server) ---
// Basic health check route
app.get('/', (req, res) => {
  res.send('Socket.io chat server is running!');
});

// --- 7. Error Handling Middleware (MUST be placed after all routes and other middleware) ---
// Catch 404 errors (requests that didn't match any route) and forward to error handler
app.use((req, res, next) => {
  const error = new Error('Not Found');
  error.status = 404;
  next(error); // Pass the error to the next middleware (our general error handler)
});

// General error handler middleware
app.use((err, req, res, next) => {
  // Log the error with Winston, including stack trace for debugging
  logger.error(`Error: ${err.message}`, { stack: err.stack, status: err.status, url: req.originalUrl, method: req.method });
  
  // Set response status code
  res.status(err.status || 500);
  
  // Send JSON error response
  res.json({
    message: err.message,
    // Include stack trace only in development mode for security reasons
    error: process.env.NODE_ENV === 'development' ? err.stack : {}
  });
});

// --- 8. Start the HTTP Server ---
const PORT = process.env.PORT || 5000; // Use port from environment variable or default to 5000
server.listen(PORT, () => logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`));