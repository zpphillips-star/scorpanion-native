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
import { fetchTeamDetail } from '../lib/api';
import {
  SURFACE, SURFACE2, SURFACE3, BORDER, BORDER_D,
  TEXT, TEXT_MUTED, TEXT_FAINT,
  ACCENT, WIN, LOSS, BG,
} from '../constants/theme';
import type { SheetTeam, TeamDetailData, TeamDetailGame } from '../lib/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;
const SWIPE_CLOSE_DY = 120;
const SWIPE_CLOSE_VY = 0.5;

// ─── Prop types ───────────────────────────────────────────────────────────────

interface Props {
  team: SheetTeam | null;
  onClose: () => void;
}

// ─── Stat definitions by sport ───────────────────────────────────────────────

const SPORT_STATS: Record<string, Array<{ label: string; keys: string[] }>> = {
  mlb: [
    { label: 'BA', keys: ['battingAverage', 'BA', 'avg'] },
    { label: 'ERA', keys: ['ERA', 'era'] },
    { label: 'R/G', keys: ['runsPerGame', 'RPG', 'r/g', 'runs'] },
  ],
  nfl: [
    { label: 'PPG', keys: ['pointsPerGame', 'PPG', 'ppg'] },
    { label: 'PAPG', keys: ['pointsAllowedPerGame', 'PAPG', 'papg', 'oppPPG'] },
    { label: 'TO', keys: ['turnovers', 'TO', 'to'] },
  ],
  nba: [
    { label: 'PPG', keys: ['pointsPerGame', 'PPG', 'ppg'] },
    { label: 'OPP PPG', keys: ['oppPointsPerGame', 'OPP PPG', 'oppPPG', 'DPPG'] },
    { label: 'REB', keys: ['rebounds', 'REB', 'reb', 'reboundsPerGame'] },
  ],
  wnba: [
    { label: 'PPG', keys: ['pointsPerGame', 'PPG', 'ppg'] },
    { label: 'OPP PPG', keys: ['oppPointsPerGame', 'OPP PPG', 'oppPPG', 'DPPG'] },
    { label: 'REB', keys: ['rebounds', 'REB', 'reb', 'reboundsPerGame'] },
  ],
  nhl: [
    { label: 'GF', keys: ['goalsFor', 'GF', 'gf'] },
    { label: 'GA', keys: ['goalsAgainst', 'GA', 'ga'] },
    { label: 'PP%', keys: ['powerPlayPct', 'PP%', 'ppPct', 'pp%'] },
  ],
};

function getSportStats(sport: string) {
  const key = sport.toLowerCase().replace(/[^a-z]/g, '');
  return SPORT_STATS[key] ?? [];
}

function resolveStatValue(
  stats: Record<string, string | number>,
  keys: string[]
): string | number | undefined {
  for (const k of keys) {
    const found = Object.keys(stats).find(
      (sk) => sk.toLowerCase() === k.toLowerCase()
    );
    if (found !== undefined) return stats[found];
  }
  return undefined;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ResultDot({ result }: { result: 'W' | 'L' | 'T' | undefined }) {
  const color =
    result === 'W' ? WIN : result === 'L' ? LOSS : '#5F6773';
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

function RecentGameRow({ game }: { game: TeamDetailGame }) {
  const resultColor =
    game.result === 'W' ? WIN : game.result === 'L' ? LOSS : '#D8C6AA';

  return (
    <View style={styles.gameRow}>
      {game.opponent.logo ? (
        <Image
          source={{ uri: game.opponent.logo }}
          style={styles.oppLogo}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.oppLogoFallback}>
          <Text style={styles.oppLogoText}>
            {game.opponent.abbreviation?.slice(0, 3)}
          </Text>
        </View>
      )}
      <Text style={styles.oppAbbr} numberOfLines={1}>
        {game.isHome === false ? '@' : 'vs'} {game.opponent.abbreviation}
      </Text>
      {game.score ? (
        <Text style={styles.gameScore} numberOfLines={1}>
          {game.score}
        </Text>
      ) : null}
      {game.result ? (
        <Text style={[styles.gameResult, { color: resultColor }]}>
          {game.result}
        </Text>
      ) : null}
    </View>
  );
}

function UpcomingGameRow({ game }: { game: TeamDetailGame }) {
  let dateLabel = game.date;
  try {
    const d = new Date(game.date);
    if (!isNaN(d.getTime())) {
      dateLabel = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const time = d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
      dateLabel += ` · ${time}`;
    }
  } catch {
    // keep original
  }

  return (
    <View style={styles.gameRow}>
      {game.opponent.logo ? (
        <Image
          source={{ uri: game.opponent.logo }}
          style={styles.oppLogo}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.oppLogoFallback}>
          <Text style={styles.oppLogoText}>
            {game.opponent.abbreviation?.slice(0, 3)}
          </Text>
        </View>
      )}
      <View style={styles.upcomingInfo}>
        <Text style={styles.oppName} numberOfLines={1}>
          {game.isHome === false ? '@ ' : 'vs '}{game.opponent.name}
        </Text>
        <Text style={styles.upcomingDate}>{dateLabel}</Text>
      </View>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TeamDetailSheet({ team, onClose }: Props) {
  const [detail, setDetail] = useState<TeamDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
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
    if (!team) return;

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

    setDetail(null);
    setError(null);
    setLoading(true);
    fetchTeamDetail(team.id, team.sport)
      .then((data) => setDetail(data as TeamDetailData))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team?.id]);

  if (!team) return null;

  const sportStats = getSportStats(team.sport);

  // Use fetched data or fall back to prop
  const teamInfo = detail?.team ?? {
    id: team.id,
    name: team.name,
    abbreviation: team.abbreviation,
    logo: team.logo,
  };

  // Most recent on LEFT → reverse a copy
  const recentResults = detail?.recentResults
    ? [...detail.recentResults].reverse().slice(0, 5)
    : [];
  const recentResultsChronological = detail?.recentResults?.slice(0, 5) ?? [];

  const upcomingGames = detail?.upcomingSchedule?.slice(0, 5) ?? [];

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
              { backgroundColor: 'rgba(0,0,0,0.75)', opacity: backdropOpacity },
            ]}
          />
        </TouchableOpacity>

        {/* Sheet */}
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
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
            {/* ── Team Header ── */}
            <View style={styles.teamHeader}>
              {teamInfo.logo ? (
                <Image
                  source={{ uri: teamInfo.logo }}
                  style={styles.headerLogo}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.headerLogoFallback}>
                  <Text style={styles.headerLogoText}>
                    {teamInfo.abbreviation?.slice(0, 3)}
                  </Text>
                </View>
              )}
              <Text style={styles.teamName} numberOfLines={1}>
                {teamInfo.name}
              </Text>
              {teamInfo.record && (
                <Text style={styles.teamRecord}>
                  {teamInfo.record.summary ??
                    `${teamInfo.record.wins}-${teamInfo.record.losses}${
                      teamInfo.record.ties ? `-${teamInfo.record.ties}` : ''
                    }`}
                </Text>
              )}
              {teamInfo.standing ? (
                <Text style={styles.teamStanding}>{teamInfo.standing}</Text>
              ) : null}
            </View>

            {/* Loading */}
            {loading && (
              <View style={styles.loadingBlock}>
                <ActivityIndicator size="small" color={ACCENT} />
                <Text style={styles.loadingText}>Loading team details…</Text>
              </View>
            )}

            {/* Error */}
            {!!error && (
              <View style={styles.errorBlock}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* ── Recent Results ── */}
            {(recentResults.length > 0 || recentResultsChronological.length > 0) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Results</Text>

                {/* 5 dots — most recent on LEFT */}
                {recentResults.length > 0 && (
                  <View style={styles.dotsRow}>
                    {recentResults.map((g, i) => (
                      <ResultDot key={i} result={g.result} />
                    ))}
                  </View>
                )}

                {/* Last 5 game rows (chronological, oldest first) */}
                {recentResultsChronological.map((g, i) => (
                  <RecentGameRow key={g.gameId ?? i} game={g} />
                ))}
              </View>
            )}

            {/* ── Upcoming Schedule ── */}
            {upcomingGames.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Upcoming Schedule</Text>
                {upcomingGames.map((g, i) => (
                  <UpcomingGameRow key={g.gameId ?? i} game={g} />
                ))}
              </View>
            )}

            {/* ── Team Stats ── */}
            {detail?.stats && sportStats.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Team Stats</Text>
                <View style={styles.statsGrid}>
                  {sportStats.map(({ label, keys }) => {
                    const val = resolveStatValue(detail.stats!, keys);
                    return (
                      <View key={label} style={styles.statCell}>
                        <Text style={styles.statValue}>
                          {val !== undefined ? String(val) : '—'}
                        </Text>
                        <Text style={styles.statLabel}>{label}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* If we loaded but got no data yet, show nothing extra */}
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

  // Team header
  teamHeader: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 6,
  },
  headerLogo: {
    width: 64,
    height: 64,
    marginBottom: 4,
  },
  headerLogoFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: SURFACE2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  headerLogoText: {
    color: TEXT_FAINT,
    fontSize: 18,
    fontWeight: '700',
  },
  teamName: {
    color: TEXT,
    fontSize: 20,
    fontWeight: '800',
  },
  teamRecord: {
    color: TEXT_MUTED,
    fontSize: 14,
    fontWeight: '600',
  },
  teamStanding: {
    color: ACCENT,
    fontSize: 12,
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
    marginBottom: 24,
  },
  sectionTitle: {
    color: TEXT_FAINT,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  // Result dots
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Game rows (recent + upcoming share)
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    gap: 10,
  },
  oppLogo: {
    width: 28,
    height: 28,
  },
  oppLogoFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: SURFACE2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  oppLogoText: {
    color: TEXT_FAINT,
    fontSize: 8,
    fontWeight: '700',
  },
  oppAbbr: {
    flex: 1,
    color: TEXT_MUTED,
    fontSize: 13,
    fontWeight: '600',
  },
  gameScore: {
    color: TEXT_MUTED,
    fontSize: 13,
    marginRight: 8,
  },
  gameResult: {
    fontSize: 13,
    fontWeight: '700',
    width: 16,
    textAlign: 'right',
  },

  // Upcoming specific
  upcomingInfo: {
    flex: 1,
  },
  oppName: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontWeight: '600',
  },
  upcomingDate: {
    color: TEXT_FAINT,
    fontSize: 11,
    marginTop: 1,
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: SURFACE2,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  statCell: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: TEXT,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  statLabel: {
    color: TEXT_FAINT,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },
});
