// client/src/App.jsx
import React, { useState, useEffect, Suspense, lazy } from 'react';
// import io from 'socket.io-client'; // <--- REMOVE THIS LINE
import { UserGroupIcon } from '@heroicons/react/24/solid';

// --- IMPORT THE SOCKET AND HOOK FROM YOUR SOCKET SETUP FILE ---
import { socket, useSocket } from './socket/socket'; // <--- ADD THIS LINE

// You don't need SOCKET_SERVER_URL here if it's managed in socket.js
// const SOCKET_SERVER_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Remove the global 'let socket;' declaration as it's imported now
// let socket;

// Lazily load the ChatInterface component.
const LazyChatInterface = lazy(() => import('./ChatInterface'));

function App() {
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // --- USE THE CUSTOM SOCKET HOOK ---
  const { isConnected: socketConnected, connect: connectSocket, disconnect: disconnectSocket } = useSocket();

  // Effect to manage initial socket connection (using the hook's connect function)
  useEffect(() => {
    console.log('App.jsx: Calling connectSocket from useSocket hook.');
    connectSocket(); // Explicitly connect the socket when App mounts

    // No need for socket.on('connect') listeners here anymore, as useSocket handles isConnected
    // You also don't need socket.on('disconnect') or connect_error here unless you want additional App-specific logic.

    return () => {
      // It's generally good practice to disconnect when the main App component unmounts
      // or manage this explicitly based on your app's flow (e.g., on logout)
      // disconnectSocket(); // Uncomment if you want to disconnect when App unmounts
    };
  }, [connectSocket]); // Dependency array: connectSocket to ensure it's stable


  // Function to handle joining a chat room
  const handleJoinRoom = (e) => {
    e.preventDefault();
    console.log('App.jsx: handleJoinRoom called.');
    console.log('App.jsx: Username:', username, 'Room:', room, 'Socket Connected (from hook):', socketConnected);

    if (username && room && socketConnected) {
      console.log('App.jsx: Emitting joinRoom event with:', { username, room });
      // Use the imported 'socket' instance directly for emit
      socket.emit('joinRoom', { username, room });
      setIsLoggedIn(true); // Frontend assumes success immediately
    } else {
      console.log('App.jsx: Cannot join room. Check username, room, and socket connection status.');
    }
  };

  const handleLogout = () => {
    if (socket) { // Use the imported socket instance
      socket.emit('leaveRoom');
      disconnectSocket(); // Use the disconnect function from the hook
      // socket = null; // No need to nullify global 'socket' if it's imported
    }
    setUsername('');
    setRoom('');
    setIsLoggedIn(false);
  };


  return (
    <div className="flex flex-col md:flex-row h-screen w-full max-w-7xl mx-auto p-4 bg-gray-100 rounded-lg shadow-xl">
      {!isLoggedIn ? (
        <div className="flex flex-col items-center justify-center w-full h-full bg-white rounded-lg p-8 shadow-md">
          <h1 className="text-4xl font-extrabold text-blue-600 mb-8">Join Chat</h1>
          {!socketConnected && (
            <p className="text-red-500 mb-4">Connecting to server... Please wait.</p>
          )}
          {socketConnected && (
            <p className="text-green-500 mb-4">Connected to server. Ready to join!</p>
          )}
          <form onSubmit={handleJoinRoom} className="w-full max-w-sm space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your username"
                required
              />
            </div>
            <div>
              <label htmlFor="room" className="block text-sm font-medium text-gray-700 mb-2">
                Room Name
              </label>
              <input
                type="text"
                id="room"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter room name (e.g., General, Sports)"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-150 ease-in-out"
              disabled={!socketConnected}
            >
              Join Chat
            </button>
          </form>
        </div>
      ) : (
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center w-full h-full bg-white rounded-lg p-8 shadow-md">
            <UserGroupIcon className="h-12 w-12 text-blue-600 animate-pulse mb-4" />
            <p className="text-lg text-gray-700">Loading chat interface...</p>
          </div>
        }>
          {/* Pass the imported socket instance to ChatInterface */}
          <LazyChatInterface username={username} room={room} socket={socket} onLogout={handleLogout} />
        </Suspense>
      )}
    </div>
  );
}

export default App;