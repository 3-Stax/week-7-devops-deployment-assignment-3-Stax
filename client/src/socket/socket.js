// client/src/socket/socket.js
import { io } from 'socket.io-client';

// Get the socket URL from environment variables, now with the VITE_ prefix
const SOCKET_URL = import.meta.env.VITE_REACT_APP_SOCKET_URL || 'http://localhost:5000'; // Fallback for local dev

// Initialize the socket instance
export const socket = io(SOCKET_URL, {
  autoConnect: false, // Important for manual connection
  // You might want to add transport options if issues persist, e.g.,
  // transports: ['websocket', 'polling'],
});

// ... (rest of your useSocket hook code remains the same)
import { useState, useEffect } from 'react'; // Make sure useState and useEffect are imported if not already

export const useSocket = () => {
    const [isConnected, setIsConnected] = useState(socket.connected);

    useEffect(() => {
        function onConnect() {
            setIsConnected(true);
            console.log('Socket Connected!'); // Log successful connection
        }

        function onDisconnect() {
            setIsConnected(false);
            console.log('Socket Disconnected!'); // Log disconnection
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
        };
    }, []);

    const connectAndJoinRoom = (username, room) => {
        if (!socket.connected) {
            socket.connect(); // Connect if not already connected
        }
        // Ensure you're emitting to the correct socket instance
        socket.emit('joinRoom', { username, room });
    };

    const disconnect = () => {
        if (socket.connected) {
            socket.disconnect();
        }
    };

    return { isConnected, connectAndJoinRoom, disconnect, socket }; // Added socket to return for direct use if needed
};