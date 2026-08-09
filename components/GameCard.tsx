import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Pressable, Animated, StyleSheet } from 'react-native';
import { SURFACE, BORDER, TEXT_FAINT, ACCENT } from '../constants/theme';
import { isEffectivelyLive } from '../lib/normalizeGame';
import { FONT_BLACK } from '../constants/fonts';

interface Team {
  id?: string;
  name: string;
  abbreviation: string;
  logo?: string;
}

interface GameCardProps {
  awayTeam: Team;
  homeTeam: Team;
  awayScore?: number | string;
  homeScore?: number | string;
  status: string;
  period?: string;
  sport: string;
  sportLabel?: string;
  gameId: string;
  onPress?: () => void;
  gameTime?: string;
  kickoff?: string;
  formDots?: ('W' | 'L' | 'T')[];
  compact?: boolean;       // schedule/upcoming list style
  noDivider?: boolean;     // suppress bottom border in compact mode
  broadcasts?: string;     // broadcast network label
  featured?: boolean;      // larger logo display
  venue?: string;          // venue name
  isProGame?: boolean;     // for ticket badge
}

export default function GameCard({
  awayTeam, homeTeam, awayScore, homeScore,
  status, period, sport: _sport, sportLabel,
  gameId: _gameId, onPress, gameTime, kickoff,
  compact = false, noDivider = false,
  broadcasts, featured, venue, isProGame,
}: GameCardProps) {
  const lower = (status ?? '').toLowerCase();
  const isLive  = isEffectivelyLive(status, _sport ?? '', kickoff);
  const isFinal = lower === 'final' || lower.includes('final');
  const isUp    = !isLive && !isFinal;

  const hasScore = (isLive || isFinal) && awayScore !== undefined && homeScore !== undefined;
  const awayNum  = Number(awayScore);
  const homeNum  = Number(homeScore);
  const awayWon  = isFinal && hasScore && awayNum > homeNum;
  const homeWon  = isFinal && hasScore && homeNum > awayNum;

  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isLive) { pulse.setValue(1); return; }
    const a = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.15, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,    duration: 700, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [isLive, pulse]);

  // COMPACT UPCOMING MODE — clean phone-first matchup card.
  // Upcoming games need more room for names/time than live/final score rows,
  // so do not force them through the dense score layout.
  if (compact && isUp) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.upcomingCard,
          pressed && { backgroundColor: 'rgba(255,255,255,0.04)' },
        ]}
      >
        <View style={styles.upcomingTeamLeft}>
          <Text style={styles.upcomingSideLabel}>Away</Text>
          <View style={styles.upcomingTeamLineLeft}>
            <Text style={styles.upcomingTeamNameLeft} numberOfLines={1}>
              {awayTeam.name}
            </Text>
            {awayTeam.logo
              ? <Image source={{ uri: awayTeam.logo }} style={styles.upcomingLogo} resizeMode="contain" />
              : <View style={styles.upcomingLogoFallback}><Text style={styles.upcomingLogoText}>{awayTeam.abbreviation?.slice(0,3)}</Text></View>
            }
          </View>
          <Text style={styles.upcomingAbbrLeft} numberOfLines={1}>{awayTeam.abbreviation}</Text>
        </View>

        <View style={styles.upcomingCenter}>
          <Text style={styles.upcomingTime} numberOfLines={1} allowFontScaling={false}>
            {gameTime ?? 'TBD'}
          </Text>
          <Text style={styles.upcomingVs}>vs</Text>
          {sportLabel ? (
            <Text style={styles.upcomingSport} numberOfLines={1}>{sportLabel}</Text>
          ) : null}
        </View>

        <View style={styles.upcomingTeamRight}>
          <Text style={styles.upcomingSideLabel}>Home</Text>
          <View style={styles.upcomingTeamLineRight}>
            {homeLogo(homeTeam)}
            <Text style={styles.upcomingTeamNameRight} numberOfLines={1}>
              {homeTeam.name}
            </Text>
          </View>
          <Text style={styles.upcomingAbbrRight} numberOfLines={1}>{homeTeam.abbreviation}</Text>
        </View>

        <Text style={styles.upcomingChevron}>›</Text>
      </Pressable>
    );
  }

  // COMPACT LIVE/FINAL MODE — dense score-emphasis row
  if (compact) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.compactRow,
          noDivider && styles.compactRowNoDivider,
          isLive && styles.compactRowLive,
          pressed && { backgroundColor: 'rgba(255,255,255,0.02)' },
        ]}
      >
        {/* Status col */}
        <View style={styles.compactStatus}>
          {isLive ? (
            <Text style={styles.liveLabel}>LIVE</Text>
          ) : isFinal ? (
            <Text style={styles.compactStatusText}>Final</Text>
          ) : (
            <Text style={styles.compactStatusText}>{gameTime ?? 'TBD'}</Text>
          )}
          {sportLabel ? <Text style={styles.compactSport}>{sportLabel}</Text> : null}
        </View>
        {/* Away team */}
        <View style={styles.compactAway}>
          {awayTeam.logo
            ? <Image source={{ uri: awayTeam.logo }} style={styles.compactLogo} resizeMode="contain" />
            : <View style={styles.compactLogoFallback}><Text style={styles.compactLogoText}>{awayTeam.abbreviation?.slice(0,3)}</Text></View>
          }
          <Text style={[styles.compactTeamName, isFinal && homeWon && styles.loserText]} numberOfLines={1}>
            {awayTeam.name}
          </Text>
        </View>
        {/* Score */}
        <View style={styles.compactScoreBlock}>
          {hasScore
            ? <Text style={styles.compactScore} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} allowFontScaling={false}>{awayScore}–{homeScore}</Text>
            : <Text style={styles.compactVs}>vs</Text>
          }
        </View>
        {/* Home team */}
        <View style={styles.compactHome}>
          {homeLogo(homeTeam)}
          <Text style={[styles.compactTeamName, isFinal && awayWon && styles.loserText]} numberOfLines={1}>
            {homeTeam.name}
          </Text>
        </View>
        {/* Chevron */}
        <Text style={styles.compactChevron}>›</Text>
      </Pressable>
    );
  }

  // FULL MODE — big card matching web app (Away | Score | Home)
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isLive && styles.cardLive,
        isFinal && styles.cardFinal,
        pressed && { opacity: 0.9 },
      ]}
    >
      {/* Ticket badge for upcoming pro games */}
      {isProGame && isUp && (
        <View style={styles.ticketBadge}>
          <Text style={styles.ticketEmoji}>🎟️</Text>
        </View>
      )}

      {/* Card header row: [sport label] [status/time] [broadcast] */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardHeaderSport}>{sportLabel ?? ''}</Text>
        <View style={styles.cardHeaderStatus}>
          {isLive && <Animated.View style={[styles.liveDot, { opacity: pulse }]} />}
          <Text style={isLive ? styles.liveLabel : isFinal ? styles.finalLabel : styles.timeLabel}>
            {isLive
              ? (period ? `LIVE · ${period}` : 'LIVE')
              : isFinal
              ? 'FINAL'
              : (gameTime ?? 'TBD')}
          </Text>
        </View>
        <Text style={styles.cardHeaderBroadcast}>{broadcasts ?? ''}</Text>
      </View>

      {/* Away | Score | Home */}
      <View style={styles.matchup}>
        <TeamCol team={awayTeam} won={awayWon} lost={isFinal && homeWon} isAway featured={featured} />

        <View style={styles.scoreBlock}>
          {hasScore ? (
            <>
              <View style={styles.scoreRow}>
                <Text style={[styles.score, isFinal && homeWon && styles.scoreLoser]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} allowFontScaling={false}>{awayScore}</Text>
                <Text style={styles.scoreDash}>–</Text>
                <Text style={[styles.score, isFinal && awayWon && styles.scoreLoser]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} allowFontScaling={false}>{homeScore}</Text>
              </View>
              {isFinal && <Text style={styles.ftText}>FINAL</Text>}
            </>
          ) : (
            <Text style={styles.vs}>vs</Text>
          )}
        </View>

        <TeamCol team={homeTeam} won={homeWon} lost={isFinal && awayWon} featured={featured} />
      </View>

      {/* Venue */}
      {venue ? <Text style={styles.venueText}>{venue}</Text> : null}
    </Pressable>
  );
}

function homeLogo(team: { logo?: string; abbreviation: string }) {
  return team.logo
    ? <Image source={{ uri: team.logo }} style={styles.compactLogo} resizeMode="contain" />
    : <View style={styles.compactLogoFallback}><Text style={styles.compactLogoText}>{team.abbreviation?.slice(0,3)}</Text></View>;
}

function TeamCol({
  team, won, lost, isAway, featured,
}: {
  team: { logo?: string; name: string; abbreviation: string };
  won: boolean;
  lost: boolean;
  isAway?: boolean;
  featured?: boolean;
}) {
  const logoSize = featured ? 60 : 52;
  const logoRadius = featured ? 12 : 0;
  return (
    <View style={styles.teamCol}>
      {won && <Text style={styles.winIndicator}>{isAway ? '▲' : '▲'}</Text>}
      {team.logo
        ? <Image
            source={{ uri: team.logo }}
            style={[styles.logo, { width: logoSize, height: logoSize, borderRadius: logoRadius }, lost && styles.logoDim]}
            resizeMode="contain"
          />
        : <View style={[styles.logoFallback, { width: logoSize, height: logoSize }, lost && styles.logoDim]}>
            <Text style={styles.logoFallbackText}>{team.abbreviation?.slice(0,3)}</Text>
          </View>
      }
      <Text style={[styles.teamName, lost && styles.loserText]} numberOfLines={1}>{team.name}</Text>
      <Text style={styles.teamAbbr}>{team.abbreviation}</Text>
    </View>
  );
}

const LOSER_COLOR = 'rgb(63,79,98)';

const styles = StyleSheet.create({
  // ── Full card ──────────────────────────────────────────────────────────────
  card: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    marginHorizontal: 12,
    marginBottom: 10,
    paddingVertical: 14,
    paddingHorizontal: 4,
    overflow: 'visible',
  },
  cardLive:  { borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  cardFinal: { opacity: 0.88 },

  // Card header (3-col: sport | status | broadcast)
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  cardHeaderSport: {
    color: '#2d4a6b', fontSize: 9, fontWeight: '700',
    letterSpacing: 1.4, textTransform: 'uppercase', flex: 1,
  },
  cardHeaderStatus: {
    flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center',
  },
  cardHeaderBroadcast: {
    color: '#2d4a6b', fontSize: 10, flex: 1, textAlign: 'right',
  },

  liveDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' },
  liveLabel: { color: '#f87171', fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  finalLabel:{ color: TEXT_FAINT, fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  timeLabel: { color: '#f0f0f8', fontSize: 12, fontWeight: '600' },

  matchup: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },

  teamCol: { flex: 1, alignItems: 'center', gap: 6 },
  logo:    { width: 52, height: 52 },
  logoDim: { opacity: 0.35 },
  logoFallback: { width: 52, height: 52, borderRadius: 8, backgroundColor: '#1a2d4a', alignItems: 'center', justifyContent: 'center' },
  logoFallbackText: { color: TEXT_FAINT, fontSize: 11, fontWeight: '700' },
  teamName: { color: '#F2E6CF', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  teamAbbr: { color: LOSER_COLOR, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: -4 },
  winIndicator: { color: ACCENT, fontSize: 10, fontWeight: '900' },

  scoreBlock: { width: 124, alignItems: 'center', gap: 2, flexShrink: 0 },
  scoreRow:   { flexDirection: 'row', alignItems: 'baseline', gap: 1, flexWrap: 'nowrap' },
  score:      { color: '#F2E6CF', fontSize: 46, fontWeight: '900', fontFamily: FONT_BLACK, letterSpacing: -0.6, lineHeight: 50, minWidth: 46, textAlign: 'center', fontVariant: ['tabular-nums'] },
  scoreLoser: { color: LOSER_COLOR },
  scoreDash:  { color: '#1e3050', fontSize: 22, fontWeight: '900', marginHorizontal: 1 },
  ftText:     { color: TEXT_FAINT, fontSize: 9, fontWeight: '700', letterSpacing: 3, textTransform: 'uppercase' },
  vs:         { color: '#1e3050', fontSize: 20, fontWeight: '900' },
  loserText:  { color: LOSER_COLOR },

  venueText:  { fontSize: 10, color: '#5F6773', textAlign: 'center', marginTop: 4, marginHorizontal: 8 },
  sportLabel: { color: '#2d4a6b', fontSize: 9, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', textAlign: 'center', marginTop: 10 },

  // Ticket badge
  ticketBadge: {
    position: 'absolute', top: -36, alignSelf: 'center',
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#D95C17',
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  ticketEmoji: { fontSize: 28 },

  // ── Compact row ────────────────────────────────────────────────────────────
  compactRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'transparent',
  },
  compactRowNoDivider: { borderBottomWidth: 0 },
  compactRowLive: { borderLeftWidth: 2, borderLeftColor: '#ef4444', paddingLeft: 13 },
  compactStatus:    { width: 64, flexShrink: 0, gap: 2 },
  compactStatusText:{ color: TEXT_FAINT, fontSize: 11, fontWeight: '600' },
  compactSport:     { color: '#2d4a6b', fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  compactAway:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  compactHome:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 6 },
  compactLogo:      { width: 26, height: 26 },
  compactLogoFallback: { width: 26, height: 26, borderRadius: 4, backgroundColor: '#1a2d4a', alignItems: 'center', justifyContent: 'center' },
  compactLogoText:  { color: TEXT_FAINT, fontSize: 7, fontWeight: '700' },
  compactTeamName:  { color: '#F2E6CF', fontSize: 13, fontWeight: '600', flexShrink: 1 },
  compactScoreBlock:{ width: 70, minWidth: 70, alignItems: 'center', flexShrink: 0 },
  compactScore:     { color: '#F2E6CF', fontSize: 14, lineHeight: 18, fontWeight: '800', fontVariant: ['tabular-nums'], minWidth: 62, textAlign: 'center' },
  compactVs:        { color: TEXT_FAINT, fontSize: 12, fontWeight: '600' },
  compactChevron:   { color: TEXT_FAINT, fontSize: 20, paddingLeft: 4 },

  // ── Upcoming compact card ──────────────────────────────────────────────────
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 4,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: SURFACE,
  },
  upcomingTeamLeft:  { flex: 1, minWidth: 0, alignItems: 'flex-end', gap: 2 },
  upcomingTeamRight: { flex: 1, minWidth: 0, alignItems: 'flex-start', gap: 2 },
  upcomingTeamLineLeft:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 7, minWidth: 0 },
  upcomingTeamLineRight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 7, minWidth: 0 },
  upcomingSideLabel: { color: '#2d4a6b', fontSize: 9, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
  upcomingTeamNameLeft:  { color: '#F2E6CF', fontSize: 13, lineHeight: 17, fontWeight: '800', textAlign: 'right', flexShrink: 1, minWidth: 0 },
  upcomingTeamNameRight: { color: '#F2E6CF', fontSize: 13, lineHeight: 17, fontWeight: '800', textAlign: 'left', flexShrink: 1, minWidth: 0 },
  upcomingAbbrLeft:  { color: TEXT_FAINT, fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', textAlign: 'right' },
  upcomingAbbrRight: { color: TEXT_FAINT, fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', textAlign: 'left' },
  upcomingLogo: { width: 24, height: 24, flexShrink: 0 },
  upcomingLogoFallback: { width: 24, height: 24, borderRadius: 5, backgroundColor: '#1a2d4a', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  upcomingLogoText: { color: TEXT_FAINT, fontSize: 7, fontWeight: '800' },
  upcomingCenter: {
    width: 72,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    marginHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  upcomingTime: { color: '#F2E6CF', fontSize: 12, lineHeight: 15, fontWeight: '800', fontVariant: ['tabular-nums'], textAlign: 'center' },
  upcomingVs: { color: '#1e3050', fontSize: 12, lineHeight: 14, fontWeight: '900', textTransform: 'uppercase' },
  upcomingSport: { color: TEXT_FAINT, fontSize: 8, lineHeight: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  upcomingChevron: { color: TEXT_FAINT, fontSize: 20, paddingLeft: 4, marginRight: -2 },
});
