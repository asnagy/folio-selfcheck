import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { IdleWarningDialog } from '@/components/IdleWarningDialog';
import { AccountScreen } from '@/screens/AccountScreen';
import { AdminPinScreen } from '@/screens/AdminPinScreen';
import { CheckoutScreen } from '@/screens/CheckoutScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { PatronSignInScreen } from '@/screens/PatronSignInScreen';
import { RegisterScreen } from '@/screens/RegisterScreen';
import { SessionSummaryScreen } from '@/screens/SessionSummaryScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { palette } from '@/theme';

import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Every screen is headerless and gesture-free.
 *
 * A kiosk must not offer a back swipe: a patron who swipes out of the summary
 * screen back into a live checkout would be operating on a session the app has
 * already closed. Navigation happens only through explicit on-screen buttons.
 */
export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
          animation: 'fade',
          contentStyle: { backgroundColor: palette.background },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="PatronSignIn" component={PatronSignInScreen} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="Account" component={AccountScreen} />
        <Stack.Screen name="SessionSummary" component={SessionSummaryScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="AdminPin" component={AdminPinScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>

      <IdleWarningDialog />
    </NavigationContainer>
  );
}
