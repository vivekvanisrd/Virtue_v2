import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, ScrollView, 
  SafeAreaView, Dimensions, Alert, ActivityIndicator, StatusBar
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { ApiService } from '../services/api';

const { width } = Dimensions.get('window');

export function Dashboard({ user, stats, onLogout, onRefresh }) {
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const openScanner = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return Alert.alert('Permission Needed', 'Please allow camera access to scan the QR kiosk.');
    }
    setIsScanning(true);
  };

  const handleScan = async ({ data }) => {
    setIsScanning(false);
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let latitude = null, longitude = null;
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        latitude = loc.coords.latitude;
        longitude = loc.coords.longitude;
      }
      const res = await ApiService.submitScan(data, user.id, latitude, longitude);
      if (res.success) {
        Alert.alert('✅ Success!', res.message);
        onRefresh();
      } else {
        Alert.alert('❌ Scan Failed', res.error);
      }
    } catch (e) {
      Alert.alert('Error', 'Connection failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isScanning) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={handleScan}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />
        <View style={styles.scanOverlay}>
          <Text style={styles.scanHint}>📷  ALIGN QR CODE WITHIN THE FRAME</Text>
          <View style={styles.scanFrame} />
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsScanning(false)}>
            <Text style={styles.cancelText}>✕  CANCEL SCAN</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good day,</Text>
            <Text style={styles.name}>{user.firstName} {user.lastName}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <Text style={styles.logoutText}>↩ OUT</Text>
          </TouchableOpacity>
        </View>

        {/* ── Info Tags ── */}
        <View style={styles.tagRow}>
          <View style={styles.tag}><Text style={styles.tagText}>🏢  {user.branchName}</Text></View>
          <View style={styles.tag}><Text style={styles.tagText}>📋  {user.department}</Text></View>
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: '#f0fdf4' }]}>
            <Text style={styles.statEmoji}>✅</Text>
            <Text style={[styles.statVal, { color: '#16a34a' }]}>{stats?.presentThisMonth ?? '—'}</Text>
            <Text style={styles.statLbl}>PRESENT</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#fff7ed' }]}>
            <Text style={styles.statEmoji}>⏰</Text>
            <Text style={[styles.statVal, { color: '#ea580c' }]}>{stats?.latesThisMonth ?? '—'}</Text>
            <Text style={styles.statLbl}>LATE</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#f0f9ff' }]}>
            <Text style={styles.statEmoji}>📈</Text>
            <Text style={[styles.statVal, { color: '#0284c7' }]}>{stats?.attendancePercent ?? '—'}%</Text>
            <Text style={styles.statLbl}>RATIO</Text>
          </View>
        </View>

        {/* ── Scan Button ── */}
        <View style={styles.scanCard}>
          <Text style={styles.scanTitle}>DAILY ATTENDANCE</Text>
          <TouchableOpacity style={styles.scanBtn} onPress={openScanner} disabled={loading}>
            {loading
              ? <ActivityIndicator color="white" size="large" />
              : <>
                  <Text style={styles.scanIcon}>📱</Text>
                  <Text style={styles.scanBtnMain}>TAP TO SCAN KIOSK</Text>
                  <Text style={styles.scanBtnSub}>POINT CAMERA AT THE GATE QR CODE</Text>
                </>
            }
          </TouchableOpacity>
        </View>

        {/* ── Staff Code Info ── */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>YOUR STAFF CODE</Text>
          <Text style={styles.codeValue}>{user.staffCode}</Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>⚡  SOVEREIGN V2 · SYSTEM ONLINE</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 24, paddingBottom: 40 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  greeting: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  name: { fontSize: 26, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  logoutBtn: { backgroundColor: '#fee2e2', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  logoutText: { color: '#ef4444', fontWeight: '900', fontSize: 11 },

  // Tags
  tagRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  tag: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  tagText: { fontSize: 11, fontWeight: '700', color: '#475569' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  statBox: { flex: 1, borderRadius: 22, padding: 18, alignItems: 'center' },
  statEmoji: { fontSize: 20, marginBottom: 8 },
  statVal: { fontSize: 26, fontWeight: '900' },
  statLbl: { fontSize: 8, fontWeight: '900', color: '#475569', opacity: 0.5, marginTop: 2 },

  // Scan
  scanCard: { backgroundColor: '#fff', borderRadius: 32, padding: 28, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 16, elevation: 3 },
  scanTitle: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 2, marginBottom: 18, textAlign: 'center' },
  scanBtn: { backgroundColor: '#0f172a', borderRadius: 36, padding: 36, alignItems: 'center', shadowColor: '#0f172a', shadowOpacity: 0.25, shadowRadius: 16, elevation: 8 },
  scanIcon: { fontSize: 40, marginBottom: 14 },
  scanBtnMain: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  scanBtnSub: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700', marginTop: 6, letterSpacing: 0.5 },

  // Code Card
  codeCard: { backgroundColor: '#1e293b', borderRadius: 20, padding: 20, marginBottom: 28, alignItems: 'center' },
  codeLabel: { fontSize: 9, fontWeight: '900', color: '#64748b', letterSpacing: 2, marginBottom: 8 },
  codeValue: { fontSize: 14, fontWeight: '900', color: '#7dd3fc', letterSpacing: 1, fontFamily: 'monospace' },

  // Footer
  footer: { textAlign: 'center', fontSize: 9, color: '#94a3b8', fontWeight: '700', letterSpacing: 2 },

  // Scanner
  scanOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  scanHint: { color: '#fff', fontSize: 11, fontWeight: '700', marginBottom: 28 },
  scanFrame: { width: width * 0.68, height: width * 0.68, borderWidth: 3, borderColor: '#2563eb', borderRadius: 28, backgroundColor: 'transparent' },
  cancelBtn: { marginTop: 40, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 20 },
  cancelText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
});
