import AsyncStorage from '@react-native-async-storage/async-storage';

export const SERVICES_SETTINGS_STORAGE_KEY = '@valens_services_settings_v1';

export const DEFAULT_SERVICES_SETTINGS = {
  name: '',
  title: '',
  whoAreYou: '',
  aboutServices: '',
  whatWillPeopleFindHere: '',
  servicePicture: null,
  location: '',
  updatedAt: null,
};

/**
 * Load saved local draft from AsyncStorage.
 * @returns {Promise<typeof DEFAULT_SERVICES_SETTINGS>}
 */
export const getServicesSettingsDraft = async () => {
  try {
    const raw = await AsyncStorage.getItem(SERVICES_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SERVICES_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SERVICES_SETTINGS,
      ...parsed,
    };
  } catch (error) {
    console.warn('Failed to load services settings draft:', error);
    return { ...DEFAULT_SERVICES_SETTINGS };
  }
};

/**
 * Save current services settings as a local draft in AsyncStorage.
 * @param {object} settings
 * @returns {Promise<{ success: boolean, data?: object, error?: any }>}
 */
export const saveServicesSettingsDraft = async settings => {
  try {
    const payload = {
      name: String(settings?.name || '').trim(),
      title: String(settings?.title || '').trim(),
      whoAreYou: String(settings?.whoAreYou || '').trim(),
      aboutServices: String(settings?.aboutServices || '').trim(),
      whatWillPeopleFindHere: String(settings?.whatWillPeopleFindHere || '').trim(),
      servicePicture: settings?.servicePicture || null,
      location: String(settings?.location || '').trim(),
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(SERVICES_SETTINGS_STORAGE_KEY, JSON.stringify(payload));
    return { success: true, data: payload };
  } catch (error) {
    console.warn('Failed to save services settings draft:', error);
    return { success: false, error };
  }
};

/**
 * Clear the local services settings draft.
 */
export const clearServicesSettingsDraft = async () => {
  try {
    await AsyncStorage.removeItem(SERVICES_SETTINGS_STORAGE_KEY);
    return { success: true };
  } catch (error) {
    console.warn('Failed to clear services settings draft:', error);
    return { success: false, error };
  }
};

/**
 * Backend API Integration Interface (Placeholder for backend deployment).
 * When the backend team confirms the endpoints (e.g. PATCH /services/settings),
 * wire the network call here without modifying the screen component.
 */
export const publishServicesSettings = async (/* settings */) => {
  return {
    success: false,
    status: 'pending_backend',
    message: 'Backend publishing endpoint is pending backend deployment. Changes have been preserved as a local draft.',
  };
};
