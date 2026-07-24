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
  StyleSheet,
  Dimensions,
} from 'react-native';
import type { WebTeamDetail } from '../lib/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const BG        = '#0c1b31';
const SURFACE   = '#142236';
const SURFACE2  = '#1a2d4a';
const BORDER    = '#1e3050';
const TEXT      = '#F2E6CF';
const TEXT_FAINT = '#5F6773';
const ACCENT    = '#D95C17';
const WIN_C     = '#34d399';
const LOSS_C    = '#f87171';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.88;
const SWIPE_CLOSE_DY = 120;
const SWIPE_CLOSE_VY = 0.5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtShortDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  catch { return iso; }
}
function fmtDay(iso: string): string {
  try { return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }
  catch { return iso; }
}
function fmtTime(iso: string): string {
  try { return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }); }
  catch { return ''; }
}

// ─── Section divider ──────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <View style={sd.row}>
      <View style={sd.line} />
      <Text style={sd.label}>{label}</Text>
      <View style={sd.line} />
    </View>
  );
}
const sd = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 4, gap: 8 },
  line:  { flex: 1, height: 1, backgroundColor: 'rgba(113,113,122,0.3)' },
  label: { color: TEXT_FAINT, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
});

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  teamId: string;
  teamName: string;
  teamLogo?: string;
  league: string;
  onClose: () => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TeamDetailSheet({ teamId, teamName, teamLogo, league, onClose }: Props) {
  const [data, setData]     = useState<WebTeamDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const translateY      = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const closeRef        = useRef<() => void>(() => {});

  const closeSheet = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: SHEET_HEIGHT, duration: 250, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [onClose, translateY, backdropOpacity]);

  useEffect(() => { closeRef.current = closeSheet; });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => { if (gs.dy > 0) translateY.setValue(gs.dy); },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > SWIPE_CLOSE_DY || gs.vy > SWIPE_CLOSE_VY) {
          closeRef.current();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    translateY.setValue(SHEET_HEIGHT);
    backdropOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    if (!teamId || league === 'whl' || league === 'pwhl') { setLoading(false); return; }
    setData(null);
    setLoading(true);
    let mounted = true;
    fetch(`https://scorpanion.com/api/team-detail?teamId=${encodeURIComponent(teamId)}&league=${encodeURIComponent(league)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (mounted) { setData(d); setLoading(false); } })
      .catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [teamId, league]);

  const logo = data?.logo ?? teamLogo ?? '';

  return (
    <Modal transparent visible animationType="none" onRequestClose={closeSheet} statusBarTranslucent>
      <View style={StyleSheet.absoluteFillObject}>
        {/* Backdrop */}
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeSheet}>
          <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.8)', opacity: backdropOpacity }]} />
        </TouchableOpacity>

        {/* Sheet */}
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]} onStartShouldSetResponder={() => true}>
          {/* Drag handle */}
          <View {...panResponder.panHandlers} style={styles.dragArea}>
            <View style={styles.dragHandle} />
          </View>

          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={closeSheet}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

            {/* ── HERO HEADER ── */}
            <View style={styles.hero}>
              {logo
                ? <Image source={{ uri: logo }} style={styles.heroLogo} resizeMode="contain" />
                : <View style={styles.heroLogoFallback}><Text style={styles.heroLogoText}>{teamName.slice(0, 2)}</Text></View>
              }
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.location}>{loading ? 'Loading…' : (data?.location ?? '')}</Text>
                <Text style={styles.teamName} numberOfLines={1}>
                  {loading ? teamName : (data?.shortName ?? data?.name ?? teamName)}
                </Text>
                {!loading && data && (
                  <Text style={styles.record}>{data.wins}–{data.losses}{data.ties ? `–${data.ties}` : ''}</Text>
                )}
              </View>
            </View>

            {/* Loading */}
            {loading && (
              <View style={styles.loadingBlock}>
                <ActivityIndicator size="small" color={ACCENT} />
                <Text style={styles.loadingText}>Loading {teamName}…</Text>
              </View>
            )}

            {/* No data */}
            {!loading && !data && (
              <View style={styles.loadingBlock}>
                <Text style={styles.loadingText}>No data available</Text>
              </View>
            )}

            {/* ── LAST 3 GAMES ── */}
            {data && !loading && data.recentForm.length > 0 && (
              <View style={styles.section}>
                <SectionDivider label="Last 3 Games" />
                <View style={styles.last3Grid}>
                  {[...data.recentForm].reverse().slice(0, 3).map((g, i) => {
                    const win  = g.result === 'W';
                    const loss = g.result === 'L';
                    const rc   = win ? WIN_C : loss ? LOSS_C : '#9ca3af';
                    const awayAbbr  = g.isHome ? g.opponent : (data.abbr ?? 'SEA');
                    const awayLogo  = g.isHome ? g.oppLogo  : logo;
                    const awayScore = g.isHome ? g.oppScore : g.myScore;
                    const homeAbbr  = g.isHome ? (data.abbr ?? 'SEA') : g.opponent;
                    const homeLogo  = g.isHome ? logo      : g.oppLogo;
                    const homeScore = g.isHome ? g.myScore  : g.oppScore;
                    return (
                      <View key={i} style={styles.miniCard}>
                        {/* Away row */}
                        <View style={styles.miniRow}>
                          {awayLogo
                            ? <Image source={{ uri: awayLogo }} style={styles.miniLogo} resizeMode="contain" />
                            : <View style={styles.miniLogoFallback} />
                          }
                          <Text style={styles.miniAbbr} numberOfLines={1}>{awayAbbr}</Text>
                          <Text style={[styles.miniScore, awayScore > homeScore ? styles.miniScoreWin : styles.miniScoreLoss]}>
                            {awayScore}
                          </Text>
                        </View>
                        {/* Home row */}
                        <View style={[styles.miniRow, styles.miniRowBorder]}>
                          {homeLogo
                            ? <Image source={{ uri: homeLogo }} style={styles.miniLogo} resizeMode="contain" />
                            : <View style={styles.miniLogoFallback} />
                          }
                          <Text style={styles.miniAbbr} numberOfLines={1}>{homeAbbr}</Text>
                          <Text style={[styles.miniScore, homeScore > awayScore ? styles.miniScoreWin : styles.miniScoreLoss]}>
                            {homeScore}
                          </Text>
                        </View>
                        {/* Footer */}
                        <View style={styles.miniFooter}>
                          <Text style={[styles.miniResult, { color: rc }]}>{win ? 'W' : loss ? 'L' : 'T'}</Text>
                          <Text style={styles.miniDate}>{fmtShortDate(g.date)}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ── NEXT 3 GAMES ── */}
            {data && !loading && data.upcomingGames.length > 0 && (
              <View style={styles.section}>
                <SectionDivider label="Next 3 Games" />
                <View style={{ gap: 8 }}>
                  {data.upcomingGames.map((g, i) => (
                    <View key={i} style={styles.upcomingRow}>
                      {g.oppLogo
                        ? <Image source={{ uri: g.oppLogo }} style={styles.upcomingLogo} resizeMode="contain" />
                        : <View style={styles.upcomingLogoFallback}>
                            <Text style={styles.upcomingLogoText}>{g.opponent.slice(0, 3)}</Text>
                          </View>
                      }
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.upcomingOpp} numberOfLines={1}>{g.isHome ? 'vs' : '@'} {g.opponent}</Text>
                        <Text style={styles.upcomingDate}>{fmtDay(g.date)}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 2 }}>
                        <Text style={styles.upcomingTime}>{fmtTime(g.time)}</Text>
                        <Text style={styles.upcomingHA}>{g.isHome ? 'Home' : 'Away'}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ── DIVISION STANDINGS ── */}
            {data && !loading && data.divisionStandings.length > 0 && (
              <View style={styles.section}>
                <SectionDivider label={data.divisionName || 'Division'} />
                {/* Header */}
                <View style={styles.standRow}>
                  <View style={{ width: 20 }} />
                  <View style={{ flex: 1 }} />
                  <Text style={styles.standHdr}>W</Text>
                  <Text style={styles.standHdr}>L</Text>
                  <Text style={[styles.standHdr, { width: 48, textAlign: 'right' }]}>PCT</Text>
                </View>
                {data.divisionStandings.map((row, i) => (
                  <View
                    key={i}
                    style={[
                      styles.standRow,
                      styles.standRowPad,
                      row.isThis && styles.standRowThis,
                    ]}
                  >
                    <Text style={[styles.standRank, i === 0 && styles.standRankGold]}>{i + 1}</Text>
                    {row.logo
                      ? <Image source={{ uri: row.logo }} style={styles.standLogo} resizeMode="contain" />
                      : <View style={styles.standLogoFallback} />
                    }
                    <Text style={[styles.standAbbr, row.isThis && styles.standAbbrThis]} numberOfLines={1}>
                      {row.abbr}
                    </Text>
                    <Text style={[styles.standStat, row.isThis && styles.standStatThis]}>{row.wins}</Text>
                    <Text style={styles.standStatFaint}>{row.losses}</Text>
                    <Text style={[styles.standPct]}>
                      {row.winPct > 0 ? `.${Math.round(row.winPct * 1000).toString().padStart(3, '0')}` : '—'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Venue */}
            {data?.venue ? (
              <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 4, paddingTop: 4, paddingBottom: 8 }}>
                <Text style={styles.venueTxt}>📍 {data.venue}</Text>
              </View>
            ) : null}

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
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: SURFACE,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  dragArea: { alignItems: 'center', paddingTop: 12, paddingBottom: 6 },
  dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' },
  closeBtn: {
    position: 'absolute', top: 12, right: 16,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },

  // Hero
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingBottom: 20 },
  heroLogo: { width: 76, height: 76, flexShrink: 0 },
  heroLogoFallback: { width: 76, height: 76, borderRadius: 38, backgroundColor: SURFACE2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  heroLogoText: { color: TEXT_FAINT, fontSize: 20, fontWeight: '700' },
  location: { color: TEXT_FAINT, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  teamName: { color: TEXT, fontSize: 26, fontWeight: '800', textTransform: 'uppercase', lineHeight: 30 },
  record: { color: TEXT_FAINT, fontSize: 13, fontWeight: '600', marginTop: 2 },

  // Loading
  loadingBlock: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  loadingText: { color: TEXT_FAINT, fontSize: 13 },

  // Sections
  section: { marginBottom: 16 },

  // Last 3 games grid
  last3Grid: { flexDirection: 'row', gap: 8 },
  miniCard: {
    flex: 1, borderRadius: 10, overflow: 'hidden',
    backgroundColor: SURFACE2, borderWidth: 1, borderColor: BORDER,
  },
  miniRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 8, paddingBottom: 4, gap: 6 },
  miniRowBorder: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 4, paddingBottom: 8 },
  miniLogo: { width: 22, height: 22, flexShrink: 0 },
  miniLogoFallback: { width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', flexShrink: 0 },
  miniAbbr: { flex: 1, color: '#d4d4d8', fontSize: 11, fontWeight: '600' },
  miniScore: { fontSize: 15, fontWeight: '800', tabularNums: true } as any,
  miniScoreWin: { color: TEXT },
  miniScoreLoss: { color: TEXT_FAINT },
  miniFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 5,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  miniResult: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  miniDate: { color: '#52525b', fontSize: 10 },

  // Next 3 games
  upcomingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10,
    backgroundColor: SURFACE2, borderWidth: 1, borderColor: BORDER,
  },
  upcomingLogo: { width: 28, height: 28, flexShrink: 0 },
  upcomingLogoFallback: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  upcomingLogoText: { color: TEXT_FAINT, fontSize: 9, fontWeight: '600' },
  upcomingOpp: { color: TEXT, fontSize: 14, fontWeight: '700' },
  upcomingDate: { color: TEXT_FAINT, fontSize: 11, marginTop: 2 },
  upcomingTime: { color: '#e4d5bb', fontSize: 14, fontWeight: '700' },
  upcomingHA: { color: TEXT_FAINT, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },

  // Division standings
  standRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8 },
  standRowPad: { paddingVertical: 10, borderRadius: 10, marginBottom: 2, borderWidth: 1, borderColor: 'transparent' },
  standRowThis: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' },
  standHdr: { width: 32, color: '#52525b', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  standRank: { width: 20, color: TEXT_FAINT, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  standRankGold: { color: '#fbbf24' },
  standLogo: { width: 24, height: 24, flexShrink: 0 },
  standLogoFallback: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', flexShrink: 0 },
  standAbbr: { flex: 1, color: '#9ca3af', fontSize: 14, fontWeight: '700' },
  standAbbrThis: { color: TEXT },
  standStat: { width: 32, color: '#9ca3af', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  standStatThis: { color: TEXT },
  standStatFaint: { width: 32, color: TEXT_FAINT, fontSize: 14, textAlign: 'center' },
  standPct: { width: 48, color: '#9ca3af', fontSize: 12, textAlign: 'right' },

  // Venue
  venueTxt: { color: TEXT_FAINT, fontSize: 12 },
});
