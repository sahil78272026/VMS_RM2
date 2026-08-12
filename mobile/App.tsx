import React from 'react';
import Toast from 'react-native-toast-message';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LandingScreen, LoginScreen, RegisterScreen } from './src/screens/auth';
import { ResidentDashboard } from './src/screens/resident';
import { GuardDashboard } from './src/screens/guard';
import { AdminDashboard, SuperAdminScreen } from './src/screens/admin';
import { StatusBar } from 'expo-status-bar';

const Stack = createNativeStackNavigator();

function MainNavigator() {
  const { user, loading, activeRole } = useAuth();

  if (loading) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Landing" component={LandingScreen} />
        </>
      ) : (
        <>
          {activeRole === 'super_admin' && (
            <>
              <Stack.Screen name="SuperAdmin" component={SuperAdminScreen} />
              <Stack.Screen name="Admin" component={AdminDashboard} />
            </>
          )}
          {(activeRole === 'admin' || activeRole === 'society_admin') && <Stack.Screen name="Admin" component={AdminDashboard} />}
          {activeRole === 'resident' && <Stack.Screen name="Resident" component={ResidentDashboard} />}
          {activeRole === 'guard' && <Stack.Screen name="Guard" component={GuardDashboard} />}
        </>
      )}
    </Stack.Navigator>
  );
}

import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  } as any),
});

const prefix = Linking.createURL('/');

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <MainNavigator />
        </NavigationContainer>
      </AuthProvider>
      <Toast />
    </SafeAreaProvider>
  );
}
