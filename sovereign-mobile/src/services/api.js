import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://virtue-psi.vercel.app';

export const ApiService = {
  async login(staffCode) {
    const response = await fetch(`${BASE_URL}/api/auth/mobile-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffCode: staffCode.trim() })
    });
    return response.json();
  },

  async submitScan(token, staffId, latitude, longitude) {
    const response = await fetch(`${BASE_URL}/api/attendance/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, staffId, latitude, longitude })
    });
    return response.json();
  },

  async saveUser(user, stats) {
    await AsyncStorage.setItem('sov2_user', JSON.stringify(user));
    if (stats) await AsyncStorage.setItem('sov2_stats', JSON.stringify(stats));
  },

  async getUser() {
    const user = await AsyncStorage.getItem('sov2_user');
    return user ? JSON.parse(user) : null;
  },

  async getStats() {
    const stats = await AsyncStorage.getItem('sov2_stats');
    return stats ? JSON.parse(stats) : null;
  },

  async logout() {
    await AsyncStorage.multiRemove(['sov2_user', 'sov2_stats']);
  }
};
