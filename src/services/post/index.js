import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import axiosInstance from '..';
import { AI_API_URL } from '../../config/urls';
import { dedupeRequest } from '../../utils/apiDeduplicator';
import { appendStoryAudioFiles } from '../../utils/storyAudioUpload';

const appendMultipartFile = (formData, fieldName, file) => {
  if (!file || !file.uri) return;
  const uri = String(file.uri);
  const normalizedUri = Platform.OS === 'android'
    ? uri
    : (uri.startsWith('file://') ? uri : `file://${uri}`);

  formData.append(fieldName, {
    uri: normalizedUri,
    name: file.name || uri.split('/').pop(),
    type: file.type || 'application/octet-stream',
  });
};

export const createPost = async data => {
  const formData = new FormData();

  if (data.music != null && String(data.music).trim() !== '') {
    formData.append('music', String(data.music).trim());
  }

  if (data.youtubeMusicMeta != null && String(data.youtubeMusicMeta).trim() !== '') {
    const ytm =
      typeof data.youtubeMusicMeta === 'string'
        ? data.youtubeMusicMeta
        : JSON.stringify(data.youtubeMusicMeta);
    formData.append('youtubeMusicMeta', ytm);
  }

  if (data.caption) {
    formData.append("caption", data.caption);
  }

  if (data.text != null) {
    const textValue =
      Array.isArray(data.text) ? JSON.stringify(data.text) : String(data.text);
    formData.append('text', textValue);
  }

  if (data.hashtag != null) {
    const hashtags = Array.isArray(data.hashtag)
      ? data.hashtag
      : String(data.hashtag)
          .split(',')
          .map(item => item.trim())
          .filter(Boolean);
    if (hashtags.length > 0) {
      formData.append('hashtag', JSON.stringify(hashtags));
    }
  }

  if (data.taggedPeople) {
    formData.append("taggedPeople", data.taggedPeople);
  }

  if (Array.isArray(data.taggedPeopleIds) && data.taggedPeopleIds.length > 0) {
    // Send as JSON so backend can parse reliably from multipart form-data.
    formData.append("taggedPeopleIds", JSON.stringify(data.taggedPeopleIds));
  }

  if (Array.isArray(data.taggedPeopleMeta) && data.taggedPeopleMeta.length > 0) {
    formData.append("taggedPeopleMeta", JSON.stringify(data.taggedPeopleMeta));
  }

  if (data.type) {
    formData.append("type", data.type);
  }

  if (data.format) {
    formData.append("format", data.format);
  }

  if (data.visibleTo) {
    formData.append("visibleTo", data.visibleTo);
  }

  const isTrustPost = data.isTrustPost ?? data.communityTrustPost;
  if (isTrustPost != null) {
    formData.append("isTrustPost", isTrustPost ? "true" : "false");
  }

  if (data.raiseAmount) {
    formData.append("raiseAmount", data.raiseAmount);
  }

  if (data.currency) {
    formData.append("currency", data.currency);
  }

  if (data.start_time) {
    formData.append("start_time", data.start_time);
  }

  if (data.end_time) {
    formData.append("end_time", data.end_time);
  }

  if (data.link) {
    formData.append("link", data.link);
  }

  if (data.ebookTitle) {
    formData.append('ebookTitle', String(data.ebookTitle));
  }

  if (data.description != null) {
    formData.append('description', String(data.description));
  }

  if (data.textDescription != null) {
    formData.append('textDescription', String(data.textDescription));
  }

  if (data.allowDownload != null) {
    formData.append('allowDownload', data.allowDownload ? 'true' : 'false');
  }

  // Price and promo code for e-books
  if (data.amount != null) {
    // send as string to form-data
    formData.append('amount', String(data.amount));
  }

  if (data.promoCode != null && String(data.promoCode).trim() !== '') {
    formData.append('promoCode', String(data.promoCode).trim());
  }

if (data.tableContent) {

  data.tableContent.forEach(item => {
    formData.append('tableContents', item);
  });
}

  appendMultipartFile(formData, 'coverImage', data.coverImage);
  appendMultipartFile(formData, 'ebookCover', data.ebookCover);
  appendMultipartFile(formData, 'pdfFile', data.pdfFile);
  appendMultipartFile(formData, 'ebookPdf', data.ebookPdf);
  appendMultipartFile(formData, 'ebookpdf', data.ebookpdf);

  if (data.location != null && String(data.location).trim() !== '') {
    formData.append('location', String(data.location).trim());
  }

  if (Array.isArray(data.media)) {
    data.media.forEach(file => {
      if (!file.type || !file.uri) {
        console.warn("Skipping invalid file:", file);
        return;
      }

      const uri = String(file.uri);
      const normalizedUri = Platform.OS === 'android'
        ? uri
        : (uri.startsWith('file://') ? uri : `file://${uri}`);

      formData.append("images", {
        uri: normalizedUri,
        name: file.name || uri.split("/").pop(),
        type: file.type,
      });
    });
  }

  if (Array.isArray(data.images)) {
    data.images.forEach(file => {
      if (!file || !file.uri) {
        console.warn("Skipping invalid image file:", file);
        return;
      }

      const uri = String(file.uri);
      const normalizedUri = Platform.OS === 'android'
        ? uri
        : (uri.startsWith('file://') ? uri : `file://${uri}`);

      formData.append("images", {
        uri: normalizedUri,
        name: file.name || uri.split("/").pop(),
        type: file.type || "image/jpeg",
      });
    });
  }

  if (data.videoText === true || data.videoText === 'true') {
    formData.append('videoText', 'true');
  }

  if (data.videoTextItems != null) {
    const items =
      typeof data.videoTextItems === 'string'
        ? data.videoTextItems
        : JSON.stringify(data.videoTextItems);
    formData.append('videoTextItems', items);
  }

  if (data.postMeta != null) {
    const meta =
      typeof data.postMeta === 'string' ? data.postMeta : JSON.stringify(data.postMeta);
    formData.append('postMeta', meta);
  }

  // Same shape as story upload (`story/upload`): lets backend reuse `storyMeta` + `audio_0`… handling.
  if (data.storyMeta != null) {
    const sm =
      typeof data.storyMeta === 'string' ? data.storyMeta : JSON.stringify(data.storyMeta);
    formData.append('storyMeta', sm);
  }

  if (Array.isArray(data.storyAudioClips) && data.storyAudioClips.length > 0) {
    await appendStoryAudioFiles(formData, data.storyAudioClips);
  }
  return axiosInstance.post('post/create', formData);
}

export const getPostByUser = async (userId, type = '') => {
  if (!userId || typeof userId !== 'string') {
    throw new Error('getPostByUser: you must pass a valid userId');
  }

  return axiosInstance.get('post/by-user', {
    params: {
      userId,
      type,
    },
  });
};

export const getMarketPlaceEbook = async (userId) => {
  if (!userId) {
    throw new Error('getMarketPlaceEbook: you must pass a valid userId');
  }

  return axiosInstance.get('post/getMarketPlaceEbook', {
    params: {
      userId,
    },
  });
};

export const getMyEbookLibrary = async () => {
  return axiosInstance.get('post/myEbookLibrary');
};

export const getPurchasedEbooks = async () => {
  return axiosInstance.get('marketplace-ebooks/purchasedEbook');
};

export const getMarketplaceEbooksByClosetId = async (closetId) => {
  if (!closetId) {
    throw new Error('getMarketplaceEbooksByClosetId: closetId is required');
  }
  return axiosInstance.get(`marketplace-ebooks/closet/${closetId}`);
};

export const getMarketplaceEbookById = async (ebookId) => {
  if (!ebookId) {
    throw new Error('getMarketplaceEbookById: ebookId is required');
  }
  return axiosInstance.get(`marketplace-ebooks/byEbookId/${ebookId}`);
};

export const getMarketPlaceEbookById = async (postId) => {
  if (!postId || typeof postId !== 'string') {
    throw new Error('getMarketPlaceEbookById: you must pass a valid postId');
  }

  return axiosInstance.get(`post/getMarketPlaceEbookById/${postId}`);
};

export const deleteMarketplaceEbook = async (ebookId) => {
  return axiosInstance.delete(`marketplace-ebooks/${ebookId}`);
};

export const createMarketplaceEbook = async data => {
  const formData = new FormData();

  if (data.closetId) {
    formData.append('closetId', data.closetId);
  }
  if (data.caption) {
    formData.append('caption', data.caption);
  }
  if (data.text != null) {
    const textValue = Array.isArray(data.text) ? data.text.join('\n') : String(data.text);
    formData.append('text', textValue);
  }
  if (data.amount != null) {
    formData.append('amount', String(data.amount));
  }
  if (data.isDownload != null) {
    formData.append('isDownload', data.isDownload ? 'true' : 'false');
  }
  if (data.promoCode != null && String(data.promoCode).trim() !== '') {
    formData.append('promoCode', String(data.promoCode).trim());
  }
  if (data.tableContent != null) {
    const tableContentValue = Array.isArray(data.tableContent)
      ? JSON.stringify(data.tableContent)
      : String(data.tableContent);
    formData.append('tableContent', tableContentValue);
  }

  appendMultipartFile(formData, 'ebookpdf', data.ebookpdf);

  if (Array.isArray(data.images)) {
    data.images.forEach(file => {
      if (!file || !file.uri) {
        console.warn('Skipping invalid image file:', file);
        return;
      }

      const uri = String(file.uri);
      const normalizedUri = Platform.OS === 'android'
        ? uri
        : (uri.startsWith('file://') ? uri : `file://${uri}`);

      formData.append('images', {
        uri: normalizedUri,
        name: file.name || uri.split('/').pop(),
        type: file.type || 'image/jpeg',
      });
    });
  }

  return axiosInstance.post('marketplace-ebooks/create', formData);
};

export const getPostById = async (postId) => {
  if (!postId || typeof postId !== 'string') {
    throw new Error('getPostById: you must pass a valid postId');
  }
  return await axiosInstance.get(`post/by-id/${postId}`);

};

export async function getUserCredentials(userId) {
  return dedupeRequest(
    `user/profile:${userId}`,
    () => axiosInstance.get(`user/profile?userId=${userId}`),
    { ttlMs: 4000 }
  );
}

export async function getUserDashboard(userId) {
  return dedupeRequest(
    `user/dashboard:${userId}`,
    () => axiosInstance.get(`user/dashboard?userId=${userId}`),
    { ttlMs: 4000 }
  );
}

// services/post.js
export async function savePost(postId) {
  return axiosInstance.post('/post/save', { postId });
}

export async function unSavePost(postId) {
  return axiosInstance.post('/post/unsave', { postId });
}

export async function getPostlikes(postId) {
  return axiosInstance.get(`post/like/list?postId=${postId}`);
}

export async function likePost(postId) {
  return axiosInstance.post('/post/like', { postId });
}

export async function getComments(postId) {
  return axiosInstance.get(`post/comment/list?postId=${postId}`);
}

export async function postComment(postId, comment, parentCommentId = null) {
  const payload = { postId, comment };
  if (parentCommentId) {
    payload.parentCommentId = parentCommentId;
  }
  return axiosInstance.post('/post/comment', payload);
}

export async function postDralensReply({
  postId,
  commentId,
  userQuery,
  postText = '',
  authorUsername = '',
  parentCommentContext = '',
  image,
}) {
  let tempDownloadedFilePath = null;
  const formData = new FormData();

  formData.append('post_id', String(postId || ''));
  formData.append('comment_id', String(commentId || ''));
  formData.append('user_query', String(userQuery || ''));
  formData.append('post_text', String(postText || ''));
  formData.append('author_username', String(authorUsername || ''));
  formData.append('parent_comment_context', String(parentCommentContext || ''));

  if (image?.uri) {
    let uri = String(image.uri);
    const isRemoteUrl = uri.startsWith('http://') || uri.startsWith('https://');

    if (isRemoteUrl) {
      try {
        const ext = (image.name || 'image.jpg').split('.').pop() || 'jpg';
        const localPath = `${RNFS.CachesDirectoryPath}/dralens_${Date.now()}.${ext}`;
        const downloadRes = await RNFS.downloadFile({
          fromUrl: uri,
          toFile: localPath,
        }).promise;
        if (downloadRes.statusCode === 200) {
          uri = Platform.OS === 'android' ? `file://${localPath}` : localPath;
          tempDownloadedFilePath = localPath;
        } else {
          console.warn('Image download returned status:', downloadRes.statusCode);
        }
      } catch (dlErr) {
        console.warn('Failed to download remote image for Dralens:', dlErr);
      }
    } else {
      uri = Platform.OS === 'android' ? uri : (uri.startsWith('file://') ? uri : `file://${uri}`);
    }

    formData.append('image', {
      uri,
      name: image.name || uri.split('/').pop() || 'image.jpg',
      type: image.type || 'image/jpeg',
    });
  }

  try {

    const response = await axiosInstance.post(
      `${AI_API_URL}/ai-comment-reply`,
      formData,
      {
        timeout: 60000,
      }
    );


    return response;

  } catch (error) {

    throw error;
  } finally {
    if (tempDownloadedFilePath) {
      RNFS.unlink(tempDownloadedFilePath).catch(() => {});
    }
  }
}

export async function deleteComment(commentId, postId) {
  return axiosInstance.delete(`/post/deleteComment?commentId=${commentId}&postId=${postId}`);
}

export async function editComment(commentId, comment) {
  return axiosInstance.post('post/editComment', { commentId, comment });
}

export async function deletePost(postId, userId) {
  return axiosInstance.delete('post/delete', {
    params: { postId, userId },
  });
}

export async function editPost(postId, data = {}) {
  if (!postId) {
    throw new Error('editPost: postId is required');
  }

  const formData = new FormData();

  if (data.caption != null) {
    formData.append('caption', String(data.caption));
  }

  if (data.location != null) {
    formData.append('location', String(data.location));
  }

  if (data.hashtag != null) {
    const hashtags = Array.isArray(data.hashtag)
      ? data.hashtag
      : String(data.hashtag)
          .split(',')
          .map(item => item.trim())
          .filter(Boolean);
    formData.append('hashtag', JSON.stringify(hashtags));
  }

  if (data.taggedPeople != null) {
    formData.append('taggedPeople', data.taggedPeople);
  }

  if (Array.isArray(data.taggedPeopleIds) && data.taggedPeopleIds.length > 0) {
    formData.append('taggedPeopleIds', JSON.stringify(data.taggedPeopleIds));
  }

  if (Array.isArray(data.taggedPeopleMeta) && data.taggedPeopleMeta.length > 0) {
    formData.append('taggedPeopleMeta', JSON.stringify(data.taggedPeopleMeta));
  }

  if (data.music != null && String(data.music).trim() !== '') {
    formData.append('music', String(data.music).trim());
  }

  if (data.youtubeMusicMeta != null && String(data.youtubeMusicMeta).trim() !== '') {
    const ytm =
      typeof data.youtubeMusicMeta === 'string'
        ? data.youtubeMusicMeta
        : JSON.stringify(data.youtubeMusicMeta);
    formData.append('youtubeMusicMeta', ytm);
  }

  if (data.videoText === true || data.videoText === 'true') {
    formData.append('videoText', 'true');
  }

  if (data.videoTextItems != null) {
    const items =
      typeof data.videoTextItems === 'string'
        ? data.videoTextItems
        : JSON.stringify(data.videoTextItems);
    formData.append('videoTextItems', items);
  }

  if (data.postMeta != null) {
    const meta =
      typeof data.postMeta === 'string' ? data.postMeta : JSON.stringify(data.postMeta);
    formData.append('postMeta', meta);
  }

  if (Array.isArray(data.media)) {
    data.media.forEach(file => {
      if (!file?.uri) return;
      formData.append('images', {
        uri: Platform.OS === 'android' ? file.uri : file.uri.replace('file://', ''),
        name: file.name || file.uri.split('/').pop(),
        type: file.type || 'image/jpeg',
      });
    });
  }

  Object.entries(data).forEach(([key, value]) => {
    if (
      value === undefined ||
      value === null ||
      [
        'caption',
        'location',
        'hashtag',
        'taggedPeople',
        'taggedPeopleIds',
        'taggedPeopleMeta',
        'music',
        'youtubeMusicMeta',
        'videoText',
        'videoTextItems',
        'postMeta',
        'media',
      ].includes(key)
    ) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(item => {
        formData.append(key, item);
      });
      return;
    }

    formData.append(key, value);
  });

  return axiosInstance.post(`post/edit/${postId}`, formData);
}

export async function follow(followingId) {
  return axiosInstance.post('user/follow', { followingId })
}

export async function unfollow(followingId) {
  return axiosInstance.post('user/unfollow', { followingId })
}

export async function HidePost(postId) {

  return axiosInstance.post('post/hide', { postId })
}

export async function unHidePost(postId) {
  return axiosInstance.post('post/unhide', { postId })
}

export async function getHidePost() {
  return axiosInstance.get('post/getHidePost')
}

export async function sharePost(body) {
  return axiosInstance.post('post/sharepost', body)
}

export async function searchHashtags(params = {}) {
  const q = String(params?.q ?? '').trim();
  const requestParams = { q };
  if (params?.limit != null) {
    requestParams.limit = params.limit;
  }
  return axiosInstance.get('post/hashtags/search', { params: requestParams });
}

export async function GetAllReels() {
  return axiosInstance.get('/post/getAllReel')
}

export async function getHideChatConversation(chatId) {
  return axiosInstance.post('/post/hideChat', { chatId });
}

export async function deleteConversation(conversationIdOrPayload, typeParam = 'NORMAL') {
  let conversationId;
  let type = typeParam;
  if (typeof conversationIdOrPayload === 'object' && conversationIdOrPayload !== null) {
    conversationId = conversationIdOrPayload.conversationId || conversationIdOrPayload.chatId || conversationIdOrPayload.id;
    type = conversationIdOrPayload.type || typeParam || 'NORMAL';
  } else {
    conversationId = conversationIdOrPayload;
  }

  const payload = {
    conversationId: String(conversationId),
    type: type || 'NORMAL',
  };

  console.log('🚀 [deleteConversationApi] Calling POST /post/deleteConversation with payload:', payload);

  try {
    const response = await axiosInstance.post('/post/deleteConversation', payload);
    console.log('✅ [deleteConversationApi] Response received:', response);
    return response;
  } catch (error) {
    console.error('❌ [deleteConversationApi] API Error:', {
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });
    throw error;
  }
}

export const deleteConversationApi = deleteConversation;

export async function chatStatusUpdate(chatId) {
  return axiosInstance.post('/post/chatStatusUpdate', { chatId });
}
export async function reportPost(data) {
  return axiosInstance.post('/post/report', data);
}

export async function postCommentReaction(data) {
  return axiosInstance.post('/post/comment/reaction', data);
}

export async function pinPost(data) {
  return axiosInstance.post('post/pin', data);
}

export async function unpinPost(data) {
  return axiosInstance.post('post/unpin', data);
}
export async function voteTrust(data) {
  const voteTypeMap = {
    agree: 'AGREE',
    not_sure: 'NOT_SURE',
    disagree: 'DISAGREE',
  };
  const rawVoteType = data?.voteType ?? data?.type;
  const voteType = voteTypeMap[rawVoteType] ?? rawVoteType;
  const dataToSend = {
    postId: data?.postId,
    voteType,
    comment: data?.comment || '',
  };
  return axiosInstance.post('post/postTrustVote', dataToSend);
}
export async function getTrustScrore(data) {
  return axiosInstance.post('post/getPostTrustScore', data);
}
export async function unVote(data) {
  return axiosInstance.post('post/removePostTrustVote', data);
}

export async function getvotesDetail(data) {
  return axiosInstance.post('post/getTrustVoteBypostId', data);
}

export async function postMessagePrivate(data) {
  return axiosInstance.post('post-message', data);
}

export async function getMessagesPrivateById(params = {}) {
  const userId = params?.userId || params?.params?.userId || params?.userID || params?.id;

  if (!userId) {
    throw new Error('getMessagesPrivateById: userId is required');
  }

  return axiosInstance.get(`post-message/by-user/${encodeURIComponent(String(userId))}`);
}

export async function getMyMessagesPrivate() {
  return axiosInstance.get('post-message/me');
}

export async function updateMessages(data = {}) {
  return axiosInstance.patch('post-message/me', data);
}
