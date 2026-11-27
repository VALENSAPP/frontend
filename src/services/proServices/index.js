import axiosInstance from '..';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Valens Pro-Services API Service
 * Base path: /pro-services
 */

// Helper to sanitize payload and remove undefined/null
const sanitize = obj => {
  if (!obj || typeof obj !== 'object') return obj;
  const clean = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined && obj[key] !== null) {
      clean[key] = obj[key];
    }
  });
  return clean;
};

// ── 1. Provider APIs ─────────────────────────────────────────────────────────

/**
 * Check provider eligibility to create/sell services.
 * GET /pro-services/provider/eligibility
 */
export const getProviderEligibility = async () => {
  return axiosInstance.get('pro-services/provider/eligibility');
};

/**
 * Activate provider services account.
 * POST /pro-services/provider/activate
 * @param {{ headline?: string, about?: string, timezone?: string }} data
 */
export const activateProvider = async (data = {}) => {
  const payload = sanitize({
    headline: data.headline,
    about: data.about,
    timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
  });
  return axiosInstance.post('pro-services/provider/activate', payload);
};

/**
 * Get current provider profile.
 * GET /pro-services/provider/me
 */
export const getProviderProfile = async () => {
  return axiosInstance.get('pro-services/provider/me');
};

/**
 * Update provider profile.
 * PATCH /pro-services/provider/me
 * @param {{ headline?: string, about?: string, timezone?: string }} data
 */
export const updateProviderProfile = async (data = {}) => {
  const payload = sanitize({
    headline: data.headline,
    about: data.about,
    timezone: data.timezone,
  });
  return axiosInstance.patch('pro-services/provider/me', payload);
};

// ── 2. Meta APIs ─────────────────────────────────────────────────────────────

/**
 * Fetch supported service types, categories, and mentorship/event constraints.
 * GET /pro-services/manage/meta/types
 */
export const getServiceMetaTypes = async () => {
  return axiosInstance.get('pro-services/manage/meta/types');
};

// ── 3. Manage Services (CRUD & Wizards) ───────────────────────────────────────

/**
 * Step 1: Create a service draft.
 * POST /pro-services/manage
 * @param {object} data
 */
export const createServiceDraft = async data => {
  return axiosInstance.post('pro-services/manage', data);
};

/**
 * Step 2/Later Steps: Update a service draft or active service.
 * PATCH /pro-services/manage/{id}
 * @param {string} id
 * @param {object} patchData
 */
export const updateService = async (id, patchData) => {
  return axiosInstance.patch(`pro-services/manage/${id}`, patchData);
};

/**
 * Upload service cover image.
 * POST /pro-services/manage/{id}/cover
 * Multipart/form-data with field `cover`.
 * @param {string} id
 * @param {object|string} fileSource - { uri, name, type } or string URI
 */
export const uploadServiceCover = async (id, fileSource) => {
  const formData = new FormData();
  if (typeof fileSource === 'string') {
    const filename = fileSource.split('/').pop() || `cover_${Date.now()}.jpg`;
    formData.append('cover', {
      uri: fileSource,
      name: filename,
      type: 'image/jpeg',
    });
  } else if (fileSource && fileSource.uri) {
    formData.append('cover', {
      uri: fileSource.uri,
      name: fileSource.name || `cover_${Date.now()}.jpg`,
      type: fileSource.type || 'image/jpeg',
    });
  }
  return axiosInstance.post(`pro-services/manage/${id}/cover`, formData);
};

/**
 * Set weekly availability and exception dates.
 * PUT /pro-services/manage/{id}/availability
 * @param {string} id
 * @param {{ timezone: string, rules: Array<{ dayOfWeek: number, start: string, end: string }>, exceptions?: Array<{ date: string, reason?: string }> }} availability
 */
export const setServiceAvailability = async (id, availability) => {
  const payload = {
    timezone: availability.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    rules: availability.rules || [],
    ...(availability.exceptions && availability.exceptions.length > 0 ? { exceptions: availability.exceptions } : {}),
  };
  return axiosInstance.put(`pro-services/manage/${id}/availability`, payload);
};

/**
 * Fetch saved availability for a service.
 * GET /pro-services/manage/{id}/availability
 * @param {string} id
 */
export const getServiceAvailability = async id => {
  return axiosInstance.get(`pro-services/manage/${id}/availability`);
};

/**
 * Set group mentorship cohorts.
 * PUT /pro-services/manage/{id}/cohorts
 * @param {string} id
 * @param {{ cohorts: Array<{ id?: string, startAt: string, seats: number }> } | Array<{ id?: string, startAt: string, seats?: number, capacity?: number }>} data
 */
export const setGroupCohorts = async (id, data) => {
  const list = Array.isArray(data) ? data : (data?.cohorts || []);
  const formatted = list.map(c => ({
    ...(c.id ? { id: c.id } : {}),
    startAt: c.startAt,
    seats: Number(c.seats || c.capacity || 10),
  }));
  return axiosInstance.put(`pro-services/manage/${id}/cohorts`, { cohorts: formatted });
};

/**
 * Set ticket types for an event.
 * PUT /pro-services/manage/{id}/ticket-types
 * @param {string} id
 * @param {{ ticketTypes: Array<{ id?: string, name: string, description?: string, price: number, quantity: number }> } | Array} data
 */
export const setTicketTypes = async (id, data) => {
  const list = Array.isArray(data) ? data : (data?.ticketTypes || []);
  const formatted = list.map(t => ({
    ...(t.id ? { id: t.id } : {}),
    name: t.name,
    description: t.description || '',
    price: Number(t.price) || 0,
    quantity: Number(t.quantity) || 1,
  }));
  return axiosInstance.put(`pro-services/manage/${id}/ticket-types`, { ticketTypes: formatted });
};

/**
 * Upload extras / attachments for a service (e.g. Monthly Package).
 * POST /pro-services/manage/{id}/attachments
 * Multipart/form-data with field `files`
 * @param {string} id
 * @param {Array<object>} files - array of { uri, name, type }
 */
export const uploadServiceAttachments = async (id, files) => {
  const formData = new FormData();
  (Array.isArray(files) ? files : [files]).forEach((file, index) => {
    if (file && file.uri) {
      formData.append('files', {
        uri: file.uri,
        name: file.name || `file_${index}_${Date.now()}`,
        type: file.type || 'application/octet-stream',
      });
    }
  });
  return axiosInstance.post(`pro-services/manage/${id}/attachments`, formData);
};

/**
 * Delete a specific attachment.
 * DELETE /pro-services/manage/{id}/attachments/{attachmentId}
 * @param {string} id
 * @param {string} attachmentId
 */
export const deleteServiceAttachment = async (id, attachmentId) => {
  return axiosInstance.delete(`pro-services/manage/${id}/attachments/${attachmentId}`);
};

/**
 * Get service details, including readiness check before publishing.
 * GET /pro-services/manage/{id}
 * @param {string} id
 */
export const getServiceDetails = async id => {
  return axiosInstance.get(`pro-services/manage/${id}`);
};

/**
 * Publish a draft service or re-publish a paused service.
 * POST /pro-services/manage/{id}/publish
 * @param {string} id
 */
export const publishService = async id => {
  return axiosInstance.post(`pro-services/manage/${id}/publish`);
};

/**
 * Pause an active service.
 * POST /pro-services/manage/{id}/pause
 * @param {string} id
 */
export const pauseService = async id => {
  return axiosInstance.post(`pro-services/manage/${id}/pause`);
};

/**
 * Delete a service.
 * DELETE /pro-services/manage/{id}
 * @param {string} id
 */
export const deleteService = async id => {
  return axiosInstance.delete(`pro-services/manage/${id}`);
};

/**
 * Get provider's own services list.
 * GET /pro-services/manage?type=&status=&page=&limit=
 * @param {{ type?: string, status?: string, page?: number, limit?: number }} params
 */
export const getMyServices = async (params = {}) => {
  return axiosInstance.get('pro-services/manage', { params });
};

// ── 4. Buyer / Browsing APIs ─────────────────────────────────────────────────

/**
 * Fetch services on a provider's public profile.
 * GET /pro-services/users/{userId}?type=&sort=&page=&limit=
 * @param {string} userId
 * @param {{ type?: string, sort?: 'popular'|'newest'|'price_asc'|'price_desc'|'rating', page?: number, limit?: number }} params
 */
export const getUserServices = async (userId, params = {}) => {
  return axiosInstance.get(`pro-services/users/${userId}`, { params });
};

/**
 * Fetch public service details (buyer view).
 * GET /pro-services/{id}
 * @param {string} id
 */
export const getPublicServiceDetails = async id => {
  return axiosInstance.get(`pro-services/${id}`);
};

/**
 * Fetch reviews for a service.
 * GET /pro-services/{id}/reviews?page=&limit=
 * @param {string} id
 * @param {{ page?: number, limit?: number }} params
 */
export const getServiceReviews = async (id, params = {}) => {
  return axiosInstance.get(`pro-services/${id}/reviews`, { params });
};

/**
 * Bookmark / favorite a service.
 * POST /pro-services/{id}/favorite
 * @param {string} id
 */
export const favoriteService = async id => {
  return axiosInstance.post(`pro-services/${id}/favorite`);
};

/**
 * Remove bookmark from a service.
 * DELETE /pro-services/{id}/favorite
 * @param {string} id
 */
export const unfavoriteService = async id => {
  return axiosInstance.delete(`pro-services/${id}/favorite`);
};

/**
 * Get all bookmarked services for the logged-in user.
 * GET /pro-services/me/favorites
 */
export const getMyFavorites = async () => {
  return axiosInstance.get('pro-services/me/favorites');
};
