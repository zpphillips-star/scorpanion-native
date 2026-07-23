import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Animated,
  PanResponder,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { fetchBoxscore } from '../lib/api';
import {
  SURFACE, SURFACE2, BORDER, BORDER_D,
  TEXT, TEXT_MUTED, TEXT_FAINT,
  ACCENT, LIVE,
} from '../constants/theme';
import type {
  BoxscoreData,
  PeriodScore,
  Performer,
  Pitcher,
  SheetTeam,
  TeamScore,
} from '../lib/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;
const SWIPE_CLOSE_DY = 120;
const SWIPE_CLOSE_VY = 0.5;

// ─── Prop types ───────────────────────────────────────────────────────────────

export interface SheetGame {
  gameId: string;
  sport: string;
  awayTeam: { id?: string; name: string; abbreviation: string; logo?: string };
  homeTeam: { id?: string; name: string; abbreviation: string; logo?: string };
  awayScore?: number | string;
  homeScore?: number | string;
  status: string;
  period?: string;
}

interface Props {
  game: SheetGame | null;
  onClose: () => void;
  onTeamPress?: (team: SheetTeam) => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TeamHeaderBlock({
  team,
  onPress,
}: {
  team: TeamScore;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.teamBlock}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {team.logo ? (
        <Image source={{ uri: team.logo }} style={styles.teamLogo} resizeMode="contain" />
      ) : (
        <View style={styles.teamLogoFallback}>
          <Text style={styles.teamLogoText}>{team.abbreviation?.slice(0, 3)}</Text>
        </View>
      )}
      <Text style={styles.teamAbbr} numberOfLines={1}>
        {team.abbreviation}
      </Text>
      <Text style={styles.teamScore}>{team.score ?? '—'}</Text>
    </TouchableOpacity>
  );
}

function LineScoreTable({
  lineScore,
  awayAbbr,
  homeAbbr,
  awayTotal,
  homeTotal,
  sport,
}: {
  lineScore: PeriodScore[];
  awayAbbr: string;
  homeAbbr: string;
  awayTotal?: number | string;
  homeTotal?: number | string;
  sport: string;
}) {
  const isMLB = /mlb|baseball/i.test(sport);
  const totalLabel = isMLB ? 'R' : 'T';

  const awaySum = awayTotal ?? lineScore.reduce((s, p) => s + (Number(p.away) || 0), 0);
  const homeSum = homeTotal ?? lineScore.reduce((s, p) => s + (Number(p.home) || 0), 0);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.lineScoreScroll}
    >
      <View>
        {/* Header row */}
        <View style={styles.lsRow}>
          <Text style={[styles.lsCell, styles.lsTeamCell, styles.lsHeaderText]}>{' '}</Text>
          {lineScore.map((p) => (
            <Text key={p.label} style={[styles.lsCell, styles.lsHeaderText]}>
              {p.label}
            </Text>
          ))}
          <Text style={[styles.lsCell, styles.lsTotalCell, styles.lsHeaderText]}>
            {totalLabel}
          </Text>
        </View>
        {/* Away row */}
        <View style={styles.lsRow}>
          <Text style={[styles.lsCell, styles.lsTeamCell, styles.lsBodyText]}>{awayAbbr}</Text>
          {lineScore.map((p, i) => (
            <Text key={i} style={[styles.lsCell, styles.lsBodyText]}>
              {p.away ?? '-'}
            </Text>
          ))}
          <Text style={[styles.lsCell, styles.lsTotalCell, styles.lsBodyText, styles.lsBold]}>
            {awaySum}
          </Text>
        </View>
        {/* Home row */}
        <View style={styles.lsRow}>
          <Text style={[styles.lsCell, styles.lsTeamCell, styles.lsBodyText]}>{homeAbbr}</Text>
          {lineScore.map((p, i) => (
            <Text key={i} style={[styles.lsCell, styles.lsBodyText]}>
              {p.home ?? '-'}
            </Text>
          ))}
          <Text style={[styles.lsCell, styles.lsTotalCell, styles.lsBodyText, styles.lsBold]}>
            {homeSum}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function PerformerRow({ performer }: { performer: Performer }) {
  const statKeys = Object.keys(performer.stats);
  return (
    <View style={styles.performerRow}>
      <Text style={styles.performerName} numberOfLines={1}>
        {performer.name}
      </Text>
      <View style={styles.performerStats}>
        {statKeys.map((key) => (
          <View key={key} style={styles.performerStat}>
            <Text style={styles.performerStatVal}>{performer.stats[key]}</Text>
            <Text style={styles.performerStatKey}>{key}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PerformersSection({
  awayAbbr,
  homeAbbr,
  away,
  home,
}: {
  awayAbbr: string;
  homeAbbr: string;
  away: Performer[];
  home: Performer[];
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Top Performers</Text>
      <Text style={styles.subsectionTitle}>{awayAbbr}</Text>
      {away.map((p, i) => (
        <PerformerRow key={i} performer={p} />
      ))}
      <Text style={[styles.subsectionTitle, { marginTop: 10 }]}>{homeAbbr}</Text>
      {home.map((p, i) => (
        <PerformerRow key={i} performer={p} />
      ))}
    </View>
  );
}

function PitchingSection({
  awayAbbr,
  homeAbbr,
  away,
  home,
}: {
  awayAbbr: string;
  homeAbbr: string;
  away: Pitcher[];
  home: Pitcher[];
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Pitching</Text>
      <View style={styles.pitchingCols}>
        <View style={styles.pitchingCol}>
          <Text style={styles.subsectionTitle}>{awayAbbr}</Text>
          {away.map((p, i) => (
            <View key={i} style={styles.pitcherRow}>
              <Text style={styles.pitcherName} numberOfLines={1}>
                {p.name}
              </Text>
              <Text style={styles.pitcherStat}>
                {p.ip} IP · {p.er} ER
              </Text>
            </View>
          ))}
        </View>
        <View style={[styles.pitchingCol, styles.pitchingColRight]}>
          <Text style={styles.subsectionTitle}>{homeAbbr}</Text>
          {home.map((p, i) => (
            <View key={i} style={styles.pitcherRow}>
              <Text style={styles.pitcherName} numberOfLines={1}>
                {p.name}
              </Text>
              <Text style={styles.pitcherStat}>
                {p.ip} IP · {p.er} ER
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GameDetailSheet({ game, onClose, onTeamPress }: Props) {
  const [boxscore, setBoxscore] = useState<BoxscoreData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Keep a stable ref so PanResponder callbacks always call the latest closeSheet
  const closeRef = useRef<() => void>(() => {});

  const closeSheet = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  }, [onClose, translateY, backdropOpacity]);

  // Always keep closeRef in sync
  useEffect(() => {
    closeRef.current = closeSheet;
  });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        gs.dy > 5 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) translateY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > SWIPE_CLOSE_DY || gs.vy > SWIPE_CLOSE_VY) {
          closeRef.current();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (!game) return;

    // Animate open
    translateY.setValue(SHEET_HEIGHT);
    backdropOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    // Fetch boxscore
    setBoxscore(null);
    setError(null);
    setLoading(true);
    fetchBoxscore(game.gameId, game.sport)
      .then((data) => setBoxscore(data as BoxscoreData))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.gameId]);

  if (!game) return null;

  const sport = game.sport?.toLowerCase() ?? '';
  const isMLB = /mlb|baseball/i.test(sport);

  // Use boxscore data when available, fall back to card data
  const awayTeam: TeamScore = boxscore?.awayTeam ?? {
    id: '',
    name: game.awayTeam.name,
    abbreviation: game.awayTeam.abbreviation,
    logo: game.awayTeam.logo,
    score: game.awayScore,
  };
  const homeTeam: TeamScore = boxscore?.homeTeam ?? {
    id: '',
    name: game.homeTeam.name,
    abbreviation: game.homeTeam.abbreviation,
    logo: game.homeTeam.logo,
    score: game.homeScore,
  };

  const statusLabel = boxscore?.period ?? game.period ?? '';
  const statusDetail = boxscore?.status ?? game.status;

  return (
    <Modal
      transparent
      visible
      animationType="none"
      onRequestClose={closeSheet}
      statusBarTranslucent
    >
      <View style={StyleSheet.absoluteFillObject}>
        {/* Backdrop */}
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={closeSheet}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: 'rgba(0,0,0,0.7)', opacity: backdropOpacity },
            ]}
          />
        </TouchableOpacity>

        {/* Sheet */}
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
          // Consume all touches so they don't fall through to the backdrop
          onStartShouldSetResponder={() => true}
        >
          {/* Drag handle */}
          <View {...panResponder.panHandlers} style={styles.dragHandleArea}>
            <View style={styles.dragHandle} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Status line */}
            <View style={styles.statusBar}>
              {!!statusLabel && (
                <Text style={styles.statusPeriod}>{statusLabel}</Text>
              )}
              {!!statusLabel && !!statusDetail && (
                <Text style={styles.statusDot}>·</Text>
              )}
              <Text style={styles.statusDetail}>{statusDetail}</Text>
            </View>

            {/* Score header: Away @ Home */}
            <View style={styles.scoreHeader}>
              <TeamHeaderBlock
                team={awayTeam}
                onPress={
                  onTeamPress
                    ? () =>
                        onTeamPress({
                          id: awayTeam.id,
                          name: awayTeam.name,
                          abbreviation: awayTeam.abbreviation,
                          logo: awayTeam.logo,
                          sport,
                        })
                    : undefined
                }
              />
              <View style={styles.vsBlock}>
                <Text style={styles.vsText}>@</Text>
              </View>
              <TeamHeaderBlock
                team={homeTeam}
                onPress={
                  onTeamPress
                    ? () =>
                        onTeamPress({
                          id: homeTeam.id,
                          name: homeTeam.name,
                          abbreviation: homeTeam.abbreviation,
                          logo: homeTeam.logo,
                          sport,
                        })
                    : undefined
                }
              />
            </View>

            {/* Loading */}
            {loading && (
              <View style={styles.loadingBlock}>
                <ActivityIndicator size="small" color={ACCENT} />
                <Text style={styles.loadingText}>Loading details…</Text>
              </View>
            )}

            {/* Error */}
            {!!error && (
              <View style={styles.errorBlock}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Line Score */}
            {boxscore?.lineScore && boxscore.lineScore.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Line Score</Text>
                <LineScoreTable
                  lineScore={boxscore.lineScore}
                  awayAbbr={awayTeam.abbreviation}
                  homeAbbr={homeTeam.abbreviation}
                  awayTotal={awayTeam.score}
                  homeTotal={homeTeam.score}
                  sport={sport}
                />
              </View>
            )}

            {/* Top Performers */}
            {boxscore?.topPerformers && (
              <PerformersSection
                awayAbbr={awayTeam.abbreviation}
                homeAbbr={homeTeam.abbreviation}
                away={boxscore.topPerformers.away}
                home={boxscore.topPerformers.home}
              />
            )}

            {/* Pitching (MLB only) */}
            {isMLB && boxscore?.pitching && (
              <PitchingSection
                awayAbbr={awayTeam.abbreviation}
                homeAbbr={homeTeam.abbreviation}
                away={boxscore.pitching.away}
                home={boxscore.pitching.home}
              />
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: SURFACE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  dragHandleArea: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: BORDER_D,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  // Status
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  statusPeriod: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: '700',
  },
  statusDot: {
    color: TEXT_FAINT,
    fontSize: 13,
  },
  statusDetail: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontWeight: '500',
  },

  // Score header
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  teamBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  teamLogo: {
    width: 60,
    height: 60,
  },
  teamLogoFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: SURFACE2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamLogoText: {
    color: TEXT_FAINT,
    fontSize: 14,
    fontWeight: '700',
  },
  teamAbbr: {
    color: TEXT_MUTED,
    fontSize: 15,
    fontWeight: '700',
  },
  teamScore: {
    color: TEXT,
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },
  vsBlock: {
    paddingHorizontal: 8,
  },
  vsText: {
    color: TEXT_FAINT,
    fontSize: 18,
    fontWeight: '600',
  },

  // Loading / Error
  loadingBlock: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  loadingText: {
    color: TEXT_FAINT,
    fontSize: 13,
  },
  errorBlock: {
    padding: 14,
    backgroundColor: 'rgba(127,29,29,0.2)',
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    textAlign: 'center',
  },

  // Sections
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: TEXT_FAINT,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  subsectionTitle: {
    color: TEXT_FAINT,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },

  // Line score table
  lineScoreScroll: {
    marginHorizontal: -4,
  },
  lsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lsCell: {
    width: 28,
    textAlign: 'center',
    paddingVertical: 5,
  },
  lsTeamCell: {
    width: 44,
    textAlign: 'left',
    paddingLeft: 4,
  },
  lsTotalCell: {
    width: 36,
    borderLeftWidth: 1,
    borderLeftColor: BORDER_D,
  },
  lsHeaderText: {
    color: TEXT_FAINT,
    fontSize: 11,
    fontWeight: '600',
  },
  lsBodyText: {
    color: TEXT_MUTED,
    fontSize: 13,
  },
  lsBold: {
    fontWeight: '700',
    color: TEXT,
  },

  // Top Performers
  performerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  performerName: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '600',
    width: 120,
    marginRight: 8,
  },
  performerStats: {
    flex: 1,
    flexDirection: 'row',
    gap: 14,
  },
  performerStat: {
    alignItems: 'center',
  },
  performerStatVal: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  performerStatKey: {
    color: TEXT_FAINT,
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Pitching
  pitchingCols: {
    flexDirection: 'row',
    gap: 12,
  },
  pitchingCol: {
    flex: 1,
  },
  pitchingColRight: {
    borderLeftWidth: 1,
    borderLeftColor: BORDER_D,
    paddingLeft: 12,
  },
  pitcherRow: {
    marginBottom: 8,
  },
  pitcherName: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '600',
  },
  pitcherStat: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginTop: 1,
  },
});
