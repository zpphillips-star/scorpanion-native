import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SportsDataProvider } from '../context/SportsDataContext';
import '../global.css';

export default function RootLayout() {
  return (
    <SportsDataProvider>
      <Tabs
        screenOptions={{
          tabBarStyle: { backgroundColor: '#09090b', borderTopColor: '#27272a' },
          tabBarActiveTintColor: '#3b82f6',
          tabBarInactiveTintColor: '#71717a',
          headerStyle: { backgroundColor: '#09090b' },
          headerTintColor: '#f4f4f5',
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Scores',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="stats-chart" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="schedule"
          options={{
            title: 'Schedule',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="calendar" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="standings"
          options={{
            title: 'Standings',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="trophy" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="teams"
          options={{
            title: 'Teams',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="people" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </SportsDataProvider>
  );
}
