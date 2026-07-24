import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SportsDataProvider } from '../context/SportsDataContext';
import CustomTabBar from '../components/CustomTabBar';
import { BG } from '../constants/theme';
import { useFonts } from 'expo-font';
import {
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
  BarlowCondensed_800ExtraBold,
  BarlowCondensed_900Black,
} from '@expo-google-fonts/barlow-condensed';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold,
    BarlowCondensed_900Black,
  });
  if (!fontsLoaded) return null;

  return (
    <SportsDataProvider>
      <StatusBar style="light" backgroundColor={BG} />
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="schedule"  options={{ title: 'Schedule' }} />
        <Tabs.Screen name="calendar"  options={{ title: 'Calendar' }} />
        <Tabs.Screen name="index"     options={{ title: 'Home' }} />
        <Tabs.Screen name="standings" options={{ title: 'Standings' }} />
        <Tabs.Screen name="teams"     options={{ title: 'Teams' }} />
        {/* Hidden from tab bar */}
        <Tabs.Screen name="roadmap"          options={{ title: 'Roadmap', href: null }} />
        <Tabs.Screen name="settings"         options={{ title: 'Settings', href: null }} />
        <Tabs.Screen name="auth/login"       options={{ title: 'Sign In', href: null }} />
        <Tabs.Screen name="auth/signup"      options={{ title: 'Sign Up', href: null }} />
        <Tabs.Screen name="auth/forgot-password" options={{ title: 'Forgot Password', href: null }} />
      </Tabs>
    </SportsDataProvider>
  );
}
