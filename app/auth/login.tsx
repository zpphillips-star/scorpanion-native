import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailFocus, setEmailFocus] = useState(false);
  const [pwFocus, setPwFocus] = useState(false);

  async function handleLogin() {
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    router.replace('/');
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingTop: insets.top + 40 }]}>
        <Text style={s.logo}>SCORPANION</Text>
        <Text style={s.tagline}>Your Seattle Sports Hub</Text>

        {!!error && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <Text style={s.label}>Email</Text>
        <TextInput
          style={[s.input, emailFocus && s.inputFocus]}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          placeholderTextColor="#52637a"
          placeholder="you@example.com"
          onFocus={() => setEmailFocus(true)}
          onBlur={() => setEmailFocus(false)}
        />

        <Text style={s.label}>Password</Text>
        <View style={{ position: 'relative' }}>
          <TextInput
            style={[s.input, pwFocus && s.inputFocus]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPw}
            autoCapitalize="none"
            autoComplete="password"
            placeholderTextColor="#52637a"
            placeholder="••••••••"
            onFocus={() => setPwFocus(true)}
            onBlur={() => setPwFocus(false)}
          />
          <TouchableOpacity onPress={() => setShowPw(!showPw)} style={s.eyeBtn} activeOpacity={0.7}>
            <Text style={s.eyeText}>{showPw ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/auth/forgot-password' as any)}
          style={{ alignSelf: 'flex-end', marginBottom: 20, marginTop: 8 }}
        >
          <Text style={s.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.submitBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>Sign In</Text>}
        </TouchableOpacity>

        <View style={s.signupRow}>
          <Text style={s.signupLabel}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/auth/signup' as any)}>
            <Text style={s.signupLink}>Sign Up</Text>
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
  inputFocus: { borderColor: '#00d4ff' },
  eyeBtn: { position: 'absolute', right: 14, top: 14 },
  eyeText: { fontSize: 20 },
  forgotText: { color: '#52637a', fontSize: 12 },
  submitBtn: { backgroundColor: '#D95C17', borderRadius: 12, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  signupRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  signupLabel: { color: '#52637a', fontSize: 13 },
  signupLink: { color: '#D95C17', fontSize: 13, fontWeight: '700' },
});
