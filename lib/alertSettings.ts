export const SETTINGS_KEY = 'scorpanion:settings';

export type AlertEventType = 'gameStart' | 'scoreChange' | 'leadChange' | 'final' | 'closeGameLate';

export interface AlertSettings {
  gameStartAlerts: boolean;
  scoreChangeAlerts: boolean;
  leadChangeAlerts: boolean;
  finalScoreAlerts: boolean;
  closeGameAlerts: boolean;
}

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  gameStartAlerts: true,
  scoreChangeAlerts: true,
  leadChangeAlerts: true,
  finalScoreAlerts: true,
  closeGameAlerts: true,
};

export function toSubscriptionEventTypes(settings: Partial<AlertSettings> | null | undefined): AlertEventType[] {
  const merged = { ...DEFAULT_ALERT_SETTINGS, ...(settings ?? {}) };
  const events: AlertEventType[] = [];
  if (merged.gameStartAlerts) events.push('gameStart');
  if (merged.scoreChangeAlerts) events.push('scoreChange');
  if (merged.leadChangeAlerts) events.push('leadChange');
  if (merged.finalScoreAlerts) events.push('final');
  if (merged.closeGameAlerts) events.push('closeGameLate');
  return events;
}
