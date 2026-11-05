// services/socket.js
import io from 'socket.io-client';
import { API_URL } from '../config/urls';

const SOCKET_URL = API_URL;


let socket = null;
let isConnecting = false;
let connectedUserId = null;
let listeners = new Map();

export const initializeSocket = async (userId) => {
  // Attempt to resolve userId if not provided
  let resolvedUserId = userId;
  if (!resolvedUserId) {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      resolvedUserId = await AsyncStorage.getItem('userId');
    } catch (e) {
      console.warn('Unable to read userId from AsyncStorage during socket init');
    }
  }

  if (socket?.connected && connectedUserId === resolvedUserId) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  if (isConnecting) {
    return null;
  }

  isConnecting = true;

  try {
    socket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      query: resolvedUserId ? { userId: resolvedUserId } : {},
    });
    connectedUserId = resolvedUserId;

    socket.on('connect', () => {
      if (resolvedUserId) {
        getUserChatBox(resolvedUserId);
      }
    });

    socket.on('disconnect', (reason) => {
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        type: error.type,
        description: error.description
      });
    });

    socket.on('reconnect', (attemptNumber) => {
      // Re-request chat box on reconnect
      if (resolvedUserId) {
        try {
          getUserChatBox(resolvedUserId);
        } catch (_) {}
      }
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
    });

    socket.on('reconnect_error', (error) => {
      console.error('❌ Reconnection error:', error.message);
    });

    socket.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed after max attempts');
    });

    return socket;
  } catch (err) {
    console.error('❌ initializeSocket error:', err);
    socket = null;
    throw err;
  } finally {
    isConnecting = false;
  }
};

export const getSocket = () => {
  if (!socket) {
    console.warn('⚠️ Socket is not initialized');
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    listeners.clear();
  }
};

// ========================================
// CHAT BOX FUNCTIONS (Conversation List)
// ========================================

/**
 * Get user's chat box (list of all conversations)
 * @param {string} userId - Current user's ID
 */
export const getUserChatBox = (userId) => {
  if (!socket?.connected) {
    console.error('❌ Cannot get chat box: Socket not connected');
    return;
  }
  
  socket.emit('getUserChatBox', { userId });
};

/**
 * Listen for chat box updates
 * @param {function} callback - Callback function to handle chat box data
 */
export const onUserChatBox = (callback) => {
  if (!socket) {
    console.error('❌ Cannot listen to userChatBox: Socket not initialized');
    return;
  }
  
  
  socket.on('userChatBox', (data) => {
    callback(data);
  });
  
  listeners.set('userChatBox', callback);
};

// ========================================
// CONVERSATION FUNCTIONS (Individual Chat)
// ========================================

/**
 * Get conversation with specific user
 * @param {string} userId - Current user's ID  
 * @param {string} otherUserId - Other user's ID
 */
export const getConversation = (userId, otherUserId) => {
  if (!socket?.connected) {
    console.error('❌ Cannot get conversation: Socket not connected');
    return;
  }
  
  // ✅ FIXED: Use userId and otherUserId as backend expects
  socket.emit('getConversation', { userId, otherUserId });
};

/**
 * Listen for conversation updates
 * @param {function} callback - Callback function to handle conversation data
 */
export const onUserConversation = (callback) => {
  if (!socket) {
    console.error('❌ Cannot listen to userConversation: Socket not initialized');
    return;
  }
  
  
  socket.on('userConversation', (data) => {
    callback(data);
  });
  
  listeners.set('userConversation', callback);
};

// ========================================
// MESSAGE FUNCTIONS
// ========================================

/**
 * Send a message
 * @param {object} messageData - Message data
 */
export const sendMessage = (messageData) => {
  if (!socket?.connected) {
    console.error('❌ Cannot send message: Socket not connected');
    return;
  }
  
  socket.emit('sendMessage', messageData);
};

/**
 * Listen for new messages
 * @param {function} callback - Callback function to handle new messages
 */
export const onNewMessage = (callback) => {
  if (!socket) {
    console.error('❌ Cannot listen to newMessage: Socket not initialized');
    return;
  }
  
  
  socket.on('newMessage', (message) => {
    callback(message);
  });
  
  listeners.set('newMessage', callback);
};

/**
 * Listen for message sent confirmation
 * @param {function} callback - Callback function to handle sent message confirmation
 */
export const onMessageSent = (callback) => {
  if (!socket) {
    console.error('❌ Cannot listen to messageSent: Socket not initialized');
    return;
  }
  
  
  socket.on('messageSent', (data) => {
    callback(data);
  });
  
  listeners.set('messageSent', callback);
};

// ========================================
// TYPING INDICATOR FUNCTIONS
// ========================================

/**
 * Emit typing indicator
 * @param {string} receiverId - User ID who should see typing indicator
 */
export const emitTyping = (receiverId) => {
  if (!socket?.connected) {
    console.error('❌ Cannot emit typing: Socket not connected');
    return;
  }
  
  socket.emit('typing', { receiverId });
};

/**
 * Emit stop typing indicator
 * @param {string} receiverId - User ID who should see stop typing
 */
export const emitStopTyping = (receiverId) => {
  if (!socket?.connected) {
    console.error('❌ Cannot emit stopTyping: Socket not connected');
    return;
  }
  
  socket.emit('stopTyping', { receiverId });
};

/**
 * Listen for typing indicator
 * @param {function} callback - Callback function to handle typing event
 */
export const onTyping = (callback) => {
  if (!socket) {
    console.error('❌ Cannot listen to typing: Socket not initialized');
    return;
  }
  
  
  socket.on('typing', (data) => {
    callback(data);
  });
  
  listeners.set('typing', callback);
};

/**
 * Listen for stop typing indicator
 * @param {function} callback - Callback function to handle stop typing event
 */
export const onStopTyping = (callback) => {
  if (!socket) {
    console.error('❌ Cannot listen to stopTyping: Socket not initialized');
    return;
  }
  
  
  socket.on('stopTyping', (data) => {
    callback(data);
  });
  
  listeners.set('stopTyping', callback);
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Remove specific event listener
 * @param {string} eventName - Name of the event
 */
export const removeListener = (eventName) => {
  if (socket && listeners.has(eventName)) {
    const callback = listeners.get(eventName);
    socket.off(eventName, callback);
    listeners.delete(eventName);
  }
};

/**
 * Remove all listeners
 */
export const removeAllListeners = () => {
  if (socket) {
    listeners.forEach((callback, eventName) => {
      socket.off(eventName, callback);
    });
    listeners.clear();
  }
};

/**
 * Check if socket is connected
 * @returns {boolean} - Connection status
 */
export const isSocketConnected = () => {
  const connected = socket?.connected || false;
  return connected;
};

// ========================================
// MY CLOSET CHAT FUNCTIONS
// ========================================

/**
 * Get user's closet chat threads
 * @param {string} userId - Current user's ID
 */
export const getClosetChatThreads = (userId) => {
  if (!socket?.connected) {
    console.error('❌ Cannot get closet chat threads: Socket not connected');
    return;
  }
  socket.emit('getClosetChatThreads', { userId });
};

/**
 * Get closet chat messages in a thread
 * @param {string} userId - Current user's ID
 * @param {string} threadId - Closet chat thread ID
 * @param {number} page - Page number
 * @param {number} limit - Number of messages per page
 */
export const getClosetChatMessages = (userId, threadId, page = 1, limit = 20) => {
  if (!socket?.connected) {
    console.error('❌ Cannot get closet chat messages: Socket not connected');
    return;
  }
  socket.emit('getClosetChatMessages', { userId, threadId, page, limit });
};

/**
 * Send closet chat message
 * @param {string} userId - Current user's ID
 * @param {string} threadId - Closet chat thread ID
 * @param {string} message - Message content
 */
export const sendClosetChatMessage = (userId, threadId, message) => {
  if (!socket?.connected) {
    console.error('❌ Cannot send closet chat message: Socket not connected');
    return;
  }
  socket.emit('sendClosetChatMessage', { userId, threadId, message });
};

/**
 * Mark closet chat message as seen
 * @param {string} userId - Current user's ID
 * @param {string} messageId - Message ID
 */
export const markClosetChatMessageSeen = (userId, messageId) => {
  if (!socket?.connected) {
    console.error('❌ Cannot mark closet chat message seen: Socket not connected');
    return;
  }
  socket.emit('markClosetChatMessageSeen', { userId, messageId });
};