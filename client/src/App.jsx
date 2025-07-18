// client/src/App.jsx
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { UserGroupIcon } from '@heroicons/react/24/solid';

// --- IMPORT THE SOCKET AND HOOK FROM YOUR SOCKET SETUP FILE ---
import { socket, useSocket } from './socket/socket';

// Lazily load the ChatInterface component.
const LazyChatInterface = lazy(() => import('./ChatInterface'));

function App() {
    const [username, setUsername] = useState('');
    const [room, setRoom] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // --- TEMPORARY DEBUGGING: Access the environment variable directly here with VITE_ prefix ---
    const debugSocketUrl = import.meta.env.VITE_REACT_APP_SOCKET_URL; // CHANGED TO VITE_

    // --- USE THE CUSTOM SOCKET HOOK ---
    const {
        isConnected: socketConnected,
        connectAndJoinRoom,
        disconnect: hookDisconnect
    } = useSocket();

    useEffect(() => {
        // Log the socketUrl to console immediately when App mounts or debugSocketUrl changes.
        console.log("DEBUG: VITE_REACT_APP_SOCKET_URL (from App.jsx) is:", debugSocketUrl); // CHANGED LOG
        if (!debugSocketUrl) {
            console.error("DEBUG: VITE_REACT_APP_SOCKET_URL is NOT set in the Vercel environment!"); // CHANGED LOG
        }

        if (!socket.connected) {
            socket.connect();
        }
        return () => {}; // Keeping cleanup empty as per your original
    }, [debugSocketUrl]);

    const handleJoinRoom = (e) => {
        e.preventDefault();
        console.log('App.jsx: handleJoinRoom called.');
        console.log('App.jsx: Username:', username, 'Room:', room, 'Socket Connected (from hook):', socketConnected);

        if (username && room && socketConnected) {
            console.log('App.jsx: Calling connectAndJoinRoom from hook with:', { username, room });
            connectAndJoinRoom(username, room);
            setIsLoggedIn(true);
        } else {
            console.log('App.jsx: Cannot join room. Check username, room, and socket connection status.');
        }
    };

    const handleLogout = () => {
        if (socket) {
            hookDisconnect();
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

                    {/* TEMPORARY DEBUGGING LINE: Display the URL on the page */}
                    <p className="text-sm text-gray-600 mb-4">
                        Attempting to connect to: <span className="font-mono text-blue-800">{debugSocketUrl || "URL NOT SET"}</span>
                    </p>
                    {/* END TEMPORARY DEBUGGING LINE */}

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
                    <LazyChatInterface username={username} room={room} socket={socket} onLogout={handleLogout} />
                </Suspense>
            )}
        </div>
    );
}

export default App;