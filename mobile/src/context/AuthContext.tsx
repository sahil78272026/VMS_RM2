import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { AuthService } from '../services';

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: any) => {
  const [user, setUser]                       = useState<any>(null);
  const [activeSocietyId, setActiveSocietyId] = useState<number | null>(null);
  const [societies, setSocieties]             = useState<any[]>([]);
  const [loading, setLoading]                 = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored          = await AsyncStorage.getItem('user');
        const token           = await AsyncStorage.getItem('access_token');
        const storedSocietyId = await AsyncStorage.getItem('active_society_id');
        if (stored && token) {
          const parsedUser = JSON.parse(stored);
          setUser(parsedUser);
          setSocieties(parsedUser.societies || []);
          setActiveSocietyId(storedSocietyId ? parseInt(storedSocietyId) : (parsedUser.active_society_id || 1));
        } else {
          await AsyncStorage.clear();
        }
      } catch {
        await AsyncStorage.clear();
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const login = useCallback(async (phone: string, password: string, requested_society_id?: number) => {
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
    } catch (e) {
      console.log('Push token fetch failed:', e);
    }

    const res  = await AuthService.login({ phone, password, expo_push_token, society_id: requested_society_id });
    const data = res.data.data;

    await AsyncStorage.setItem('access_token',      data.access_token);
    await AsyncStorage.setItem('refresh_token',     data.refresh_token);
    await AsyncStorage.setItem('user',              JSON.stringify(data.user));
    if (data.active_society_id) {
      await AsyncStorage.setItem('active_society_id', String(data.active_society_id));
      setActiveSocietyId(data.active_society_id);
    }

    setUser(data.user);
    setSocieties(data.user.societies || []);
    return data.user;
  }, []);

  const loginWithGoogle = useCallback(async (googleData: { email: string; name?: string; google_id?: string; photo_url?: string; society_id?: number }) => {
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
    } catch (e) {
      console.log('Push token fetch failed:', e);
    }

    const res = await AuthService.googleLogin({
      ...googleData,
      expo_push_token,
    });
    const data = res.data.data;

    await AsyncStorage.setItem('access_token',      data.access_token);
    await AsyncStorage.setItem('refresh_token',     data.refresh_token);
    await AsyncStorage.setItem('user',              JSON.stringify(data.user));
    if (data.active_society_id) {
      await AsyncStorage.setItem('active_society_id', String(data.active_society_id));
      setActiveSocietyId(data.active_society_id);
    }

    setUser(data.user);
    setSocieties(data.user.societies || []);
    return data.user;
  }, []);

  const switchSociety = useCallback(async (targetSocietyId: number) => {
    try {
      const res = await AuthService.switchSociety(targetSocietyId);
      const data = res.data.data;

      await AsyncStorage.setItem('access_token',      data.access_token);
      await AsyncStorage.setItem('refresh_token',     data.refresh_token);
      await AsyncStorage.setItem('user',              JSON.stringify(data.user));
      await AsyncStorage.setItem('active_society_id', String(data.active_society_id));

      setUser(data.user);
      setActiveSocietyId(data.active_society_id);
      setSocieties(data.user.societies || []);
      return data;
    } catch (err) {
      console.error('Failed to switch society:', err);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try { await AuthService.logout(); } catch {}
    await AsyncStorage.clear();
    setUser(null);
    setActiveSocietyId(null);
    setSocieties([]);
  }, []);

  const isRole = useCallback((role: string) => user?.role === role, [user]);

  const activeSociety = societies.find(s => s.id === activeSocietyId) || societies[0] || null;

  return (
    <AuthContext.Provider value={{
      user,
      activeSocietyId,
      activeSociety,
      societies,
      loading,
      login,
      loginWithGoogle,
      logout,
      switchSociety,
      isRole
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
