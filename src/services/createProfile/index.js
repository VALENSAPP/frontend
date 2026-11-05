import axiosinstance from '../../services';
import { fetchAndApplyUserLanguage } from '../../i18n';
import { dedupeRequest, invalidateApiCache } from '../../utils/apiDeduplicator';

export const getProfile = async (userId) => {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('getProfile: you must pass a valid userId');
  }
  return dedupeRequest(
    `user/profile:${userId.trim()}`,
    async () => {
      try {
        fetchAndApplyUserLanguage().catch(() => {});
        return await axiosinstance.get('user/profile', {
          params: { userId: userId.trim() }
        });
      } catch (error) {
        throw new Error(
          error?.response?.data?.message || 'Failed to fetch user profile'
        );
      }
    },
    { ttlMs: 4000 }
  );
};

export const EditProfile = async (data) => { 
    const res = await axiosinstance.patch('user/editProfile', data);
    invalidateApiCache(/^user\/profile:/);
    return res;
}

export const checkDisplayName = async (data) => {
    return axiosinstance.post('user/check-display-name', data);
}

export const checkUsername = async (data) => {
    const payload = typeof data === 'string'
      ? { userName: data, username: data }
      : {
          userName: data?.userName || data?.username,
          username: data?.username || data?.userName,
          ...data,
        };
    return axiosinstance.post('user/check-username', payload);
};
