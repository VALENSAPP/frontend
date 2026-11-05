// hooks/useSocket.js
import { useEffect } from "react";
import { getSocket } from "../services/socket";
 
export default function useSocket(eventName, callback, deps = []) {
  useEffect(() => {
    const socket = getSocket();
    if (!socket) {
      console.warn(`⚠️ [useSocket] Cannot register listener for event "${eventName}": Socket not initialized.`);
      return;
    }

    const loggedCallback = (...args) => {
      callback(...args);
    };

    socket.on(eventName, loggedCallback);

    return () => {
      socket.off(eventName, loggedCallback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventName, ...deps]);
}