import axiosInstance from '../../services';

let cachedMessagesUnread = 0;

export const getCachedMessagesUnread = () => cachedMessagesUnread;

export const setCachedMessagesUnread = (count) => {
    const next = Number(count);
    cachedMessagesUnread = Number.isFinite(next) && next > 0 ? next : 0;
};

export const sumConversationUnread = (conversations) => {
    if (!Array.isArray(conversations)) return 0;
    return conversations.reduce((acc, conversation) => {
        if (conversation?.isHidden === true) return acc;
        return acc + (Number(conversation?.unreadCount) || 0);
    }, 0);
};

export const sendMessage = async (body) => {
    return axiosInstance.post('post/sendMessage',body);
}

export const getAllConversations = async () => {
   return await axiosInstance.get(`post/conversations`);
}

export const getConversationById = async (otherUserId) => {
    return axiosInstance.get(`post/conversation/${otherUserId}`);
}

export const getClosetChatMessagesApi = async (threadId, page = 1, limit = 20) => {
    return axiosInstance.get(`closet-chat/threads/${threadId}/messages`, {
        params: { page, limit }
    });
}

export const sendClosetChatMessageApi = async (threadId, message) => {
    return axiosInstance.post(`closet-chat/threads/${threadId}/messages`, { message });
}

export const markClosetChatMessageSeenApi = async (messageId) => {
    return axiosInstance.patch(`closet-chat/messages/${messageId}/seen`);
}

export const getClosetChatThreadsApi = async () => {
    return axiosInstance.get(`closet-chat/threads`);
}