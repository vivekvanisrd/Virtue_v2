import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, SafeAreaView
} from 'react-native';
import { ApiService } from '../services/api';

export function LoginScreen({ onLoginSuccess }) {
  const [staffCode, setStaffCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStaffCodeChange = (val) => {
    let cleaned = val;
    if (/^[0-9+\s()-]*$/.test(val)) {
      cleaned = val.replace(/[^\d]/g, "");
    }
    setStaffCode(cleaned);
  };

  const handleLogin = async () => {
    if (!staffCode.trim()) return Alert.alert('Required', 'Please enter your Staff Code.');
    setLoading(true);
    try {
      const res = await ApiService.login(staffCode);
      if (res.success) {
        await ApiService.saveUser(res.user, res.stats);
        onLoginSuccess(res.user, res.stats);
      } else {
        Alert.alert('Access Denied', res.error || 'Invalid Staff Code');
      }
    } catch (e) {
      Alert.alert('Network Error', 'Cannot reach server. Check internet connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <View style={styles.card}>

          {/* Logo */}
          <View style={styles.logoWrap}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoEmoji}>🛡️</Text>
            </View>
            <Text style={styles.logoTitle}>VIVES <Text style={styles.accent}>EDUX</Text></Text>
            <Text style={styles.logoSub}>STAFF PORTAL · SOVEREIGN V2</Text>
          </View>

          {/* Input */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>STAFF CODE</Text>
            <View style={styles.inputRow}>
              <Text style={styles.inputEmoji}>👤</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. VIVES-RCB-PR-001"
                placeholderTextColor="#94a3b8"
                value={staffCode}
                onChangeText={handleStaffCodeChange}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Button */}
          <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
            {loading
              ? <ActivityIndicator color="white" />
              : <Text style={styles.btnText}>AUTHORIZE SESSION  →</Text>
            }
          </TouchableOpacity>

          <Text style={styles.footer}>SECURED BY SOVEREIGN SENTINEL</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 36, padding: 36, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 30, elevation: 12 },
  logoWrap: { alignItems: 'center', marginBottom: 36 },
  logoIcon: { width: 72, height: 72, backgroundColor: '#2563eb', borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#2563eb', shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  logoEmoji: { fontSize: 32 },
  logoTitle: { fontSize: 30, fontWeight: '900', color: '#0f172a', letterSpacing: -1 },
  accent: { color: '#2563eb', fontStyle: 'italic' },
  logoSub: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 3, marginTop: 6 },
  fieldWrap: { marginBottom: 24 },
  fieldLabel: { fontSize: 10, fontWeight: '900', color: '#475569', letterSpacing: 1, marginBottom: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 16 },
  inputEmoji: { fontSize: 18, marginRight: 10 },
  input: { flex: 1, paddingVertical: 16, fontSize: 14, fontWeight: '700', color: '#0f172a' },
  btn: { backgroundColor: '#0f172a', borderRadius: 22, paddingVertical: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 6 },
  btnText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  footer: { textAlign: 'center', fontSize: 8, color: '#cbd5e1', letterSpacing: 2, marginTop: 28, fontWeight: '700' }
});
