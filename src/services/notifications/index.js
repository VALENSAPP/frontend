import axiosInstance from "../../services";
import { dedupeRequest, invalidateApiCache } from "../../utils/apiDeduplicator";

export const updateFcmToken = async (data) => {
    return axiosInstance.post('user/update-fcm-token', data);
}

export const getAllNotifactions = async () => {
    return axiosInstance.get('notifications');
}

export const readNotification = async (data) => {
    const res = await axiosInstance.put('notifications/mark-as-read', data);
    invalidateApiCache('notifications/unread-count');
    return res;
}

export const unReadNotification = async () => {
    return dedupeRequest(
        'notifications/unread-count',
        () => axiosInstance.get('notifications/unread-count'),
        { ttlMs: 5000 }
    );
}

export const battleNotification = async () => {
    return axiosInstance.get('notifications/battle');
}
