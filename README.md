Real-Time Chat Application with Socket.io
This project implements a real-time chat application using React for the frontend and Node.js with Express and Socket.io for the backend. It features bidirectional communication, user presence, multiple chat rooms, private messaging, typing indicators, and read receipts.

Table of Contents
Features

Project Structure

Getting Started

Prerequisites

Installation

Running the Application

Advanced Features Implemented

Screenshots

Submission Notes

Resources

Features
This application includes the following core and advanced features:

Real-time Messaging: Instant message delivery between users in shared chat rooms.

User Authentication & Presence: Users can join rooms with a chosen username. The application displays a list of active users in the current room, indicating their presence.

Multiple Chat Rooms: Users can join different public chat rooms.

Private Messaging: Users can initiate one-on-one private conversations with other online users.

Real-time Notifications: Users are notified when others join or leave a room.

Typing Indicators: Displays when another user in the same chat (room or private) is actively typing a message.

Read Receipts: Provides visual confirmation (double checkmark) when your messages have been read by other participants.

Project Structure
socketio-chat/
├── client/           # React front-end
│   ├── public/       # Static files (index.html, manifest.json)
│   ├── src/          # React source code
│   │   ├── components/ # UI components
│   │   ├── context/    # React context providers (empty, but structured for future use)
│   │   ├── hooks/      # Custom React hooks (empty, but structured for future use)
│   │   ├── pages/      # Page components (empty, but structured for future use)
│   │   ├── socket/     # Socket.io client setup (socket.js - currently unused, but present)
│   │   ├── App.jsx     # Main application component
│   │   ├── index.js    # React app entry point
│   │   └── index.css   # Tailwind CSS imports and custom styles
│   └── package.json    # Client dependencies
│   └── tailwind.config.js # Tailwind CSS configuration
├── server/           # Node.js back-end
│   ├── config/       # Configuration files (empty, but structured for future use)
│   ├── controllers/  # Socket event handlers (empty, but structured for future use)
│   ├── models/       # Data models (empty, but structured for future use)
│   ├── socket/       # Socket.io server setup (empty, but structured for future use)
│   ├── utils/        # Utility functions (empty, but structured for future use)
│   ├── server.js     # Main server file
│   └── package.json    # Server dependencies
└── README.md         # Project documentation

Getting Started
Follow these instructions to set up and run the application on your local machine.

Prerequisites
Node.js (v18 or higher recommended)

npm or pnpm (pnpm was used during development)

A modern web browser

Installation
Clone the repository:
If you haven't already, clone your GitHub Classroom repository. The root folder name will be similar to week-5-web-sockets-assignment-3-Stax.

git clone <your-repository-url>
cd week-5-web-sockets-assignment-3-Stax

Navigate to the server directory and install dependencies:

cd server
# Clean up previous installations (optional, but recommended for a fresh start)
rm -rf node_modules
rm pnpm-lock.yaml # or yarn.lock / package-lock.json if you use npm/yarn
pnpm install # or npm install / yarn install

Navigate to the client directory and install dependencies:

cd ../client
# Clean up previous installations (optional, but recommended for a fresh start)
rm -rf node_modules
rm pnpm-lock.yaml # or yarn.lock / package-lock.json if you use npm/yarn
pnpm install # or npm install / yarn install

Running the Application
You will need two separate terminal windows for the server and the client.

Start the Server:
Open your first terminal window, navigate to the server directory, and run:

cd week-5-web-sockets-assignment-3-Stax/server
pnpm start # or npm start / node server.js

You should see Server running on port 5000. Keep this terminal open.

Start the Client:
Open your second terminal window, navigate to the client directory, and run:

cd week-5-web-sockets-assignment-3-Stax/client
pnpm start # or npm start

This will open the React application in your browser, usually at http://localhost:3000. Keep this terminal open.

Test the Chat:

Open http://localhost:3000 in your browser.

Enter a username and a room name (e.g., "Alice", "General"). Click "Join Chat".

Open another browser tab or an incognito window and navigate to http://localhost:3000 again.

Enter a different username (e.g., "Bob") and the same room name ("General"). Click "Join Chat".

You can now send messages between Alice and Bob in the "General" room.

To test private messaging, click on a user's name in the "Users in [Room Name]" list.

Advanced Features Implemented
As per the assignment requirements, the following advanced features have been implemented:

Typing Indicators: Users can see when another user is actively typing in the same chat room or private conversation.

Read Receipts: Sent messages display a single checkmark when delivered and a double checkmark when read by the recipient(s).

Private Messaging: Users can select another online user from the user list to initiate a private, one-on-one chat.

Screenshots
(Placeholder for screenshots of your working application)

Screenshot 1: Login/Join Room Screen

Screenshot 2: Public Chat Room with multiple users and messages

Screenshot 3: Private Chat window

Screenshot 4: Typing indicator in action

Screenshot 5: Read receipts on messages


Resources
Socket.io Documentation

React Documentation

Express.js Documentation

Tailwind CSS Documentation