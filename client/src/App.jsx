// client/src/App.jsx
import React, { useState, useEffect } from 'react';
import ChatInterface from './ChatInterface';
import io from 'socket.io-client';

function App() {
    const [username, setUsername] = useState('');
    const [room, setRoom] = useState('');
    const [socket, setSocket] = useState(null);
    const [showChat, setShowChat] = useState(false);

    // Define socketUrl using the environment variable
    const socketUrl = import.meta.env.REACT_APP_SOCKET_URL; // Using Vite's way to access env vars

    useEffect(() => {
        // Log the socketUrl to console immediately
        console.log("REACT_APP_SOCKET_URL is:", socketUrl);

        // You can also display it on the page temporarily
        // For example, right below the "Join Chat" heading
        // if you want to see it visually without opening console
        // This is just for debugging!
        if (!socketUrl) {
            console.error("REACT_APP_SOCKET_URL is not set!");
        }
    }, [socketUrl]); // Run this effect when socketUrl changes

    const connectSocket = () => {
        if (username && room) {
            // Connect to the URL from the environment variable
            const newSocket = io(socketUrl); // Use socketUrl here
            setSocket(newSocket);
            setShowChat(true);
        }
    };

    const joinRoom = () => {
        if (socket) {
            socket.emit('joinRoom', { username, room });
        }
    };

    const leaveRoom = () => {
        if (socket) {
            socket.disconnect();
            setShowChat(false);
            setUsername('');
            setRoom('');
            setSocket(null);
        }
    };

    return (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <h1>Join Chat</h1>
            {/* TEMPORARY DEBUGGING LINE: Display the URL */}
            <p>Attempting to connect to: **{socketUrl || "URL NOT SET"}**</p>
            {/* END TEMPORARY DEBUGGING LINE */}

            {!showChat ? (
                <div>
                    <input
                        type="text"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Enter room name (e.g., General)"
                        value={room}
                        onChange={(e) => setRoom(e.target.value)}
                    />
                    <button onClick={connectSocket}>Join Chat</button>
                </div>
            ) : (
                <ChatInterface
                    socket={socket}
                    username={username}
                    room={room}
                    leaveRoom={leaveRoom}
                />
            )}
        </div>
    );
}

export default App;