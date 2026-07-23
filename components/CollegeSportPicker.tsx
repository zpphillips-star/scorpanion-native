/**
 * CollegeSportPicker.tsx — Sport selector dropdown for college teams (UW / WSU).
 * Translates webapp's CollegeSportPicker to React Native.
 * Appears as a bottom sheet when the user taps a college group icon in the filter bar.
 */
import React from 'react';
import {
  View, Text, TouchableOpacity, Image, Modal,
  ScrollView, StyleSheet,
} from 'react-native';
import { SURFACE, SURFACE2, BORDER, TEXT, TEXT_FAINT, ACCENT } from '../constants/theme';
import type { ProTeam } from '../lib/allProTeams';

// ── Helpers ────────────────────────────────────────────────────────────────────

const SPORT_LABELS: Record<string, string> = {
  football:   'Football',
  baseball:   'Baseball',
  basketball: 'Basketball',
  volleyball: 'Volleyball',
  lacrosse:   'Lacrosse',
  softball:   'Softball',
  soccer:     'Soccer',
  hockey:     'Hockey',
};

// ── Main component ─────────────────────────────────────────────────────────────

export interface CollegePickerTeam {
  team: ProTeam
  hasGames: boolean
}

interface CollegeSportPickerProps {
  /** 'uw' or 'wsu' */
  groupKey: string
  availableTeams: CollegePickerTeam[]
  selectedTeamIds: string[]
  /** Currently active filter ID */
  activeFilter: string
  onSelect: (id: string) => void
  onSelectAll: () => void
  onClose: () => void
}

export default function CollegeSportPicker({
  groupKey,
  availableTeams,
  activeFilter,
  onSelect,
  onSelectAll,
  onClose,
}: CollegeSportPickerProps) {
  const representative = availableTeams[0]?.team;
  const school = groupKey === 'uw'  ? 'Washington Huskies'
               : groupKey === 'wsu' ? 'WSU Cougars'
               : groupKey;

  const allSportsActive = !availableTeams.some(t => t.team.id === activeFilter);

  return (
    <Modal visible animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={onClose}>
      {/* Backdrop tap-to-close */}
      <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableOpacity>

      {/* Sheet */}
      <View style={styles.sheet}>
        {/* Drag handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          {representative && (
            <Image source={{ uri: representative.logo }} style={styles.headerLogo} resizeMode="contain" />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.schoolName}>{school}</Text>
            <Text style={styles.chooseSport}>Choose sport</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Sport chips */}
        <ScrollView contentContainerStyle={styles.chips} showsVerticalScrollIndicator={false}>
          {/* All Sports chip */}
          <TouchableOpacity
            onPress={onSelectAll}
            style={[
              styles.chip,
              allSportsActive && styles.chipActive,
            ]}
          >
            <Text style={[styles.chipText, allSportsActive && styles.chipTextActive]}>
              All Sports
            </Text>
          </TouchableOpacity>

          {/* Per-sport chips */}
          {availableTeams.map(({ team, hasGames }) => {
            const isActive = activeFilter === team.id;
            return (
              <TouchableOpacity
                key={team.id}
                onPress={() => hasGames && onSelect(team.id)}
                disabled={!hasGames}
                style={[
                  styles.chip,
                  isActive && { backgroundColor: team.primaryColor, borderColor: team.primaryColor },
                  !hasGames && styles.chipDisabled,
                ]}
              >
                <Text style={[
                  styles.chipText,
                  isActive && styles.chipTextActive,
                  !hasGames && styles.chipTextDisabled,
                ]}>
                  {SPORT_LABELS[team.sport] || team.sport}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: SURFACE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  headerLogo: { width: 32, height: 32, borderRadius: 4 },
  schoolName: { color: TEXT, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  chooseSport: { color: TEXT_FAINT, fontSize: 11, marginTop: 1 },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' },

  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: SURFACE2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  chipDisabled: { opacity: 0.3 },
  chipText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  chipTextActive: { color: '#fff' },
  chipTextDisabled: { color: '#9ca3af' },
});
