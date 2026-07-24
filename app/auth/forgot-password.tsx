import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleReset() {
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSuccess(true);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={[s.screen, { paddingTop: insets.top + 40, paddingHorizontal: 24 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <Text style={{ color: '#D95C17', fontSize: 16 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Reset Password</Text>
        <Text style={s.sub}>Enter your email to receive a reset link.</Text>

        {!!error && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}
        {success && (
          <View style={s.successBox}>
            <Text style={s.successText}>Check your email for a reset link!</Text>
          </View>
        )}

        <Text style={s.label}>Email</Text>
        <TextInput
          style={s.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#52637a"
          placeholder="you@example.com"
        />

        <TouchableOpacity
          style={[s.submitBtn, { marginTop: 24 }]}
          onPress={handleReset}
          disabled={loading || success}
          activeOpacity={0.8}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>Send Reset Link</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0c1b31' },
  backBtn: { marginBottom: 24 },
  title: { color: '#F2E6CF', fontSize: 28, fontWeight: '700', marginBottom: 8 },
  sub: { color: '#52637a', fontSize: 13, marginBottom: 24 },
  errorBox: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { color: '#f87171', fontSize: 13 },
  successBox: { backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', borderRadius: 10, padding: 12, marginBottom: 16 },
  successText: { color: '#22c55e', fontSize: 13 },
  label: { color: '#9090b0', fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { height: 52, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 14, color: '#F2E6CF', fontSize: 15 },
  submitBtn: { backgroundColor: '#D95C17', borderRadius: 12, height: 52, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
