import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  ScrollView, ActivityIndicator, KeyboardAvoidingView,
  Platform, StyleSheet, Pressable,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { BG, BORDER, ACCENT } from '../constants/theme';

const API = 'https://scorpanion.com/api/feedback';

const TEXT     = '#F2E6CF';
const FAINT    = '#7a8fa6';
const SURFACE  = 'rgba(255,255,255,0.04)';
const BORDER_C = 'rgba(255,255,255,0.1)';
const FOCUS_C  = '#00d4ff';

// ─── Close icon ───────────────────────────────────────────────────────────────
function CloseIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Path d="M4 4L14 14M14 4L4 14" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

// ─── Success check icon ───────────────────────────────────────────────────────
function CheckIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Circle cx={8} cy={8} r={7} stroke="#22c55e" strokeWidth={1.2} />
      <Path d="M5 8l2 2 4-4" stroke="#22c55e" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── FeedbackModal ────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ visible, onClose }: Props) {
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [name,        setName]        = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [success,     setSuccess]     = useState(false);

  const [titleFocus, setTitleFocus]   = useState(false);
  const [descFocus,  setDescFocus]    = useState(false);
  const [nameFocus,  setNameFocus]    = useState(false);

  function reset() {
    setTitle(''); setDescription(''); setName('');
    setError(null); setSuccess(false); setSubmitting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!title.trim()) { setError('Title is required'); return; }
    setSubmitting(true); setError(null);
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          name: name.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to submit');
        return;
      }
      setSuccess(true);
      setTitle(''); setDescription(''); setName('');
      // auto-close after 2.5 s
      setTimeout(() => { setSuccess(false); onClose(); }, 2500);
    } catch {
      setError('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={s.backdrop} onPress={handleClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.sheetWrap}
        pointerEvents="box-none"
      >
        <View style={s.sheet}>
          {/* Handle */}
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>Suggest a Feature</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={12} style={s.closeBtn}>
              <CloseIcon />
            </TouchableOpacity>
          </View>

          <Text style={s.subtitle}>
            Your idea goes straight to the roadmap kanban board.
          </Text>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* Success state */}
            {success && (
              <View style={s.successBanner}>
                <CheckIcon />
                <Text style={s.successText}>Submitted! Thanks — we'll review it shortly.</Text>
              </View>
            )}

            {/* Error */}
            {error && (
              <View style={s.errorBanner}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            {/* Title */}
            <Text style={s.label}>Feature title <Text style={{ color: ACCENT }}>*</Text></Text>
            <TextInput
              style={[s.input, titleFocus && s.inputFocus]}
              placeholder='e.g. "Show player stats in game popup"'
              placeholderTextColor="#3d5068"
              value={title}
              onChangeText={setTitle}
              onFocus={() => setTitleFocus(true)}
              onBlur={() => setTitleFocus(false)}
              returnKeyType="next"
            />

            {/* Description */}
            <Text style={[s.label, { marginTop: 14 }]}>Details (optional)</Text>
            <TextInput
              style={[s.input, s.inputMulti, descFocus && s.inputFocus]}
              placeholder="Describe what you'd like in more detail..."
              placeholderTextColor="#3d5068"
              value={description}
              onChangeText={setDescription}
              onFocus={() => setDescFocus(true)}
              onBlur={() => setDescFocus(false)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Name */}
            <Text style={[s.label, { marginTop: 14 }]}>Your name (optional)</Text>
            <TextInput
              style={[s.input, nameFocus && s.inputFocus]}
              placeholder="So we can give you credit"
              placeholderTextColor="#3d5068"
              value={name}
              onChangeText={setName}
              onFocus={() => setNameFocus(true)}
              onBlur={() => setNameFocus(false)}
              returnKeyType="done"
            />

            {/* Submit */}
            <TouchableOpacity
              style={[s.submitBtn, submitting && { opacity: 0.55 }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.submitText}>Submit to Roadmap</Text>
              }
            </TouchableOpacity>

            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 20,
    paddingBottom: 16,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    color: TEXT,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  subtitle: {
    color: FAINT,
    fontSize: 13,
    marginBottom: 20,
  },
  label: {
    color: '#8ca0b8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER_C,
    borderRadius: 10,
    color: TEXT,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputMulti: {
    minHeight: 80,
    paddingTop: 12,
  },
  inputFocus: {
    borderColor: FOCUS_C,
  },
  submitBtn: {
    marginTop: 22,
    backgroundColor: ACCENT,
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(34,197,94,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  successText: {
    color: '#86efac',
    fontSize: 13,
    flex: 1,
  },
  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
  },
});
