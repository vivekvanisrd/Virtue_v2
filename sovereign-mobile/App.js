import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  Alert, 
  Dimensions,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// 🛡️ CONFIGURATION: Change this to your Vercel URL
const SERVER_URL = 'https://virtue-psi.vercel.app';

export default function App() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [staffCode, setStaffCode] = useState('');
  
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    checkLocalSession();
  }, []);

  const checkLocalSession = async () => {
    try {
      const savedUser = await AsyncStorage.getItem('sov2_user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        // Refresh stats on load
        fetchDashboardStats(userData.staffCode);
      }
    } catch (e) {
      console.log('Session Error', e);
    } finally {
      setIsAppReady(true);
    }
  };

  const fetchDashboardStats = async (code) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/auth/mobile-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffCode: code })
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
        setUser(data.user); // Refresh user info too
      }
    } catch (e) {
      console.log('Stats Refresh Error', e);
    }
  };

  const handleLogin = async () => {
    if (!staffCode) return Alert.alert('Error', 'Please enter your Staff Code');
    
    setIsLoggingIn(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/auth/mobile-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffCode: staffCode.trim() })
      });
      
      const data = await response.json();
      if (data.success) {
        await AsyncStorage.setItem('sov2_user', JSON.stringify(data.user));
        setUser(data.user);
        setStats(data.stats);
      } else {
        Alert.alert('Login Failed', data.error || 'Invalid credentials');
      }
    } catch (error) {
      Alert.alert('Network Error', 'Cannot reach server. Check internet.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('sov2_user');
    setUser(null);
    setStats(null);
    setStaffCode('');
  };

  const handleBarCodeScanned = async ({ data }) => {
    setIsScanning(false);
    setLoading(true);

    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location is required for secure punch-in.');
        setLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      
      const response = await fetch(`${SERVER_URL}/api/attendance/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: data,
          staffId: user.id,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        })
      });

      const result = await response.json();
      if (result.success) {
        Alert.alert('Success!', result.message);
        fetchDashboardStats(user.staffCode); // Refresh stats after scan
      } else {
        Alert.alert('Scan Failed', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isAppReady) return <View style={styles.container}><ActivityIndicator size="large" color="#2563eb" /></View>;

  if (!user) {
    return (
      <SafeAreaView style={styles.loginContainer}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loginCard}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>VIVES <Text style={styles.logoAccent}>EDUX</Text></Text>
            <Text style={styles.tagline}>STAFF PORTAL</Text>
          </View>

          <Text style={styles.loginTitle}>Welcome Back</Text>
          <Text style={styles.loginSubtitle}>Sign in to your sovereign account</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>STAFF CODE</Text>
            <TextInput 
              style={styles.input}
              placeholder="e.g. VIVES-2024-001"
              value={staffCode}
              onChangeText={setStaffCode}
              autoCapitalize="characters"
            />
          </View>

          <TouchableOpacity 
            style={styles.loginButton} 
            onPress={handleLogin}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.loginButtonText}>CONTINUE TO DASHBOARD</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isScanning) {
    return (
      <View style={styles.scannerContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />
        <View style={styles.overlay}>
           <Text style={styles.scanText}>Align QR Code within Frame</Text>
           <View style={styles.unfocusedContainer} />
           <View style={styles.focusedContainer} />
           <View style={styles.unfocusedContainer} />
           <TouchableOpacity style={styles.cancelButton} onPress={() => setIsScanning(false)}>
              <Text style={styles.cancelText}>CANCEL SCAN</Text>
           </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
           <View>
              <Text style={styles.greeting}>Good Day,</Text>
              <Text style={styles.userName}>{user.firstName} {user.lastName}</Text>
           </View>
           <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>LOGOUT</Text>
           </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.infoRow}>
           <View style={styles.infoBadge}>
              <Text style={styles.badgeLabel}>DEPT</Text>
              <Text style={styles.badgeValue}>{user.department}</Text>
           </View>
           <View style={styles.infoBadge}>
              <Text style={styles.badgeLabel}>BRANCH</Text>
              <Text style={styles.badgeValue}>{user.branchName}</Text>
           </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
           <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats?.presentThisMonth || 0}</Text>
              <Text style={styles.statLabel}>PRESENT</Text>
           </View>
           <View style={[styles.statCard, { backgroundColor: '#fff7ed' }]}>
              <Text style={[styles.statValue, { color: '#ea580c' }]}>{stats?.latesThisMonth || 0}</Text>
              <Text style={styles.statLabel}>LATE</Text>
           </View>
           <View style={[styles.statCard, { backgroundColor: '#f0f9ff' }]}>
              <Text style={[styles.statValue, { color: '#0284c7' }]}>{stats?.attendancePercent || 0}%</Text>
              <Text style={styles.statLabel}>RATIO</Text>
           </View>
        </View>

        {/* Scan Section */}
        <View style={styles.scanSection}>
           <Text style={styles.sectionTitle}>Daily Attendance</Text>
           <TouchableOpacity 
             style={styles.bigScanBtn} 
             onPress={() => setIsScanning(true)}
             disabled={loading}
           >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <View style={styles.iconCircle} />
                  <Text style={styles.scanBtnText}>TAP TO SCAN KIOSK</Text>
                  <Text style={styles.scanBtnSub}>PROXIMITY SECURED</Text>
                </>
              )}
           </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loginContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    padding: 24,
  },
  loginCard: {
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
  },
  logoAccent: {
    color: '#2563eb',
    fontStyle: 'italic',
  },
  tagline: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94a3b8',
    letterSpacing: 4,
    marginTop: 4,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
  },
  loginSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#2563eb',
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  loginButton: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'between',
    alignItems: 'center',
    marginBottom: 32,
  },
  greeting: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  userName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  logoutBtn: {
    padding: 10,
  },
  logoutText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ef4444',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  infoBadge: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  badgeLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8',
    marginBottom: 4,
  },
  badgeValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 40,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f0fdf4',
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#16a34a',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#1e293b',
    opacity: 0.4,
    marginTop: 4,
  },
  scanSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 20,
  },
  bigScanBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 40,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 16,
  },
  scanBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  scanBtnSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 4,
  },
  scannerContainer: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  focusedContainer: {
    width: width * 0.7,
    height: width * 0.7,
    borderWidth: 2,
    borderColor: '#2563eb',
    backgroundColor: 'transparent',
    borderRadius: 24,
  },
  unfocusedContainer: {
    flex: 1,
  },
  cancelButton: {
    marginTop: 40,
    padding: 20,
  },
  cancelText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  }
});
