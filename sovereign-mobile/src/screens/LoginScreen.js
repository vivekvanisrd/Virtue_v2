import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Shield, ArrowRight, User } from 'lucide-react-native';
import { ApiService } from '../services/api';

export function LoginScreen({ onLoginSuccess }) {
  const [staffCode, setStaffCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!staffCode) return Alert.alert('Attention', 'Please enter your Staff Code to continue.');
    
    setLoading(true);
    try {
      const res = await ApiService.login(staffCode);
      if (res.success) {
        await ApiService.saveUser(res.user, res.stats);
        onLoginSuccess(res.user, res.stats);
      } else {
        Alert.alert('Access Denied', res.error || 'Invalid credentials');
      }
    } catch (e) {
      Alert.alert('System Error', 'Unable to reach the Sovereign Cloud. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.card}>
        <View style={styles.header}>
           <View style={styles.logoCircle}>
              <Shield color="white" size={32} />
           </View>
           <Text style={styles.title}>VIVES <Text style={styles.accent}>EDUX</Text></Text>
           <Text style={styles.subtitle}>STAFF PORTAL • SOVEREIGN V2</Text>
        </View>

        <View style={styles.inputSection}>
           <Text style={styles.label}>STAFF IDENTIFICATION</Text>
           <View style={styles.inputWrapper}>
              <User color="#94a3b8" size={20} style={styles.inputIcon} />
              <TextInput 
                style={styles.input}
                placeholder="ENTER STAFF CODE"
                placeholderTextColor="#cbd5e1"
                value={staffCode}
                onChangeText={setStaffCode}
                autoCapitalize="characters"
                autoCorrect={false}
              />
           </View>
        </View>

        <TouchableOpacity 
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text style={styles.buttonText}>AUTHORIZE SESSION</Text>
              <ArrowRight color="white" size={18} />
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footerText}>SECURED BY SOVEREIGN SENTINEL</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // Deep slate
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 40,
    padding: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 72,
    height: 72,
    backgroundColor: '#2563eb',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -1,
  },
  accent: {
    color: '#2563eb',
    fontStyle: 'italic',
  },
  subtitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 3,
    marginTop: 8,
  },
  inputSection: {
    marginBottom: 30,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1e293b',
    letterSpacing: 1,
    marginBottom: 12,
    opacity: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 20,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 18,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  button: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    paddingVertical: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 8,
    fontWeight: 'bold',
    color: '#cbd5e1',
    letterSpacing: 2,
    marginTop: 30,
    textTransform: 'uppercase',
  }
});
