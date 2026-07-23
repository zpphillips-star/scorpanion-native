import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect, Ellipse, Line, Path } from 'react-native-svg';
import { SURFACE3, BORDER, ACCENT, TEXT_FAINT } from '../constants/theme';

// SVG Icons matching the web app exactly
function ScheduleIcon({ active }: { active: boolean }) {
  const color = active ? ACCENT : TEXT_FAINT;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Line x1={3} y1={6} x2={21} y2={6} stroke={color} strokeWidth={2} />
      <Line x1={3} y1={12} x2={21} y2={12} stroke={color} strokeWidth={2} />
      <Line x1={3} y1={18} x2={21} y2={18} stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function CalendarIcon({ active }: { active: boolean }) {
  const color = active ? ACCENT : TEXT_FAINT;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Rect x={3} y={4} width={18} height={18} rx={2} ry={2} stroke={color} strokeWidth={2} />
      <Line x1={16} y1={2} x2={16} y2={6} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={8} y1={2} x2={8} y2={6} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={3} y1={10} x2={21} y2={10} stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function StandingsIcon({ active }: { active: boolean }) {
  const color = active ? ACCENT : TEXT_FAINT;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Path
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TeamsIcon({ active }: { active: boolean }) {
  const color = active ? ACCENT : TEXT_FAINT;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Rect x={3} y={3} width={7} height={7} rx={1} stroke={color} strokeWidth={2} />
      <Rect x={14} y={3} width={7} height={7} rx={1} stroke={color} strokeWidth={2} />
      <Rect x={14} y={14} width={7} height={7} rx={1} stroke={color} strokeWidth={2} />
      <Rect x={3} y={14} width={7} height={7} rx={1} stroke={color} strokeWidth={2} />
    </Svg>
  );
}

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

const TAB_CONFIG = [
  { key: 'schedule',  label: 'Schedule',  Icon: ScheduleIcon },
  { key: 'calendar',  label: 'Calendar',  Icon: CalendarIcon },
  { key: 'index',     label: 'Home',      Icon: null }, // center scorpion button
  { key: 'standings', label: 'Standings', Icon: StandingsIcon },
  { key: 'teams',     label: 'Teams',     Icon: TeamsIcon },
];

export default function CustomTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.nav}>
        {TAB_CONFIG.map((tab, idx) => {
          const route = state.routes.find((r: any) => r.name === tab.key);
          if (!route) return null;
          const routeIndex = state.routes.indexOf(route);
          const active = state.index === routeIndex;
          const isHome = tab.key === 'index';

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!active && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (isHome) {
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={onPress}
                style={styles.homeTab}
                activeOpacity={0.85}
              >
                <View style={[styles.homeButton, active && styles.homeButtonActive]}>
                  <Image
                    source={require('../assets/images/sp-btn.png')}
                    style={styles.homeImage}
                    resizeMode="cover"
                  />
                </View>
                <Text style={[styles.label, active && styles.labelActive]}>Home</Text>
              </TouchableOpacity>
            );
          }

          const { Icon } = tab;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={onPress}
              style={styles.tab}
              activeOpacity={0.75}
            >
              {/* Active indicator line at top */}
              <View style={[styles.activeLine, active && styles.activeLineVisible]} />
              {Icon && <Icon active={active} />}
              <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0c1b31',
    borderTopWidth: 1,
    borderTopColor: '#1e3050',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: 60,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 8,
    gap: 3,
    position: 'relative',
  },
  homeTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    gap: 3,
  },
  homeButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: '#D65820',
    marginBottom: -8,  // float above nav bar
    shadowColor: '#D65820',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
    backgroundColor: '#0c1b31',
  },
  homeButtonActive: {
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  homeImage: {
    width: '100%',
    height: '100%',
  },
  activeLine: {
    position: 'absolute',
    top: 0,
    width: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#D95C17',
  },
  activeLineVisible: {
    width: 22,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: TEXT_FAINT,
    letterSpacing: 0.2,
  },
  labelActive: {
    color: ACCENT,
  },
});
