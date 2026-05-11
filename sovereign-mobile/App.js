import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Button, TextInput, Alert, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';

export default function App() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();
  
  const [isScanning, setIsScanning] = useState(false);
  const [staffId, setStaffId] = useState('STF-101'); // Mock logged-in user
  const [serverUrl, setServerUrl] = useState('http://192.168.1.X:3000'); // Needs actual local IP
  const [isProcessing, setIsProcessing] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState(null);

  useEffect(() => {
    (async () => {
      await requestLocationPermission();
    })();
  }, []);

  if (!cameraPermission) {
    return <View style={styles.container}><ActivityIndicator size="large" color="#4F46E5" /></View>;
  }

  if (!cameraPermission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera to scan the Kiosk QR.</Text>
        <Button onPress={requestCameraPermission} title="Grant Permission" />
      </View>
    );
  }

  const handleBarCodeScanned = async ({ type, data }) => {
    setIsScanning(false);
    setIsProcessing(true);

    try {
      // 1. Get GPS Location
      let location = null;
      if (locationPermission?.granted) {
        location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      }

      // 2. Send to Backend
      const payload = {
        token: data,
        staffId: staffId,
        latitude: location?.coords?.latitude || null,
        longitude: location?.coords?.longitude || null,
      };

      const response = await fetch(`${serverUrl}/api/attendance/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        setAttendanceStatus({ type: 'success', message: result.message });
      } else {
        setAttendanceStatus({ type: 'error', message: result.error });
      }
    } catch (error) {
      setAttendanceStatus({ type: 'error', message: 'Failed to connect to server. Check IP.' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {isScanning ? (
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            onBarcodeScanned={isProcessing ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          />
          <View style={styles.overlay}>
            <View style={styles.scanTarget} />
            <Text style={styles.scanText}>Point at the Kiosk QR Code</Text>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsScanning(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.homeContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Sovereign Staff</Text>
            <Text style={styles.subtitle}>Dynamic Attendance Portal</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Your Staff ID:</Text>
            <TextInput
              style={styles.input}
              value={staffId}
              onChangeText={setStaffId}
              placeholder="e.g. STF-101"
            />
            
            <Text style={styles.label}>Backend IP (For Testing):</Text>
            <TextInput
              style={styles.input}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://192.168.1.X:3000"
            />
          </View>

          {attendanceStatus && (
            <View style={[styles.statusCard, attendanceStatus.type === 'success' ? styles.statusSuccess : styles.statusError]}>
              <Text style={styles.statusText}>{attendanceStatus.message}</Text>
            </View>
          )}

          <TouchableOpacity 
            style={styles.scanBtn}
            onPress={() => { setAttendanceStatus(null); setIsScanning(true); }}
            disabled={isProcessing}
          >
            {isProcessing ? (
               <ActivityIndicator color="#FFF" />
            ) : (
               <Text style={styles.scanBtnText}>SCAN KIOSK TO ENTER</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // slate-50
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
  },
  homeContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
    marginBottom: 24,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F1F5F9',
    padding: 16,
    borderRadius: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 16,
  },
  scanBtn: {
    backgroundColor: '#4F46E5', // indigo-600
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  scanBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  statusCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  statusSuccess: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusError: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
  },
  scannerContainer: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanTarget: {
    width: 250,
    height: 250,
    borderWidth: 4,
    borderColor: '#4F46E5',
    borderRadius: 24,
    backgroundColor: 'transparent',
  },
  scanText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 24,
  },
  cancelBtn: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: '#FFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 100,
  },
  cancelText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: 'black',
    textTransform: 'uppercase',
    letterSpacing: 1,
  }
});
