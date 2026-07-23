import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SportsDataProvider } from '../context/SportsDataContext';
import CustomTabBar from '../components/CustomTabBar';
import { BG } from '../constants/theme';

export default function RootLayout() {
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
      </Tabs>
    </SportsDataProvider>
  );
}
