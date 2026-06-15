import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LandingScreen, LoginScreen, RegisterScreen } from './src/screens/auth';
import { ResidentDashboard } from './src/screens/resident';
import { GuardDashboard } from './src/screens/guard';
import { AdminDashboard } from './src/screens/admin';
import { StatusBar } from 'expo-status-bar';

const Stack = createNativeStackNavigator();

function MainNavigator() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <Stack.Screen name="Landing" component={LandingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        <>
          {user.role === 'resident' && <Stack.Screen name="Resident" component={ResidentDashboard} />}
          {user.role === 'guard' && <Stack.Screen name="Guard" component={GuardDashboard} />}
          {user.role === 'admin' && <Stack.Screen name="Admin" component={AdminDashboard} />}
        </>
      )}
    </Stack.Navigator>
  );
}

import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const prefix = Linking.createURL('/');

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <MainNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
