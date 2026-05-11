import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  Dimensions,
  Alert,
  ActivityIndicator
} from 'react-native';
import { 
  Zap, 
  LogOut, 
  MapPin, 
  Building2, 
  CalendarCheck, 
  Clock, 
  TrendingUp,
  Scan
} from 'lucide-react-native';
import { CameraView } from 'expo-camera';
import * as Location from 'expo-location';
import { ApiService } from '../services/api';

const { width } = Dimensions.get('window');

export function Dashboard({ user, stats, onLogout, onRefresh }) {
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleScan = async ({ data }) => {
    setIsScanning(false);
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Location Blocked', 'Attendance requires GPS verification.');
      
      const loc = await Location.getCurrentPositionAsync({});
      const res = await ApiService.submitScan(data, user.id, loc.coords.latitude, loc.coords.longitude);
      
      if (res.success) {
        Alert.alert('Success', res.message);
        onRefresh();
      } else {
        Alert.alert('Scan Failed', res.error);
      }
    } catch (e) {
      Alert.alert('Error', 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  if (isScanning) {
    return (
      <View style={styles.scannerContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={handleScan}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />
        <View style={styles.scanOverlay}>
           <Text style={styles.scanText}>ALIGN WITH KIOSK QR</Text>
           <View style={styles.scanFrame} />
           <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsScanning(false)}>
              <Text style={styles.cancelText}>CANCEL</Text>
           </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Profile Header */}
        <View style={styles.header}>
           <View>
              <Text style={styles.welcome}>Welcome,</Text>
              <Text style={styles.name}>{user.firstName} {user.lastName}</Text>
           </View>
           <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
              <LogOut color="#ef4444" size={20} />
           </TouchableOpacity>
        </View>

        {/* Branch Info */}
        <View style={styles.branchRow}>
           <View style={styles.tag}>
              <Building2 size={12} color="#64748b" />
              <Text style={styles.tagText}>{user.branchName}</Text>
           </View>
           <View style={styles.tag}>
              <MapPin size={12} color="#64748b" />
              <Text style={styles.tagText}>{user.department}</Text>
           </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
           <View style={[styles.statBox, { backgroundColor: '#f0fdf4' }]}>
              <CalendarCheck color="#16a34a" size={20} />
              <Text style={[styles.statVal, { color: '#16a34a' }]}>{stats?.presentThisMonth || 0}</Text>
              <Text style={styles.statLab}>PRESENT</Text>
           </View>
           <View style={[styles.statBox, { backgroundColor: '#fff7ed' }]}>
              <Clock color="#ea580c" size={20} />
              <Text style={[styles.statVal, { color: '#ea580c' }]}>{stats?.latesThisMonth || 0}</Text>
              <Text style={styles.statLab}>LATE</Text>
           </View>
           <View style={[styles.statBox, { backgroundColor: '#f0f9ff' }]}>
              <TrendingUp color="#0284c7" size={20} />
              <Text style={[styles.statVal, { color: '#0284c7' }]}>{stats?.attendancePercent || 0}%</Text>
              <Text style={styles.statLab}>RATIO</Text>
           </View>
        </View>

        {/* Action Center */}
        <View style={styles.actionCard}>
           <Text style={styles.actionTitle}>ATTENDANCE COMMAND</Text>
           <TouchableOpacity 
             style={styles.scanActionBtn} 
             onPress={() => setIsScanning(true)}
             disabled={loading}
           >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <View style={styles.scanIconWrap}>
                     <Scan color="white" size={32} />
                  </View>
                  <Text style={styles.scanBtnMain}>LAUNCH SCANNER</Text>
                  <Text style={styles.scanBtnSub}>PUNCH-IN AT THE GATE</Text>
                </>
              )}
           </TouchableOpacity>
        </View>

        {/* Footer Info */}
        <View style={styles.footer}>
           <Zap size={14} color="#94a3b8" />
           <Text style={styles.footerText}>SYSTEM ONLINE • SOVEREIGN V2 CORE</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  welcome: { fontSize: 14, color: '#64748b', fontWeight: 'bold' },
  name: { fontSize: 28, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  logoutBtn: { width: 44, height: 44, backgroundColor: 'white', borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWeight: 1, borderColor: '#f1f5f9' },
  branchRow: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWeight: 1, borderColor: '#e2e8f0' },
  tagText: { fontSize: 10, fontWeight: '900', color: '#64748b', textTransform: 'uppercase' },
  statsContainer: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  statBox: { flex: 1, padding: 20, borderRadius: 24, alignItems: 'center' },
  statVal: { fontSize: 24, fontWeight: '900', marginTop: 12 },
  statLab: { fontSize: 9, fontWeight: '900', color: '#1e293b', opacity: 0.4, marginTop: 2 },
  actionCard: { backgroundColor: 'white', borderRadius: 32, padding: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5 },
  actionTitle: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 2, marginBottom: 20, textAlign: 'center' },
  scanActionBtn: { backgroundColor: '#0f172a', borderRadius: 40, padding: 40, alignItems: 'center' },
  scanIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  scanBtnMain: { color: 'white', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  scanBtnSub: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 'bold', marginTop: 4 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 40, opacity: 0.5 },
  footerText: { fontSize: 9, fontWeight: '900', color: '#64748b', letterSpacing: 2 },
  scannerContainer: { flex: 1, backgroundColor: 'black' },
  scanOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  scanText: { color: 'white', fontSize: 12, fontWeight: '900', letterSpacing: 3, marginBottom: 30 },
  scanFrame: { width: width * 0.7, height: width * 0.7, borderWidth: 2, borderColor: '#2563eb', borderRadius: 32 },
  cancelBtn: { marginTop: 40, padding: 20 },
  cancelText: { color: 'white', fontSize: 12, fontWeight: 'bold', letterSpacing: 2 }
});
