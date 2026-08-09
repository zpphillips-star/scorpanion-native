import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { AlertSettings, DEFAULT_ALERT_SETTINGS, SETTINGS_KEY, toSubscriptionEventTypes } from './alertSettings';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://scorpanion.com';

const DEVICE_ID_KEY = 'scorpanion:push:deviceId';
const PUSH_STATE_KEY = 'scorpanion:push:state';
const FIRST_SEEN_KEY = 'scorpanion:push:firstSeenAt';
const SNOOZE_UNTIL_KEY = 'scorpanion:push:snoozeUntil';

export type PushRegistrationStatus =
  | 'not_requested'
  | 'permission_denied'
  | 'registered'
  | 'backend_disabled'
  | 'error';

export interface PushRegistrationState {
  status: PushRegistrationStatus;
  expoPushToken?: string;
  nativeDevicePushToken?: string;
  deviceId?: string;
  lastRegisteredAt?: string;
  lastError?: string;
}

export interface PushSubscriptionPayload {
  deviceId: string;
  platform: 'android' | 'ios' | 'web' | 'unknown';
  expoPushToken?: string;
  nativeDevicePushToken?: string;
  followedTeamIds: string[];
  eventTypes: ReturnType<typeof toSubscriptionEventTypes>;
  appVersion?: string;
  buildNumber?: string;
  enabled: boolean;
}

function isNativeAndroidOrIos() {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

function getProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ||
    (Constants as any).easConfig?.projectId
  );
}

function randomId() {
  return `device-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export async function getOrCreatePushDeviceId() {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const next = randomId();
  await AsyncStorage.setItem(DEVICE_ID_KEY, next);
  return next;
}

export async function getPushRegistrationState(): Promise<PushRegistrationState> {
  const raw = await AsyncStorage.getItem(PUSH_STATE_KEY);
  if (!raw) return { status: 'not_requested' };
  try {
    return { status: 'not_requested', ...JSON.parse(raw) };
  } catch {
    return { status: 'not_requested' };
  }
}

async function savePushRegistrationState(state: PushRegistrationState) {
  await AsyncStorage.setItem(PUSH_STATE_KEY, JSON.stringify(state));
}

export async function readAlertSettings(): Promise<AlertSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) return DEFAULT_ALERT_SETTINGS;
  try {
    return { ...DEFAULT_ALERT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_ALERT_SETTINGS;
  }
}

export async function ensurePushFirstSeenAt() {
  const existing = await AsyncStorage.getItem(FIRST_SEEN_KEY);
  if (existing) return Number(existing);
  const now = Date.now();
  await AsyncStorage.setItem(FIRST_SEEN_KEY, String(now));
  return now;
}

export async function shouldShowPushOptInBanner(followedTeamCount: number) {
  if (followedTeamCount < 1) return false;
  const state = await getPushRegistrationState();
  if (state.status === 'registered') return false;
  const snoozeUntilRaw = await AsyncStorage.getItem(SNOOZE_UNTIL_KEY);
  if (snoozeUntilRaw && Number(snoozeUntilRaw) > Date.now()) return false;
  const firstSeenAt = await ensurePushFirstSeenAt();
  return Date.now() - firstSeenAt >= 24 * 60 * 60 * 1000;
}

export async function snoozePushOptInBanner(days = 7) {
  await AsyncStorage.setItem(SNOOZE_UNTIL_KEY, String(Date.now() + days * 24 * 60 * 60 * 1000));
}

export async function syncPushSubscriptions(
  followedTeamIds: string[],
  settings?: Partial<AlertSettings>,
): Promise<{ ok: boolean; disabled?: boolean; error?: string }> {
  const current = await getPushRegistrationState();
  if (!current.expoPushToken && !current.nativeDevicePushToken) {
    return { ok: false, disabled: true, error: 'No push token registered yet.' };
  }

  const payload: PushSubscriptionPayload = {
    deviceId: current.deviceId || await getOrCreatePushDeviceId(),
    platform: Platform.OS === 'android' || Platform.OS === 'ios' || Platform.OS === 'web' ? Platform.OS : 'unknown',
    expoPushToken: current.expoPushToken,
    nativeDevicePushToken: current.nativeDevicePushToken,
    followedTeamIds: Array.from(new Set(followedTeamIds)).sort(),
    eventTypes: toSubscriptionEventTypes(settings ?? await readAlertSettings()),
    appVersion: Constants.expoConfig?.version,
    buildNumber: String(Constants.expoConfig?.android?.versionCode ?? ''),
    enabled: true,
  };

  try {
    const res = await fetch(`${API_BASE}/api/push/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.not_configured) {
      const next = { ...current, status: 'backend_disabled' as const, lastError: json?.error || `HTTP ${res.status}` };
      await savePushRegistrationState(next);
      console.warn('[push] Subscription backend disabled:', next.lastError);
      return { ok: false, disabled: true, error: next.lastError };
    }
    await savePushRegistrationState({
      ...current,
      status: 'registered',
      deviceId: payload.deviceId,
      lastRegisteredAt: new Date().toISOString(),
      lastError: undefined,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown push registration error';
    await savePushRegistrationState({ ...current, status: 'error', lastError: message });
    console.warn('[push] Subscription sync failed:', message);
    return { ok: false, error: message };
  }
}

export async function registerForPushNotificationsAfterApproval(followedTeamIds: string[]) {
  if (!isNativeAndroidOrIos()) {
    const state = { status: 'backend_disabled' as const, lastError: 'Push registration is only enabled in native Android/iOS builds.' };
    await savePushRegistrationState(state);
    return { ok: false, state };
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('score-alerts', {
      name: 'Score alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D95C17',
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  const finalStatus = existing.granted
    ? existing.status
    : (await Notifications.requestPermissionsAsync()).status;

  if (finalStatus !== 'granted') {
    const state = { status: 'permission_denied' as const, lastError: 'Android notification permission was not granted.' };
    await savePushRegistrationState(state);
    return { ok: false, state };
  }

  const deviceId = await getOrCreatePushDeviceId();
  const projectId = getProjectId();
  let expoPushToken: string | undefined;
  let nativeDevicePushToken: string | undefined;

  try {
    expoPushToken = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
  } catch (err) {
    console.warn('[push] Expo push token unavailable:', err);
  }

  try {
    nativeDevicePushToken = String((await Notifications.getDevicePushTokenAsync()).data);
  } catch (err) {
    console.warn('[push] Native FCM/APNs token unavailable:', err);
  }

  if (!expoPushToken && !nativeDevicePushToken) {
    const state = { status: 'error' as const, deviceId, lastError: 'No Expo or native device push token could be obtained.' };
    await savePushRegistrationState(state);
    return { ok: false, state };
  }

  const state: PushRegistrationState = {
    status: 'registered',
    deviceId,
    expoPushToken,
    nativeDevicePushToken,
    lastRegisteredAt: new Date().toISOString(),
  };
  await savePushRegistrationState(state);
  const sync = await syncPushSubscriptions(followedTeamIds);
  return { ok: sync.ok, state: await getPushRegistrationState(), sync };
}
