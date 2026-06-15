import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const debuggerHost = Constants.expoConfig?.hostUri;
const localhost = debuggerHost?.split(':')[0] || '10.0.2.2';
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || `http://${localhost}:5000/api/v1`;

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (err) => Promise.reject(err));

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response && err.response.data) {
      const data = err.response.data;
      let msg = data.message;
      if (data.error && data.error.details) {
         const detailsStr = typeof data.error.details === 'string' ? data.error.details : JSON.stringify(data.error.details);
         msg = msg ? `${msg} (${detailsStr})` : detailsStr;
      } else if (data.detail) {
         const detailStr = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
         msg = msg ? `${msg} (${detailStr})` : detailStr;
      }
      if (msg) err.response.data.message = msg;
    }
    const orig = err.config;
    if (err.response?.status === 401 && !orig._retry) {
      orig._retry = true;
      const refresh = await AsyncStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const r = await axios.post(`${BASE_URL}/auth/refresh`, {}, { headers: { Authorization: `Bearer ${refresh}` } });
          const t = r.data.data.access_token;
          await AsyncStorage.setItem('access_token', t);
          orig.headers.Authorization = `Bearer ${t}`;
          return api(orig);
        } catch { await AsyncStorage.clear(); }
      } else { await AsyncStorage.clear(); }
    }
    return Promise.reject(err);
  }
);

export default api;
