// ============================================================
// PWS — App Entry Point
// Navigation: Auth Stack + Main Tab Navigator
// ============================================================
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, NotoSerifKR_400Regular, NotoSerifKR_700Bold } from '@expo-google-fonts/noto-serif-kr';
import { colors, fontSize } from './src/theme';
import { useAuthStore } from './src/stores/authStore';
import { shouldHoldBootScreen } from './src/utils/bootState';
import ErrorBoundary from './src/components/ErrorBoundary';
import OfflineBanner from './src/components/OfflineBanner';
import { logSafeError } from './src/utils/safeLog';

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
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderTopColor:  '#E7E5E2',
          height: 96,
          paddingBottom: 14,
          paddingTop: 10,
        },
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: '#A6A095',
        tabBarLabelStyle: {
          fontSize:   10,
          fontWeight: '600',
          lineHeight: 14,
          marginTop: 4,
        },
        tabBarIconStyle: { marginTop: 0 },
        tabBarItemStyle: { justifyContent: 'center', paddingVertical: 0 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: '홈',
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph variant="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Feedback"
        component={FeedbackScreen}
        options={{
          tabBarLabel: '기록',
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph variant="record" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: '히스토리',
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph variant="history" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: '설정',
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph variant="settings" color={color} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ---- Root App ----
export default function App() {
  const { session, isLoading, isOnboarded, initialize } = useAuthStore();

  const [fontsLoaded, fontError] = useFonts({
    NotoSerifKR_400Regular,
    NotoSerifKR_700Bold,
  });
  const [bootTimedOut, setBootTimedOut] = useState(false);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if ((!isLoading && fontsLoaded) || fontError) return;
    const timeout = setTimeout(() => {
      setBootTimedOut(true);
    }, 8000);
    return () => clearTimeout(timeout);
  }, [isLoading, fontsLoaded, fontError]);

  useEffect(() => {
    if (fontError) {
      logSafeError('[App] font load failed, continuing with fallback font', fontError);
    }
  }, [fontError]);

  if (shouldHoldBootScreen({ isLoading, fontsLoaded, fontError, bootTimedOut })) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
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
                  options={{ headerShown: false, title: '지역 날씨' }}
                />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

function TabGlyph({
  variant,
  color,
  focused,
}: {
  variant: 'home' | 'record' | 'history' | 'settings';
  color: string;
  focused: boolean;
}) {
  return (
    <View style={styles.tabIconWrap}>
      <View style={[styles.tabIndicator, focused && styles.tabIndicatorActive]} />
      <View style={[styles.glyphBox, { borderColor: color, opacity: focused ? 1 : 0.72 }]}>
        {variant === 'home' ? (
          <>
            <View style={[styles.glyphRoof, { borderBottomColor: color }]} />
            <View style={[styles.glyphHomeBase, { backgroundColor: color }]} />
          </>
        ) : null}
        {variant === 'record' ? (
          <>
            <View style={[styles.glyphLine, { backgroundColor: color }]} />
            <View style={[styles.glyphLine, { backgroundColor: color }]} />
            <View style={[styles.glyphLineShort, { backgroundColor: color }]} />
          </>
        ) : null}
        {variant === 'history' ? (
          <View style={styles.glyphGrid}>
            {[0, 1, 2, 3].map((index) => (
              <View key={index} style={[styles.glyphDot, { backgroundColor: color }]} />
            ))}
          </View>
        ) : null}
        {variant === 'settings' ? (
          <>
            <View style={[styles.glyphCircle, { borderColor: color }]} />
            <View style={[styles.glyphKnob, { backgroundColor: color }]} />
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex:            1,
    justifyContent:  'center',
    alignItems:      'center',
    backgroundColor: colors.background,
  },
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
  },
  tabIndicator: {
    width: 32,
    height: 4,
    borderRadius: 999,
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  tabIndicatorActive: {
    backgroundColor: colors.accent,
  },
  glyphBox: {
    width: 22,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginBottom: 1,
  },
  glyphHomeBase: {
    width: 12,
    height: 8,
    borderRadius: 3,
  },
  glyphLine: {
    width: 16,
    height: 3,
    borderRadius: 999,
    marginVertical: 1.5,
  },
  glyphLineShort: {
    width: 10,
    height: 3,
    borderRadius: 999,
    marginVertical: 1.5,
    alignSelf: 'flex-start',
    marginLeft: 3,
  },
  glyphGrid: {
    width: 16,
    height: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  glyphDot: {
    width: 6,
    height: 6,
    borderRadius: 2,
  },
  glyphCircle: {
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 3,
  },
  glyphKnob: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 999,
  },
});
