import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SportsDataProvider } from '../context/SportsDataContext';
import { ACCENT, BG, SURFACE3, TEXT_FAINT } from '../constants/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <Ionicons
      name={name}
      size={24}
      color={focused ? ACCENT : TEXT_FAINT}
    />
  );
}

export default function RootLayout() {
  return (
    <SportsDataProvider>
      <StatusBar style="light" backgroundColor={BG} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: SURFACE3,
            borderTopColor: '#1e3050',
            borderTopWidth: 1,
          },
          tabBarActiveTintColor: ACCENT,
          tabBarInactiveTintColor: TEXT_FAINT,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 0.3,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Scores',
            tabBarIcon: ({ focused }) => <TabIcon name="radio-outline" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="schedule"
          options={{
            title: 'Schedule',
            tabBarIcon: ({ focused }) => <TabIcon name="calendar-outline" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="standings"
          options={{
            title: 'Standings',
            tabBarIcon: ({ focused }) => <TabIcon name="trophy-outline" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="teams"
          options={{
            title: 'Teams',
            tabBarIcon: ({ focused }) => <TabIcon name="people-outline" focused={focused} />,
          }}
        />
      </Tabs>
    </SportsDataProvider>
  );
}
