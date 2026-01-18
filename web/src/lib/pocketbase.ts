import PocketBase from 'pocketbase';

// API URL from environment variable
// If not set, usually defaults to '/' (same origin) or handle logic as needed
const apiUrl = import.meta.env.VITE_API_URL || '/';

export const pb = new PocketBase(apiUrl);
