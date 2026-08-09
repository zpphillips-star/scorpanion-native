import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import Svg, { Path } from 'react-native-svg';
import { BG, ACCENT, TEXT_FAINT, BORDER, TEXT, SURFACE, SURFACE2 } from '../constants/theme';
import { SETTINGS_KEY } from '../lib/alertSettings';
import { getPushRegistrationState, syncPushSubscriptions } from '../lib/pushNotifications';
import { useSportsData } from '../context/SportsDataContext';

interface Settings {
  darkMode: boolean;
  compactScores: boolean;
  scoreFormat: 'live' | 'score';
  gameStartAlerts: boolean;
  scoreChangeAlerts: boolean;
  leadChangeAlerts: boolean;
  finalScoreAlerts: boolean;
  closeGameAlerts: boolean;
  refreshRate: 2 | 5 | 10 | 30;
  preloadData: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  darkMode: true,
  compactScores: false,
  scoreFormat: 'live',
  gameStartAlerts: true,
  scoreChangeAlerts: true,
  leadChangeAlerts: true,
  finalScoreAlerts: true,
  closeGameAlerts: true,
  refreshRate: 5,
  preloadData: false,
};

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path d="M12.5 5L7.5 10L12.5 15" stroke="#a1a1aa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CustomToggle({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <TouchableOpacity
      onPress={() => onValueChange(!value)}
      style={[tog.pill, value && tog.pillActive]}
      activeOpacity={0.8}
    >
      <View style={[tog.thumb, value && tog.thumbActive]} />
    </TouchableOpacity>
  );
}
const tog = StyleSheet.create({
  pill: {
    width: 44, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', padding: 3,
  },
  pillActive: { backgroundColor: '#D95C17' },
  thumb: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#fff', alignSelf: 'flex-start',
  },
  thumbActive: { alignSelf: 'flex-end' },
});

function SectionLabel({ label }: { label: string }) {
  return <Text style={ss.sectionLabel}>{label}</Text>;
}

function SettingRow({ label, right, last }: { label: string; right: React.ReactNode; last?: boolean }) {
  return (
    <View style={[ss.row, !last && ss.rowDivider]}>
      <Text style={ss.rowLabel}>{label}</Text>
      {right}
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { followedTeams } = useSportsData();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const savedOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then(val => {
      if (val) {
        try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(val) }); } catch {}
      }
    });
  }, []);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    if (
      key === 'gameStartAlerts' ||
      key === 'scoreChangeAlerts' ||
      key === 'leadChangeAlerts' ||
      key === 'finalScoreAlerts' ||
      key === 'closeGameAlerts'
    ) {
      getPushRegistrationState().then(state => {
        if (state.expoPushToken || state.nativeDevicePushToken) {
          syncPushSubscriptions(followedTeams, next);
        }
      });
    }
    Animated.sequence([
      Animated.timing(savedOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(savedOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }

  return (
    <View style={[ss.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={ss.header}>
        <TouchableOpacity onPress={() => router.back()} style={ss.backBtn} hitSlop={12}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={ss.title}>Settings</Text>
        <Animated.Text style={[ss.saved, { opacity: savedOpacity }]}>Saved</Animated.Text>
      </View>

      <ScrollView style={ss.scroll} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        {/* Display */}
        <SectionLabel label="Display" />
        <View style={ss.section}>
          <SettingRow
            label="Dark Mode"
            right={<CustomToggle value={settings.darkMode} onValueChange={v => update('darkMode', v)} />}
          />
          <SettingRow
            label="Compact Scores"
            right={<CustomToggle value={settings.compactScores} onValueChange={v => update('compactScores', v)} />}
          />
          <SettingRow
            label="Score Format"
            last
            right={
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {(['live', 'score'] as const).map(opt => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => update('scoreFormat', opt)}
                    style={[ss.chip, settings.scoreFormat === opt && ss.chipActive]}
                  >
                    <Text style={[ss.chipText, settings.scoreFormat === opt && ss.chipTextActive]}>
                      {opt === 'live' ? 'Live w/ clock' : 'Score only'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            }
          />
        </View>

        {/* Notifications */}
        <SectionLabel label="Notifications" />
        <View style={ss.section}>
          <SettingRow
            label="Game Start Alerts"
            right={<CustomToggle value={settings.gameStartAlerts} onValueChange={v => update('gameStartAlerts', v)} />}
          />
          <SettingRow
            label="Score Change Alerts"
            right={<CustomToggle value={settings.scoreChangeAlerts} onValueChange={v => update('scoreChangeAlerts', v)} />}
          />
          <SettingRow
            label="Lead Change Alerts"
            right={<CustomToggle value={settings.leadChangeAlerts} onValueChange={v => update('leadChangeAlerts', v)} />}
          />
          <SettingRow
            label="Final Score Alerts"
            right={<CustomToggle value={settings.finalScoreAlerts} onValueChange={v => update('finalScoreAlerts', v)} />}
          />
          <SettingRow
            label="Close Game Late Alerts"
            last
            right={<CustomToggle value={settings.closeGameAlerts} onValueChange={v => update('closeGameAlerts', v)} />}
          />
        </View>

        {/* Data */}
        <SectionLabel label="Data" />
        <View style={ss.section}>
          <SettingRow
            label="Live Refresh Rate"
            right={
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {([2, 5, 10, 30] as const).map(rate => (
                  <TouchableOpacity
                    key={rate}
                    onPress={() => update('refreshRate', rate)}
                    style={[ss.chip, settings.refreshRate === rate && ss.chipActive]}
                  >
                    <Text style={[ss.chipText, settings.refreshRate === rate && ss.chipTextActive]}>{rate}s</Text>
                  </TouchableOpacity>
                ))}
              </View>
            }
          />
          <SettingRow
            label="Preload Score Data"
            last
            right={<CustomToggle value={settings.preloadData} onValueChange={v => update('preloadData', v)} />}
          />
        </View>

        {/* About */}
        <SectionLabel label="About" />
        <View style={ss.section}>
          <SettingRow
            label="Version"
            right={<Text style={ss.versionText}>{Constants.expoConfig?.version ?? '1.0.0'}</Text>}
          />
          <SettingRow
            label="Send Feedback"
            right={
              <TouchableOpacity onPress={() => router.push('/roadmap' as any)}>
                <Text style={ss.linkText}>Roadmap →</Text>
              </TouchableOpacity>
            }
          />
          <SettingRow
            label="Reset All Settings"
            last
            right={
              <TouchableOpacity
                onPress={() =>
                  Alert.alert('Reset Settings', 'This will clear all settings. Continue?', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Reset',
                      style: 'destructive',
                      onPress: () => { AsyncStorage.clear(); setSettings(DEFAULT_SETTINGS); },
                    },
                  ])
                }
              >
                <Text style={ss.dangerText}>Reset</Text>
              </TouchableOpacity>
            }
          />
        </View>
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: TEXT, fontSize: 20, fontWeight: '700' },
  saved: { color: '#22c55e', fontSize: 13, fontWeight: '600' },
  scroll: { flex: 1 },
  sectionLabel: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: '#52637a',
    textTransform: 'uppercase', marginTop: 20, marginBottom: 8, marginLeft: 4,
  },
  section: {
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.02)', overflow: 'hidden',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.15)' },
  rowLabel: { color: TEXT, fontSize: 15, fontWeight: '500', flex: 1 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  chipActive: { backgroundColor: '#D95C17', borderColor: '#D95C17' },
  chipText: { color: TEXT_FAINT, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  versionText: { color: TEXT_FAINT, fontSize: 14 },
  linkText: { color: ACCENT, fontSize: 14, fontWeight: '600' },
  dangerText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
});
