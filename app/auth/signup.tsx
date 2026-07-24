import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSignup() {
    setError('');
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSuccess(true);
  }

  if (success) {
    return (
      <View style={[s.screen, { alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>📧</Text>
        <Text style={{ color: '#F2E6CF', fontSize: 22, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>Check your email</Text>
        <Text style={{ color: '#52637a', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>We sent a verification link to {email}</Text>
        <TouchableOpacity onPress={() => router.replace('/auth/login' as any)} style={s.submitBtn}>
          <Text style={s.submitText}>Go to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingTop: insets.top + 40 }]}>
        <Text style={s.logo}>SCORPANION</Text>
        <Text style={s.tagline}>Create an account</Text>

        {!!error && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
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

        <Text style={s.label}>Password</Text>
        <TextInput
          style={s.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholderTextColor="#52637a"
          placeholder="••••••••"
        />

        <Text style={s.label}>Confirm Password</Text>
        <TextInput
          style={s.input}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoCapitalize="none"
          placeholderTextColor="#52637a"
          placeholder="••••••••"
        />

        <TouchableOpacity style={[s.submitBtn, { marginTop: 24 }]} onPress={handleSignup} disabled={loading} activeOpacity={0.8}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>Create Account</Text>}
        </TouchableOpacity>

        <View style={s.signupRow}>
          <Text style={s.signupLabel}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/auth/login' as any)}>
            <Text style={s.signupLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0c1b31' },
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  logo: { color: '#F2E6CF', fontSize: 36, fontWeight: '900', textAlign: 'center', letterSpacing: 2, marginBottom: 6 },
  tagline: { color: '#52637a', fontSize: 13, textAlign: 'center', marginBottom: 32 },
  errorBox: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { color: '#f87171', fontSize: 13 },
  label: { color: '#9090b0', fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { height: 52, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 14, color: '#F2E6CF', fontSize: 15 },
  submitBtn: { backgroundColor: '#D95C17', borderRadius: 12, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  signupRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  signupLabel: { color: '#52637a', fontSize: 13 },
  signupLink: { color: '#D95C17', fontSize: 13, fontWeight: '700' },
});
