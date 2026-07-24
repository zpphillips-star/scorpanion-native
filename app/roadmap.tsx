import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, RefreshControl, Image, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { BG, BORDER, ACCENT } from '../constants/theme';
import FeedbackModal from '../components/FeedbackModal';

const API = 'https://scorpanion.com/api/feedback';
const TEXT  = '#F2E6CF';
const FAINT = '#7a8fa6';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_ORDER = ['submitted', 'backlog', 'live', 'done'] as const;
type Status = typeof STATUS_ORDER[number];

const STATUS_LABEL: Record<Status, string> = {
  submitted: 'Submitted',
  backlog:   'Backlog',
  live:      'In Progress',
  done:      'Shipped ✓',
};

const STATUS_COLOR: Record<Status, string> = {
  submitted: '#D95C17',
  backlog:   '#9ba3ae',
  live:      '#FFB400',
  done:      '#2FA84F',
};

const STATUS_BG: Record<Status, string> = {
  submitted: 'rgba(217,92,23,0.08)',
  backlog:   'rgba(155,163,174,0.12)',
  live:      'rgba(255,180,0,0.12)',
  done:      'rgba(47,168,79,0.12)',
};

// ─── Back icon ────────────────────────────────────────────────────────────────
function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M12.5 5L7.5 10L12.5 15"
        stroke="#a1a1aa"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── RoadmapCard ─────────────────────────────────────────────────────────────
interface RoadmapItem {
  id: string;
  title: string;
  description?: string | null;
  name?: string | null;
  status: string;
  created_at: string;
}

function RoadmapCard({ item }: { item: RoadmapItem }) {
  const status = item.status as Status;
  const color  = STATUS_COLOR[status] ?? FAINT;
  const bg     = STATUS_BG[status]    ?? 'rgba(255,255,255,0.04)';
  const dateLabel = item.created_at
    ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <View style={[card.wrap, { borderLeftColor: color }]}>
      <Text style={card.title}>{item.title}</Text>
      {!!item.description && (
        <Text style={card.desc} numberOfLines={3}>{item.description}</Text>
      )}
      <View style={card.footer}>
        <View style={[card.badge, { backgroundColor: bg, borderColor: color + '44' }]}>
          <Text style={[card.badgeText, { color }]}>{STATUS_LABEL[status] ?? status}</Text>
        </View>
        {!!item.name && (
          <Text style={card.name}>by {item.name}</Text>
        )}
        {dateLabel && <Text style={card.date}>{dateLabel}</Text>}
      </View>
    </View>
  );
}

const card = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    borderLeftWidth: 3,
    padding: 14,
    marginBottom: 10,
  },
  title: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  desc: {
    color: FAINT,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  badge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  name: {
    color: FAINT,
    fontSize: 12,
  },
  date: {
    color: '#7a8fa6',
    fontSize: 11,
  },
});

// ─── Section header ───────────────────────────────────────────────────────────
function Section({ status, items }: { status: Status; items: RoadmapItem[] }) {
  if (items.length === 0) return null;
  const color = STATUS_COLOR[status];
  const [open, setOpen] = useState(true);
  const chevronAnim = useRef(new Animated.Value(0)).current;

  function toggle() {
    const toValue = open ? -90 : 0;
    Animated.timing(chevronAnim, { toValue, duration: 200, useNativeDriver: true }).start();
    setOpen(!open);
  }

  const chevronRotate = chevronAnim.interpolate({ inputRange: [-90, 0], outputRange: ['-90deg', '0deg'] });

  return (
    <View style={section.wrap}>
      <TouchableOpacity style={section.headerRow} onPress={toggle} activeOpacity={0.7}>
        <View style={[section.dot, { backgroundColor: color }]} />
        <Text style={[section.label, { color }]}>{STATUS_LABEL[status]}</Text>
        <View style={[section.count, { backgroundColor: color + '22' }]}>
          <Text style={[section.countText, { color }]}>{items.length}</Text>
        </View>
        <Animated.Text style={[{ color, fontSize: 16, marginLeft: 8 }, { transform: [{ rotate: chevronRotate }] }]}>›</Animated.Text>
      </TouchableOpacity>
      {open && items.map(item => <RoadmapCard key={item.id} item={item} />)}
    </View>
  );
}

const section = StyleSheet.create({
  wrap: { marginBottom: 20 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    flex: 1,
  },
  count: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: { fontSize: 12, fontWeight: '800' },
});

// ─── RoadmapScreen ────────────────────────────────────────────────────────────
export default function RoadmapScreen() {
  const insets = useSafeAreaInsets();
  const [items,       setItems]       = useState<RoadmapItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res  = await fetch(API);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load');
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message ?? 'Network error');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Group by status
  const grouped = STATUS_ORDER.reduce<Record<Status, RoadmapItem[]>>((acc, s) => {
    acc[s] = items.filter(i => i.status === s);
    return acc;
  }, { submitted: [], backlog: [], live: [], done: [] });

  return (
    <View style={[root.container, { paddingTop: insets.top }]}>

      {/* ── Top bar ─────────────────────────────────────────── */}
      <View style={root.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={root.backBtn} hitSlop={12}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={root.heading}>Roadmap</Text>
        <TouchableOpacity
          style={root.suggestBtn}
          onPress={() => setSuggestOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={root.suggestText}>+ Suggest</Text>
        </TouchableOpacity>
      </View>

      <Text style={root.sub}>
        Feature requests from the community — vote with your suggestions.
      </Text>

      {/* ── Content ─────────────────────────────────────────── */}
      {loading ? (
        <View style={root.center}>
          <ActivityIndicator color={ACCENT} />
        </View>
      ) : error ? (
        <View style={root.center}>
          <Text style={root.errorText}>{error}</Text>
          <TouchableOpacity onPress={onRefresh} style={root.retryBtn}>
            <Text style={root.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={root.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={ACCENT}
            />
          }
        >
          {STATUS_ORDER.map(s => (
            <Section key={s} status={s} items={grouped[s]} />
          ))}
          <View style={{ height: insets.bottom + 16 }} />
        </ScrollView>
      )}

      {/* ── Suggest a Feature modal ──────────────────────────── */}
      <FeedbackModal
        visible={suggestOpen}
        onClose={() => { setSuggestOpen(false); onRefresh(); }}
      />
    </View>
  );
}

const root = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginRight: 10,
  },
  heading: {
    flex: 1,
    color: TEXT,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  suggestBtn: {
    backgroundColor: ACCENT,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  suggestText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sub: {
    color: FAINT,
    fontSize: 13,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
