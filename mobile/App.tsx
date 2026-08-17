import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, ActivityIndicator } from 'react-native';
import Toast, { BaseToast } from 'react-native-toast-message';

const ShakeErrorToast = (props: any) => {
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 60, useNativeDriver: true })
    ]).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ translateX: shakeAnimation }], width: '92%' }}>
      <View style={{
        backgroundColor: '#FEF2F2',
        borderColor: '#EF4444',
        borderWidth: 1.5,
        borderRadius: 14,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
        marginTop: 10
      }}>
        <Text style={{ fontSize: 24, marginRight: 12 }}>⚠️</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#991B1B', fontWeight: '800', fontSize: 15, marginBottom: 2 }}>{props.text1}</Text>
          {props.text2 ? <Text style={{ color: '#B91C1C', fontSize: 13, fontWeight: '500' }}>{props.text2}</Text> : null}
        </View>
      </View>
    </Animated.View>
  );
};

const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#10B981', borderLeftWidth: 6, backgroundColor: '#F0FDF4', borderRadius: 12, marginTop: 10, width: '92%' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 15, fontWeight: '800', color: '#065F46' }}
      text2Style={{ fontSize: 13, color: '#047857' }}
    />
  ),
  error: (props: any) => <ShakeErrorToast {...props} />
};

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

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F4F0EA', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#0284C7" />
      </View>
    );
  }

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
      <Toast config={toastConfig} />
    </SafeAreaProvider>
  );
}
