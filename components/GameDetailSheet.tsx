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
  StyleSheet,
  Dimensions,
} from 'react-native';
import { getSeattleTeamLogo } from '../lib/normalizeGame';
import type { ScorpanionGame, WebTeamDetail, TeamSheetParams } from '../lib/types';
import TeamDetailSheet from './TeamDetailSheet';
import BoxScore from './BoxScore';
import UpcomingScheduleSection from './UpcomingScheduleSection';

// ─── Constants ────────────────────────────────────────────────────────────────

const BG           = '#0c1b31';
const SURFACE2     = '#1a2d4a';
const BORDER       = '#1e3050';
const TEXT         = '#F2E6CF';
const TEXT_FAINT   = '#5F6773';
const ACCENT       = '#D95C17';
const LOSER        = '#3f4f62';
const WIN_GREEN    = '#34d399';
const LOSS_RED     = '#f87171';
const TIE_GRAY     = '#52525b';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.94;
const SWIPE_CLOSE_DY = 120;
const SWIPE_CLOSE_VY = 0.5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseKickoff(kickoff: string): Date {
  if (!kickoff) return new Date(NaN);
  if (kickoff.includes('T') || kickoff.startsWith('20')) return new Date(kickoff);
  const [datePart = '', timePart = '00:00:00'] = kickoff.split(' ');
  const parts = datePart.split('/');
  if (parts.length === 3) {
    const [mm, dd, yyyy] = parts;
    return new Date(`${yyyy}-${(mm ?? '1').padStart(2,'0')}-${(dd ?? '1').padStart(2,'0')}T${timePart}Z`);
  }
  return new Date(kickoff);
}

function fmtDate(iso: string): string {
  return parseKickoff(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getLiveDetail(game: ScorpanionGame): string {
  const p = game.period ? Number(game.period) : null;
  const clk = game.clock;
  if (game.sport === 'baseball' && p) {
    const half = p % 2 === 1 ? 'Top' : 'Bot';
    return `${half} ${Math.ceil(p / 2)}${clk ? ' · ' + clk : ''}`;
  }
  if (game.sport === 'basketball' && p) return clk ? `Q${p}  ${clk}` : `Q${p}`;
  if (game.sport === 'hockey' && p) { const l = ['1st','2nd','3rd','OT'][p-1] || `P${p}`; return clk ? `${l}  ${clk}` : l; }
  if (game.sport === 'football' && p) { const l = ['1st','2nd','3rd','4th','OT'][p-1] || `Q${p}`; return clk ? `${l}  ${clk}` : l; }
  if (game.sport === 'soccer') return clk ? `${clk}′` : 'Live';
  return clk || 'Live';
}

function formatRecord(r?: { wins: number; losses: number; ties?: number }): string {
  if (!r) return '';
  return r.ties ? `${r.wins}-${r.losses}-${r.ties}` : `${r.wins}-${r.losses}`;
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
  row:   { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  line:  { flex: 1, height: 1, backgroundColor: 'rgba(113,113,122,0.3)' },
  label: { color: TEXT_FAINT, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
});

// ─── Form dots ────────────────────────────────────────────────────────────────

function FormDots({ form }: { form: { result: 'W' | 'L' | 'T' }[] }) {
  if (!form || form.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
      {[...form].reverse().slice(0, 5).map((f, i) => (
        <View
          key={i}
          style={{
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: f.result === 'W' ? WIN_GREEN : f.result === 'L' ? LOSS_RED : TIE_GRAY,
          }}
        />
      ))}
    </View>
  );
}

// ─── Team context card (form + standings) ────────────────────────────────────

function TeamContext({ name, color, detail }: { name: string; color: string; detail: WebTeamDetail | null }) {
  if (!detail) return null;
  const form = detail.recentForm?.slice(0, 5) ?? [];
  const standings = detail.divisionStandings ?? [];

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: TEXT, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>{name}</Text>
      {form.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ color: TEXT_FAINT, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', width: 40 }}>Last 5</Text>
          <FormDots form={form} />
        </View>
      )}
      {standings.length > 0 && (
        <View style={{ gap: 2 }}>
          {standings.map((row, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3,
                borderLeftWidth: 2,
                borderLeftColor: row.isThis ? color : 'transparent',
                paddingLeft: 6,
              }}
            >
              {row.logo
                ? <Image source={{ uri: row.logo }} style={{ width: 12, height: 12, opacity: row.isThis ? 1 : 0.5 }} resizeMode="contain" />
                : <View style={{ width: 12, height: 12 }} />
              }
              <Text style={{ flex: 1, color: row.isThis ? TEXT : TEXT_FAINT, fontSize: 11, fontWeight: row.isThis ? '700' : '400' }}>
                {row.abbr}
              </Text>
              <Text style={{ color: row.isThis ? TEXT : TEXT_FAINT, fontSize: 11, fontWeight: row.isThis ? '700' : '400' }}>
                {row.wins}–{row.losses}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  game: ScorpanionGame;
  onClose: () => void;
}

export default function GameDetailSheet({ game, onClose }: Props) {
  const [teamSheet, setTeamSheet] = useState<TeamSheetParams | null>(null);
  const [seaDetail, setSeaDetail] = useState<WebTeamDetail | null>(null);
  const [oppDetail, setOppDetail] = useState<WebTeamDetail | null>(null);

  const translateY    = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const pulse         = useRef(new Animated.Value(1)).current;
  const closeRef      = useRef<() => void>(() => {});

  // ── State flags ──
  const isLive     = game.status === 'live';
  const isFt       = game.status === 'ft';
  const isUpcoming = !isLive && !isFt;
  const hasScore   = (isLive || isFt) && game.seattleScore !== undefined && game.opponentScore !== undefined;
  const liveDetail = isLive ? getLiveDetail(game) : '';

  // ── Away / Home layout ──
  const seattleLogoUrl = getSeattleTeamLogo(game.seattleTeam.id) ?? game.seattleTeam.logoUrl ?? '';
  const awayLogo   = game.isHome ? game.opponent.logo  : seattleLogoUrl;
  const awayAbbr   = game.isHome ? game.opponent.abbr  : game.seattleTeam.abbr;
  const awayName   = game.isHome ? (game.opponent.shortName || game.opponent.name) : game.seattleTeam.shortName;
  const awayDetail = game.isHome ? oppDetail : seaDetail;
  const awayColor  = game.isHome ? (oppDetail?.color ?? '#374151') : (game.seattleTeam.primaryColor ?? ACCENT);
  const awayRecord = game.isHome ? game.opponentRecord : game.seattleRecord;

  const homeLogo   = game.isHome ? seattleLogoUrl     : game.opponent.logo;
  const homeAbbr   = game.isHome ? game.seattleTeam.abbr : game.opponent.abbr;
  const homeName   = game.isHome ? game.seattleTeam.shortName : (game.opponent.shortName || game.opponent.name);
  const homeDetail = game.isHome ? seaDetail : oppDetail;
  const homeColor  = game.isHome ? (game.seattleTeam.primaryColor ?? ACCENT) : (oppDetail?.color ?? '#374151');
  const homeRecord = game.isHome ? game.seattleRecord : game.opponentRecord;

  const awayScore = game.isHome ? game.opponentScore : game.seattleScore;
  const homeScore = game.isHome ? game.seattleScore  : game.opponentScore;
  const awayWon   = hasScore && (awayScore ?? 0) > (homeScore ?? 0);
  const homeWon   = hasScore && (homeScore ?? 0) > (awayScore ?? 0);

  // ── Fetch team details ──
  useEffect(() => {
    let mounted = true;
    const seaId = game.seattleTeam.espnId || game.seattleTeam.id;
    const oppId = game.opponent.id;
    const league = game.league;
    if (!seaId || !oppId) return;
    Promise.all([
      fetch(`https://scorpanion.com/api/team-detail?teamId=${encodeURIComponent(seaId)}&league=${encodeURIComponent(league)}`).then(r => r.ok ? r.json() : null),
      fetch(`https://scorpanion.com/api/team-detail?teamId=${encodeURIComponent(oppId)}&league=${encodeURIComponent(league)}`).then(r => r.ok ? r.json() : null),
    ]).then(([sea, opp]) => {
      if (!mounted) return;
      if (sea) setSeaDetail(sea);
      if (opp) setOppDetail(opp);
    }).catch(() => {});
    return () => { mounted = false; };
  }, [game.id]);

  // ── Pulsing live dot ──
  useEffect(() => {
    if (!isLive) { pulse.setValue(1); return; }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isLive, pulse]);

  // ── Sheet animation ──
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
  }, [game.id]);

  // ── Team press handlers ──
  function pressAway() {
    const teamId = game.isHome ? game.opponent.id : (game.seattleTeam.espnId || game.seattleTeam.id);
    const teamName = game.isHome ? game.opponent.name : game.seattleTeam.name;
    setTeamSheet({ teamId, teamName, teamLogo: awayLogo, league: game.league });
  }
  function pressHome() {
    const teamId = game.isHome ? (game.seattleTeam.espnId || game.seattleTeam.id) : game.opponent.id;
    const teamName = game.isHome ? game.seattleTeam.name : game.opponent.name;
    setTeamSheet({ teamId, teamName, teamLogo: homeLogo, league: game.league });
  }

  return (
    <>
      <Modal
        transparent
        visible
        animationType="none"
        onRequestClose={teamSheet ? () => setTeamSheet(null) : closeSheet}
        statusBarTranslucent
      >
        <View style={StyleSheet.absoluteFillObject}>
          {/* Backdrop */}
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeSheet}>
            <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.7)', opacity: backdropOpacity }]} />
          </TouchableOpacity>

          {/* Sheet */}
          <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]} onStartShouldSetResponder={() => true}>
            {/* Drag handle */}
            <View {...panResponder.panHandlers} style={styles.dragArea}>
              <View style={styles.dragHandle} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

              {/* ── SCOREBOARD HERO ── */}
              <View style={styles.hero}>

                {/* Away team */}
                <TouchableOpacity style={styles.teamCol} onPress={pressAway} activeOpacity={0.75}>
                  {awayLogo
                    ? <Image source={{ uri: awayLogo }} style={[styles.teamLogo, hasScore && homeWon && styles.logoDim]} resizeMode="contain" />
                    : <View style={[styles.teamLogoFallback, hasScore && homeWon && styles.logoDim]}>
                        <Text style={styles.teamLogoText}>{awayAbbr}</Text>
                      </View>
                  }
                  <Text style={[styles.teamName, hasScore && homeWon && styles.loserText]} numberOfLines={1}>{awayName}</Text>
                  <Text style={styles.teamAbbr}>{awayAbbr}</Text>
                  {(awayRecord || awayDetail) && (
                    <>
                      <Text style={styles.teamRecord}>
                        {awayRecord ? formatRecord(awayRecord) : awayDetail ? `${awayDetail.wins}–${awayDetail.losses}` : ''}
                      </Text>
                      {awayRecord && (
                        <Text style={styles.winPct}>
                          {(() => { const r = awayRecord; const t = r.wins + r.losses + (r.ties ?? 0); return t ? '.' + Math.round((r.wins/t)*1000).toString().padStart(3,'0') : '.000'; })()}
                        </Text>
                      )}
                    </>
                  )}
                </TouchableOpacity>

                {/* Center: score or vs */}
                <View style={styles.centerBlock}>
                  {hasScore ? (
                    <>
                      <View style={styles.scoreRow}>
                        <Text style={[styles.scoreNum, hasScore && homeWon && styles.scoreLoser]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} allowFontScaling={false}>{awayScore}</Text>
                        <Text style={styles.scoreDash}>–</Text>
                        <Text style={[styles.scoreNum, hasScore && awayWon && styles.scoreLoser]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} allowFontScaling={false}>{homeScore}</Text>
                      </View>
                      <View style={styles.statusRow}>
                        {isLive ? (
                          <>
                            <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
                            <Text style={styles.liveLabel}>LIVE</Text>
                            {liveDetail ? <Text style={styles.livePeriod}>· {liveDetail}</Text> : null}
                          </>
                        ) : (
                          <Text style={styles.finalLabel}>FINAL</Text>
                        )}
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={styles.vsText}>vs</Text>
                      <View style={{ alignItems: 'center', gap: 2, marginTop: 6 }}>
                        <Text style={styles.kickoffTime}>
                          {parseKickoff(game.kickoff).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </Text>
                        <Text style={styles.kickoffDate}>{fmtDate(game.kickoff)}</Text>
                      </View>
                    </>
                  )}
                </View>

                {/* Home team */}
                <TouchableOpacity style={styles.teamCol} onPress={pressHome} activeOpacity={0.75}>
                  {homeLogo
                    ? <Image source={{ uri: homeLogo }} style={[styles.teamLogo, hasScore && awayWon && styles.logoDim]} resizeMode="contain" />
                    : <View style={[styles.teamLogoFallback, hasScore && awayWon && styles.logoDim]}>
                        <Text style={styles.teamLogoText}>{homeAbbr}</Text>
                      </View>
                  }
                  <Text style={[styles.teamName, hasScore && awayWon && styles.loserText]} numberOfLines={1}>{homeName}</Text>
                  <Text style={styles.teamAbbr}>{homeAbbr}</Text>
                  {(homeRecord || homeDetail) && (
                    <>
                      <Text style={styles.teamRecord}>
                        {homeRecord ? formatRecord(homeRecord) : homeDetail ? `${homeDetail.wins}–${homeDetail.losses}` : ''}
                      </Text>
                      {homeRecord && (
                        <Text style={styles.winPct}>
                          {(() => { const r = homeRecord; const t = r.wins + r.losses + (r.ties ?? 0); return t ? '.' + Math.round((r.wins/t)*1000).toString().padStart(3,'0') : '.000'; })()}
                        </Text>
                      )}
                    </>
                  )}
                </TouchableOpacity>

              </View>

              {/* ── VENUE + BROADCAST ── */}
              {(game.venue?.city || game.broadcast) && (
                <View style={styles.venueRow}>
                  {game.venue?.city ? (
                    <Text style={styles.venueTxt}>
                      📍 {game.venue.name ? `${game.venue.name}, ` : ''}{game.venue.city}{game.venue.state ? `, ${game.venue.state}` : ''}
                    </Text>
                  ) : null}
                  {game.broadcast ? <Text style={styles.venueTxt}>📺 {game.broadcast}</Text> : null}
                </View>
              )}

              {/* Divider */}
              <View style={styles.hairline} />

              {/* ── BOX SCORE (goals, period breakdown, top performers) ── */}
              {(isLive || isFt) && game.id && (
                <BoxScore
                  eventId={game.id.includes('|') ? game.id.split('|').at(-1)! : game.id}
                  league={game.league}
                  seattleTeamId={game.seattleTeam.espnId || game.seattleTeam.id}
                  color={isLive ? '#ef4444' : (game.seattleTeam.primaryColor ?? '#D95C17')}
                />
              )}

              {/* ── TEAM CONTEXT (form + standings) ── */}
              {(seaDetail || oppDetail) && (
                <View style={styles.contextRow}>
                  <View style={{ flex: 1 }}>
                    <TeamContext name={awayName} color={awayColor} detail={awayDetail} />
                  </View>
                  <View style={styles.contextDivider} />
                  <View style={{ flex: 1 }}>
                    <TeamContext name={homeName} color={homeColor} detail={homeDetail} />
                  </View>
                </View>
              )}

              {/* ── UPCOMING SCHEDULE ── */}
              <UpcomingScheduleSection
                awayName={awayName}
                homeName={homeName}
                awayGames={(awayDetail?.upcomingGames ?? []).slice(0, 3)}
                homeGames={(homeDetail?.upcomingGames ?? []).slice(0, 3)}
              />

              <View style={{ height: 40 }} />
            </ScrollView>

            {/* Close button — rendered AFTER ScrollView so it paints on top
                and its touch target isn't intercepted by the scroll layer.
                hitSlop enlarges the tap area; zIndex/elevation for Android. */}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={closeSheet}
              hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Nested TeamDetailSheet — rendered INSIDE this Modal so it stacks
              above the game sheet on both iOS and Android (avoids the Android
              z-index issue where a sibling Modal can appear behind the first). */}
          {teamSheet && (
            <TeamDetailSheet
              teamId={teamSheet.teamId}
              teamName={teamSheet.teamName}
              teamLogo={teamSheet.teamLogo}
              league={teamSheet.league}
              onClose={() => setTeamSheet(null)}
            />
          )}
        </View>
      </Modal>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.7,
    shadowRadius: 40,
  },
  dragArea: { alignItems: 'center', paddingTop: 12, paddingBottom: 6 },
  dragHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  closeBtn: {
    position: 'absolute', top: 12, right: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10, elevation: 10,
  },
  closeBtnText: { color: 'rgba(255,255,255,0.75)', fontSize: 16 },
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },

  // Hero
  hero: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 4 },
  teamCol: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 8 },
  teamLogo: { width: 52, height: 52 },
  teamLogoFallback: { width: 52, height: 52, borderRadius: 8, backgroundColor: SURFACE2, alignItems: 'center', justifyContent: 'center' },
  teamLogoText: { color: TEXT_FAINT, fontSize: 11, fontWeight: '700' },
  logoDim: { opacity: 0.4 },
  teamName: { color: TEXT, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  loserText: { color: LOSER },
  teamAbbr: { color: TEXT_FAINT, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: -4 },
  teamRecord: { color: TEXT_FAINT, fontSize: 11 },
  winPct: { color: TEXT_FAINT, fontSize: 10 },

  // Score center
  centerBlock: { alignItems: 'center', justifyContent: 'flex-start', paddingTop: 12, width: 124, flexShrink: 0, gap: 4 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 1, flexWrap: 'nowrap' },
  scoreNum: { color: TEXT, fontSize: 46, fontWeight: '900', letterSpacing: -0.6, lineHeight: 50, minWidth: 46, textAlign: 'center', fontFamily: 'BarlowCondensed_900Black', fontVariant: ['tabular-nums'] },
  scoreLoser: { color: LOSER },
  scoreDash: { color: BORDER, fontSize: 22, fontWeight: '900', marginHorizontal: 1 },
  vsText: { color: '#3f3f46', fontSize: 28, fontWeight: '900' },
  kickoffTime: { color: TEXT, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  kickoffDate: { color: TEXT_FAINT, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8 },

  // Status
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' },
  liveLabel: { color: '#f87171', fontSize: 11, fontWeight: '800', letterSpacing: 1.68, textTransform: 'uppercase' },
  livePeriod: { color: TEXT_FAINT, fontSize: 11 },
  finalLabel: { color: TEXT_FAINT, fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },

  // Venue
  venueRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 14 },
  venueTxt: { color: TEXT_FAINT, fontSize: 11 },
  hairline: { height: 1, backgroundColor: 'rgba(113,113,122,0.3)', marginBottom: 16 },

  // Context
  contextRow: { flexDirection: 'row', gap: 8 },
  contextDivider: { width: 1, backgroundColor: 'rgba(113,113,122,0.3)' },
});
