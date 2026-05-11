import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { LoginScreen } from './src/screens/LoginScreen';
import { Dashboard } from './src/screens/Dashboard';
import { ApiService } from './src/services/api';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    bootstrap();
  }, []);

  const bootstrap = async () => {
    try {
      const savedUser = await ApiService.getUser();
      const savedStats = await ApiService.getStats();
      if (savedUser) {
        setUser(savedUser);
        setStats(savedStats);
        // Background refresh stats
        refreshStats(savedUser.staffCode);
      }
    } catch (e) {
      console.log('Bootstrap Error', e);
    } finally {
      setIsReady(true);
    }
  };

  const refreshStats = async (code) => {
    const res = await ApiService.login(code);
    if (res.success) {
      setUser(res.user);
      setStats(res.stats);
      await ApiService.saveUser(res.user, res.stats);
    }
  };

  const handleLoginSuccess = (userData, statsData) => {
    setUser(userData);
    setStats(statsData);
  };

  const handleLogout = async () => {
    await ApiService.logout();
    setUser(null);
    setStats(null);
  };

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return user ? (
    <Dashboard 
      user={user} 
      stats={stats} 
      onLogout={handleLogout} 
      onRefresh={() => refreshStats(user.staffCode)}
    />
  ) : (
    <LoginScreen onLoginSuccess={handleLoginSuccess} />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  }
});
