// client/src/ChatInterface.jsx
import React, { useState, useEffect, useRef } from 'react';

import { PaperAirplaneIcon, UserGroupIcon, ChatBubbleLeftRightIcon, UserIcon } from '@heroicons/react/24/solid';

// Initialize the socket connection inside the component or pass it as prop,
// but ensure it's conditionally initialized or memoized to avoid issues.
// For simplicity in this example, we'll keep the socket prop for reusability.
// The actual socket connection (io(URL)) should be handled by the parent App.jsx
// to avoid multiple connections if ChatInterface mounts/unmounts frequently.

// NOTE: We're taking `socket` as a prop now from App.jsx
function ChatInterface({ username, room, socket, onLogout }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [usersInRoom, setUsersInRoom] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [selectedPrivateChatUser, setSelectedPrivateChatUser] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // These listeners are specific to the chat interface.
    socket.on('message', (msg) => {
      setMessages((prevMessages) => [...prevMessages, msg]);
      if (msg.isPrivate && msg.senderId !== socket.id) {
        socket.emit('messageRead', { messageId: msg.id, roomId: msg.room });
      } else if (!msg.isPrivate && msg.username !== username && msg.room === room) {
        socket.emit('messageRead', { messageId: msg.id, roomId: msg.room });
      }
    });

    socket.on('messageUpdated', (updatedMsg) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) => (msg.id === updatedMsg.id ? updatedMsg : msg))
      );
    });

    socket.on('roomUsers', (users) => {
      setUsersInRoom(users);
    });

    socket.on('typing', (typerUsername) => {
      setTypingUsers((prevTypingUsers) => {
        if (!prevTypingUsers.includes(typerUsername)) {
          return [...prevTypingUsers, typerUsername];
        }
        return prevTypingUsers;
      });
    });

    socket.on('stopTyping', (typerUsername) => {
      setTypingUsers((prevTypingUsers) =>
        prevTypingUsers.filter((user) => user !== typerUsername)
      );
    });

    socket.on('roomMessages', (roomMessages) => {
      setMessages(roomMessages);
      roomMessages.forEach(msg => {
        if (msg.username !== username && !msg.readBy.includes(socket.id)) {
          socket.emit('messageRead', { messageId: msg.id, roomId: msg.room });
        }
      });
    });

    // Cleanup on unmount
    return () => {
      socket.off('message');
      socket.off('messageUpdated');
      socket.off('roomUsers');
      socket.off('typing');
      socket.off('stopTyping');
      socket.off('roomMessages');
      // Do NOT turn off 'connect' or 'disconnect' here, as they are managed by the parent App.jsx
    };
  }, [username, room, socket]); // Include socket in dependency array

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedPrivateChatUser]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      if (selectedPrivateChatUser) {
        socket.emit('privateMessage', {
          recipientId: selectedPrivateChatUser.id,
          message: message.trim()
        });
      } else {
        socket.emit('chatMessage', message.trim());
      }
      setMessage('');
      socket.emit('stopTyping');
    }
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    if (e.target.value.length > 0) {
      socket.emit('typing');
    } else {
      socket.emit('stopTyping');
    }
  };

  const startPrivateChat = (user) => {
    setSelectedPrivateChatUser(user);
    console.log(`Starting private chat with ${user.username}`);
  };

  const switchToRoomChat = () => {
    setSelectedPrivateChatUser(null);
  };

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-white rounded-lg shadow-md overflow-hidden">
      {/* Left Panel: Users in Room / Private Chat Selector */}
      <div className="w-full md:w-1/4 bg-blue-700 text-white p-4 flex flex-col border-r border-blue-600">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <UserGroupIcon className="h-6 w-6 mr-2" />
          Users in {room}
        </h2>
        <div className="flex-grow overflow-y-auto custom-scrollbar">
          {usersInRoom.map((user) => (
            <div
              key={user.id}
              className={`flex items-center p-2 rounded-md mb-2 cursor-pointer transition-colors duration-200
                          ${user.id === socket.id ? 'bg-blue-600' : 'hover:bg-blue-600'}
                          ${selectedPrivateChatUser && selectedPrivateChatUser.id === user.id ? 'bg-blue-800' : ''}`}
              onClick={() => startPrivateChat(user)}
            >
              <UserIcon className="h-5 w-5 mr-2" />
              <span>{user.username} {user.id === socket.id && '(You)'}</span>
              <span className="ml-auto text-xs opacity-70">ID: {user.id.substring(0, 4)}...</span>
            </div>
          ))}
        </div>
        {selectedPrivateChatUser && (
          <button
            onClick={switchToRoomChat}
            className="mt-4 bg-blue-600 hover:bg-blue-800 text-white py-2 px-4 rounded-md transition duration-150 ease-in-out flex items-center justify-center"
          >
            <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />
            Back to Room Chat
          </button>
        )}
        {/* Added Logout button */}
        <button
          onClick={onLogout}
          className="mt-4 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition duration-150 ease-in-out flex items-center justify-center"
        >
          Logout
        </button>
      </div>

      {/* Right Panel: Chat Messages */}
      <div className="flex-1 flex flex-col p-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
          <ChatBubbleLeftRightIcon className="h-6 w-6 mr-2 text-blue-600" />
          {selectedPrivateChatUser ? `Private Chat with ${selectedPrivateChatUser.username}` : `Room: ${room}`}
        </h2>
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          {messages
            .filter(msg => {
              if (selectedPrivateChatUser) {
                return msg.isPrivate && (
                  (msg.senderId === socket.id && msg.recipientId === selectedPrivateChatUser.id) ||
                  (msg.senderId === selectedPrivateChatUser.id && msg.recipientId === socket.id)
                );
              } else {
                return !msg.isPrivate && msg.room === room;
              }
            })
            .map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.username === username ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg shadow-md relative
                              ${msg.username === username ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
                >
                  <div className="font-semibold text-sm mb-1">
                    {msg.isPrivate ? (
                      <span className="text-purple-200">
                        {msg.senderId === socket.id ? 'You' : msg.username} (Private)
                      </span>
                    ) : (
                      msg.username
                    )}
                  </div>
                  <div>{msg.text}</div>
                  <div className="text-xs opacity-75 mt-1 flex justify-between items-center">
                    <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    {msg.username === username && (
                      <span className="ml-2 text-xs">
                        {msg.isPrivate ? (
                          msg.readBy && msg.readBy.includes(selectedPrivateChatUser?.id) ? (
                            <span title="Read by recipient">✓✓</span>
                          ) : (
                            <span title="Delivered">✓</span>
                          )
                        ) : (
                          msg.readBy && msg.readBy.length > 1 ? (
                            <span title={`Read by ${msg.readBy.length - 1} other(s)`}>✓✓</span>
                          ) : (
                            <span title="Delivered">✓</span>
                          )
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          <div ref={messagesEndRef} />
        </div>

        {typingUsers.length > 0 && (
          <div className="text-sm text-gray-600 mt-2">
            {typingUsers.join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex mt-4 space-x-3">
          <input
            type="text"
            value={message}
            onChange={handleTyping}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder={selectedPrivateChatUser ? `Message ${selectedPrivateChatUser.username}...` : "Type a message..."}
          />
          <button
            type="submit"
            className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-150 ease-in-out flex items-center justify-center"
          >
            <PaperAirplaneIcon className="h-5 w-5 rotate-90" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatInterface;