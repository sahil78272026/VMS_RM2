import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { AuthService } from '../services';

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: any) => {
  const [user, setUser]       = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored = await AsyncStorage.getItem('user');
        const token  = await AsyncStorage.getItem('access_token');
        if (stored && token) {
          setUser(JSON.parse(stored));
        } else {
          await AsyncStorage.clear();
        }
      } catch { await AsyncStorage.clear(); }
      setLoading(false);
    };
    loadUser();
  }, []);

  const login = useCallback(async (phone: string, password: string) => {
    let expo_push_token = null;
    try {
      if (Device.isDevice && Constants.appOwnership !== 'expo') {
        const Notifications = await import('expo-notifications');
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus === 'granted') {
          const projectId = Constants.expoConfig?.extra?.eas?.projectId;
          const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
          expo_push_token = tokenData.data;
        }
      }
    } catch (e) { console.log('Push token fetch failed:', e); }

    const res  = await AuthService.login({ phone, password, expo_push_token });
    const data = res.data.data;
    await AsyncStorage.setItem('access_token',  data.access_token);
    await AsyncStorage.setItem('refresh_token', data.refresh_token);
    await AsyncStorage.setItem('user',          JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await AuthService.logout(); } catch {}
    await AsyncStorage.clear();
    setUser(null);
  }, []);

  const isRole = useCallback((role: string) => user?.role === role, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
