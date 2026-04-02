// ============================================================
// PWS — App Entry Point
// Navigation: Auth Stack + Main Tab Navigator
// ============================================================
import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, NotoSerifKR_400Regular, NotoSerifKR_700Bold } from '@expo-google-fonts/noto-serif-kr';
import { colors, fontSize } from './src/theme';
import { useAuthStore } from './src/stores/authStore';
import ErrorBoundary from './src/components/ErrorBoundary';
import OfflineBanner from './src/components/OfflineBanner';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import WeatherDetailScreen from './src/screens/WeatherDetailScreen';
import FeedbackScreen from './src/screens/FeedbackScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ---- Main Tab Navigator ----
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor:  colors.border,
          height: 56,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {
          fontSize:   fontSize.xs,
          fontWeight: '500',
        },
        tabBarIconStyle: { display: 'none' },
        tabBarItemStyle: { justifyContent: 'center' },
      }}
    >
      <Tab.Screen name="Home"     component={HomeScreen}     options={{ tabBarLabel: '홈' }} />
      <Tab.Screen name="Feedback" component={FeedbackScreen} options={{ tabBarLabel: '피드백' }} />
      <Tab.Screen name="History"  component={HistoryScreen}  options={{ tabBarLabel: '기록' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: '설정' }} />
    </Tab.Navigator>
  );
}

// ---- Root App ----
export default function App() {
  const { session, isLoading, isOnboarded, initialize } = useAuthStore();

  const [fontsLoaded] = useFonts({
    NotoSerifKR_400Regular,
    NotoSerifKR_700Bold,
  });

  useEffect(() => {
    initialize();
  }, []);

  if (isLoading || !fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.textTertiary} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <OfflineBanner />
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerStyle:       { backgroundColor: colors.background },
              headerTintColor:   colors.textPrimary,
              headerTitleStyle:  { fontWeight: '600', fontSize: fontSize.md },
              contentStyle:      { backgroundColor: colors.background },
              headerShadowVisible: false,
            }}
          >
            {!session ? (
              <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{ headerShown: false }}
              />
            ) : !isOnboarded ? (
              <Stack.Screen
                name="Onboarding"
                component={OnboardingScreen}
                options={{ headerShown: false }}
              />
            ) : (
              <>
                <Stack.Screen
                  name="MainTabs"
                  component={MainTabs}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="WeatherDetail"
                  component={WeatherDetailScreen}
                  options={{ title: '상세 예보' }}
                />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex:            1,
    justifyContent:  'center',
    alignItems:      'center',
    backgroundColor: colors.background,
  },
});
