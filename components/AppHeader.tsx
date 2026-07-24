import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Image, TouchableOpacity, Modal, StyleSheet,
  Dimensions, Pressable, ScrollView, Animated,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { BG, BORDER, ACCENT, TEXT_FAINT, SURFACE2 } from '../constants/theme';
import { useSportsData } from '../context/SportsDataContext';
import { ALL_PRO_TEAMS } from '../lib/allProTeams';
import { supabase } from '../lib/supabase';

const SCREEN_W = Dimensions.get('window').width;
const PANEL_W  = Math.min(280, SCREEN_W * 0.8);

// ─── Hamburger icon ───────────────────────────────────────────────────────────
function HamburgerIcon() {
  return (
    <View style={{ gap: 5, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 22, height: 1.5, backgroundColor: '#a1a1aa', borderRadius: 1 }} />
      <View style={{ width: 22, height: 1.5, backgroundColor: '#a1a1aa', borderRadius: 1 }} />
      <View style={{ width: 22, height: 1.5, backgroundColor: '#a1a1aa', borderRadius: 1 }} />
    </View>
  );
}

// ─── Close icon ───────────────────────────────────────────────────────────────
function CloseIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path d="M5 5L15 15M15 5L5 15" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

// ─── Menu row ─────────────────────────────────────────────────────────────────
function MenuItem({
  label, onPress, noBorder,
}: { label: string; onPress?: () => void; noBorder?: boolean }) {
  const [pressed, setPressed] = useState(false);
  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      activeOpacity={1}
      style={[
        menuStyles.item,
        !noBorder && menuStyles.itemBorder,
        pressed && { backgroundColor: 'rgba(255,255,255,0.05)' },
      ]}
    >
      <Text style={menuStyles.label}>{label}</Text>
    </TouchableOpacity>
  );
}
const menuStyles = StyleSheet.create({
  item:       { paddingVertical: 16, paddingHorizontal: 24 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.14)' },
  label:      { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
});

// ─── Slide-in hamburger drawer ────────────────────────────────────────────────
function HamburgerDrawer({
  visible, onClose,
}: { visible: boolean; onClose: () => void }) {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={drawer.backdrop} onPress={onClose} />

      {/* Panel */}
      <View style={drawer.panel}>
        {/* Close button */}
        <View style={drawer.closeRow}>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={drawer.closeBtn}>
            <CloseIcon />
          </TouchableOpacity>
        </View>

        {/* Logo */}
        <View style={drawer.logoWrap}>
          <Image
            source={require('../assets/images/sp-logo-home.png')}
            style={drawer.logo}
            resizeMode="contain"
          />
        </View>

        {/* Divider */}
        <View style={drawer.divider} />

        {/* Avatar placeholder slot */}
        <View style={drawer.avatarRow}>
          {session ? (
            <View style={drawer.avatarCircle}>
              <Text style={drawer.avatarText}>{session.user?.email?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
          ) : (
            <View style={drawer.avatarPlaceholder} />
          )}
          {session && (
            <Text style={drawer.avatarEmail} numberOfLines={1}>{session.user?.email}</Text>
          )}
        </View>

        {/* Menu items */}
        {session ? (
          <MenuItem
            label="Sign Out"
            onPress={async () => { await supabase.auth.signOut(); onClose(); }}
          />
        ) : (
          <MenuItem
            label="Sign In"
            onPress={() => { onClose(); router.push('/auth/login' as any); }}
          />
        )}
        <MenuItem
          label="Settings"
          onPress={() => { onClose(); router.push('/settings' as any); }}
        />
        <MenuItem
          label="Feedback"
          onPress={() => { onClose(); router.push('/roadmap' as any); }}
          noBorder
        />
      </View>
    </Modal>
  );
}
const drawer = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: PANEL_W,
    backgroundColor: BG,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.16)',
    flexDirection: 'column',
  },
  closeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 70,
  },
  logo: {
    height: 60,
    width: 60,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 12,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 12,
  },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#D95C17',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  avatarEmail: { color: '#a1a1aa', fontSize: 12, flex: 1 },
  avatarPlaceholder: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});

// ─── GlobalFilterBar ─────────────────────────────────────────────────────────
function GlobalFilterBar() {
  const { followedTeams, activeFilter, setActiveFilter } = useSportsData();

  const filterableTeams = ALL_PRO_TEAMS.filter(t => followedTeams.includes(t.id));
  if (filterableTeams.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={fb.bar}
      contentContainerStyle={fb.content}
    >
      {/* ALL chip */}
      <TouchableOpacity onPress={() => setActiveFilter('all')} activeOpacity={0.75}>
        <View style={[fb.circle, activeFilter === 'all' && fb.circleActive]}>
          <Text style={fb.allText}>All</Text>
        </View>
      </TouchableOpacity>

      {/* Team logo chips */}
      {filterableTeams.map(team => {
        const isActive = activeFilter === team.id;
        const isDimmed = activeFilter !== 'all' && !isActive;
        return (
          <TouchableOpacity
            key={team.id}
            onPress={() => setActiveFilter(isActive ? 'all' : team.id)}
            activeOpacity={0.75}
          >
            <View style={[
              fb.circle, fb.circleTeam,
              isActive && fb.circleActive,
              isDimmed && fb.circleDim,
            ]}>
              <Image source={{ uri: team.logo }} style={fb.logo} resizeMode="contain" />
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const fb = StyleSheet.create({
  bar:     { maxHeight: 66, borderBottomWidth: 1, borderBottomColor: BORDER },
  content: { paddingHorizontal: 16, paddingVertical: 10, gap: 10, flexDirection: 'row', alignItems: 'center' },
  circle: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2, borderColor: 'transparent',
    alignItems: 'center', justifyContent: 'center',
  },
  circleTeam:   { overflow: 'hidden', padding: 4 },
  circleActive: { borderColor: ACCENT },
  circleDim:    { opacity: 0.35 },
  logo:         { width: 30, height: 30 },
  allText:      { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
});

// ─── AppHeader (exported) ─────────────────────────────────────────────────────
interface AppHeaderProps {
  /** Hide the global filter bar (e.g. on Teams tab) */
  hideFilter?: boolean;
  /** Show the orange "● Live Now" pill */
  showLive?: boolean;
}

export default function AppHeader({ hideFilter, showLive }: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const dotScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!showLive) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(dotScale, { toValue: 1.4, duration: 800, useNativeDriver: true }),
        Animated.timing(dotScale, { toValue: 1.0, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [showLive, dotScale]);

  return (
    <>
      <View style={header.container}>
        {/* Centered logo */}
        <View style={header.logoWrap} pointerEvents="none">
          {logoError ? (
            <Text style={header.logoFallback}>SCORPANION</Text>
          ) : (
            <Image
              source={require('../assets/images/scorpanion-logo.png')}
              style={header.logo}
              resizeMode="contain"
              onError={() => setLogoError(true)}
            />
          )}
        </View>

        {/* Live pill (left) */}
        {showLive && (
          <View style={header.livePill}>
            <Animated.View style={[header.liveDot, { transform: [{ scale: dotScale }] }]} />
            <Text style={header.liveText}>Live Now</Text>
          </View>
        )}

        {/* Hamburger button (right) */}
        <TouchableOpacity
          style={header.hamburger}
          onPress={() => setMenuOpen(true)}
          hitSlop={12}
          activeOpacity={0.7}
        >
          <HamburgerIcon />
        </TouchableOpacity>
      </View>

      {!hideFilter && <GlobalFilterBar />}

      <HamburgerDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
    </>
  );
}

const header = StyleSheet.create({
  container: {
    height: 90,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    position: 'relative',
  },
  logoWrap: {
    position: 'absolute',
    left: 0, right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    height: 90,
    overflow: 'hidden',
  },
  logo: {
    height: 128,
    width: 320,
  },
  logoFallback: {
    color: '#F2E6CF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 3,
  },
  livePill: {
    position: 'absolute',
    left: 16,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,180,0,0.12)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,180,0,0.25)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFB400',
  },
  liveText: {
    color: '#FFB400',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  hamburger: {
    position: 'absolute',
    right: 16,
    bottom: 12,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
