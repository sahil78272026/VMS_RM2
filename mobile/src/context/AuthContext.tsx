import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { AuthService } from '../services';

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: any) => {
  const [user, setUser]                       = useState<any>(null);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [societies, setSocieties]             = useState<any[]>([]);
  const [loading, setLoading]                 = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored          = await AsyncStorage.getItem('user');
        const token           = await AsyncStorage.getItem('access_token');
        const storedProfileId = await AsyncStorage.getItem('active_profile_id');
        if (stored && token) {
          const parsedUser = JSON.parse(stored);
          setUser(parsedUser);
          const userSocieties = parsedUser.societies || [];
          setSocieties(userSocieties);
          const defaultProfileId = userSocieties?.[0]?.id ?? null;
          setActiveProfileId(storedProfileId || defaultProfileId);
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
    const res  = await AuthService.login({ phone, password, expo_push_token: null, society_id: requested_society_id });
    const data = res.data.data;

    const userSocieties = data.user?.societies || [];
    const newProfileId = userSocieties?.[0]?.id ?? null;

    const promises = [
      AsyncStorage.setItem('access_token', data.access_token),
      AsyncStorage.setItem('refresh_token', data.refresh_token),
      AsyncStorage.setItem('user', JSON.stringify(data.user))
    ];
    if (data.active_society_id) promises.push(AsyncStorage.setItem('active_society_id', String(data.active_society_id)));
    else promises.push(AsyncStorage.removeItem('active_society_id'));
    if (newProfileId) promises.push(AsyncStorage.setItem('active_profile_id', newProfileId));
    else promises.push(AsyncStorage.removeItem('active_profile_id'));
    await Promise.all(promises);
    
    if (newProfileId) setActiveProfileId(newProfileId);
    else setActiveProfileId(null);

    setUser(data.user);
    setSocieties(userSocieties);
    return data.user;
  }, []);

  const loginWithGoogle = useCallback(async (googleData: { email: string; name?: string; google_id?: string; photo_url?: string; society_id?: number }) => {
    const res = await AuthService.googleLogin({
      ...googleData,
      expo_push_token: null,
    });
    const data = res.data.data;

    const userSocieties = data.user?.societies || [];
    const newProfileId = userSocieties?.[0]?.id ?? null;

    const promises = [
      AsyncStorage.setItem('access_token', data.access_token),
      AsyncStorage.setItem('refresh_token', data.refresh_token),
      AsyncStorage.setItem('user', JSON.stringify(data.user))
    ];
    if (data.active_society_id) promises.push(AsyncStorage.setItem('active_society_id', String(data.active_society_id)));
    else promises.push(AsyncStorage.removeItem('active_society_id'));
    if (newProfileId) promises.push(AsyncStorage.setItem('active_profile_id', newProfileId));
    else promises.push(AsyncStorage.removeItem('active_profile_id'));
    await Promise.all(promises);

    if (newProfileId) setActiveProfileId(newProfileId);
    else setActiveProfileId(null);

    setUser(data.user);
    setSocieties(userSocieties);
    return data.user;
  }, []);

  const switchSociety = useCallback(async (profileId: string) => {
    try {
      const selectedProfile = societies.find(s => s.id === profileId);
      if (!selectedProfile) return;
      const targetSocietyId = selectedProfile.society_id;

      const res = await AuthService.switchSociety(targetSocietyId);
      const data = res.data.data;

      await Promise.all([
        AsyncStorage.setItem('access_token', data.access_token),
        AsyncStorage.setItem('refresh_token', data.refresh_token),
        AsyncStorage.setItem('user', JSON.stringify(data.user)),
        AsyncStorage.setItem('active_society_id', String(data.active_society_id)),
        AsyncStorage.setItem('active_profile_id', profileId)
      ]);

      setUser(data.user);
      setActiveProfileId(profileId);
      setSocieties(data.user.societies || []);
      return data;
    } catch (err) {
      console.error('Failed to switch society:', err);
      throw err;
    }
  }, [societies]);

  const sendOtp = useCallback(async (phone: string) => {
    const res = await AuthService.sendOtp(phone);
    return res.data;
  }, []);

  const verifyOtp = useCallback(async (phone: string, otp: string, requested_society_id?: number) => {
    const res = await AuthService.verifyOtp({ phone, otp, expo_push_token: null, society_id: requested_society_id });
    const data = res.data.data;

    if (data.is_new_user) {
      return data;
    }

    const userSocieties = data.user?.societies || [];
    const newProfileId = userSocieties?.[0]?.id ?? null;

    const promises = [
      AsyncStorage.setItem('access_token', data.access_token),
      AsyncStorage.setItem('refresh_token', data.refresh_token),
      AsyncStorage.setItem('user', JSON.stringify(data.user))
    ];
    if (data.active_society_id) promises.push(AsyncStorage.setItem('active_society_id', String(data.active_society_id)));
    else promises.push(AsyncStorage.removeItem('active_society_id'));
    if (newProfileId) promises.push(AsyncStorage.setItem('active_profile_id', newProfileId));
    else promises.push(AsyncStorage.removeItem('active_profile_id'));
    await Promise.all(promises);

    if (newProfileId) setActiveProfileId(newProfileId);
    else setActiveProfileId(null);

    setUser(data.user);
    setSocieties(userSocieties);
    return data.user;
  }, []);

  const registerResident = useCallback(async (registerData: any) => {
    const res = await AuthService.register(registerData);
    const data = res.data.data;

    if (data.access_token) {
      const userSocieties = data.user?.societies || [];
      const newProfileId = userSocieties?.[0]?.id ?? null;

      const promises = [
        AsyncStorage.setItem('access_token', data.access_token),
        AsyncStorage.setItem('refresh_token', data.refresh_token),
        AsyncStorage.setItem('user', JSON.stringify(data.user))
      ];
      if (data.active_society_id) promises.push(AsyncStorage.setItem('active_society_id', String(data.active_society_id)));
      else promises.push(AsyncStorage.removeItem('active_society_id'));
      if (newProfileId) promises.push(AsyncStorage.setItem('active_profile_id', newProfileId));
      else promises.push(AsyncStorage.removeItem('active_profile_id'));
      await Promise.all(promises);

      if (newProfileId) setActiveProfileId(newProfileId);
      else setActiveProfileId(null);
      
      setUser(data.user);
      setSocieties(userSocieties);
    }
    return data;
  }, []);

  const logout = useCallback(async () => {
    try { await AuthService.logout(); } catch {}
    await AsyncStorage.clear();
    setUser(null);
    setActiveProfileId(null);
    setSocieties([]);
  }, []);

  const isRole = useCallback((role: string) => user?.role === role, [user]);

  const activeSociety = societies.find(s => s.id === activeProfileId) || societies[0] || null;
  const effectiveSocietyId = activeSociety?.society_id || null;
  const activeRole = activeSociety?.role || user?.role || null;

  return (
    <AuthContext.Provider value={{
      user,
      activeSocietyId: effectiveSocietyId,
      activeRole,
      activeProfileId: activeSociety?.id || null,
      activeSociety,
      societies,
      loading,
      login,
      sendOtp,
      verifyOtp,
      registerResident,
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
