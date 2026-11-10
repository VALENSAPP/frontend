// Toggle between Development and Production URLs here
export const IS_PRODUCTION = false; // Set to true for production

export const DEV_API_URL = 'https://api.valens.app/';
export const PROD_API_URL = 'https://prod-api.valens.app/';

export const API_URL = IS_PRODUCTION ? PROD_API_URL : DEV_API_URL;

// Base URL without trailing slash (used for image prefixes and link sharing)
export const BASE_URL = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;

// Dedicated AI backend URL (Dralens chat, AI comment replies, etc.)
export const AI_API_URL = 'http://192.168.29.203:8000/api/v1';
