import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { SCREEN_PADDING } from '../../constants/layout';
import { premium } from '../../constants/premiumTheme';
import { decodeUsernameFromToken } from '../../helpers/auth';
import { isResponsesAdmin } from '../../helpers/adminUsers';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import PulseSyncLoginScreen from '../../components/PulseSyncLoginScreen';

const L = premium.login;

export default function AdminProfile() {
  const router = useRouter();
  const { refreshAdminAuth, clearAuth, profile } = useAdminAuth();
  const [username, setUsername] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const refreshAuth = useCallback(async () => {
    const token = await SecureStore.getItemAsync('token');
    if (token) {
      setIsAuthenticated(true);
      setUsername(await decodeUsernameFromToken(token));
    } else {
      setIsAuthenticated(false);
      setUsername('');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshAuth();
    }, [refreshAuth])
  );

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const handleLoggedIn = async () => {
    await refreshAuth();
    await refreshAdminAuth();
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Sign out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await clearAuth();
          await refreshAuth();
          await refreshAdminAuth();
          router.replace('/(tabs)/home');
        },
      },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <PulseSyncLoginScreen
        onLoggedIn={handleLoggedIn}
        initialMode="admin"
        showBackLink
      />
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(profile?.display_name || username).charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.heroTitle}>{profile?.display_name || username}</Text>
        <Text style={styles.heroSub}>
          {isResponsesAdmin(profile?.username) ? 'Signed in as admin' : 'Signed in as field surveyor'}
        </Text>
      </View>

      {isResponsesAdmin(profile?.username) ? (
      <View style={styles.card}>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin')}>
          <Ionicons name="speedometer-outline" size={22} color={L.emeraldDark} />
          <View style={styles.menuTextWrap}>
            <Text style={styles.menuTitle}>PulseSync Admin</Text>
            <Text style={styles.menuSub}>Insights, field records, survey flow, users</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin?tab=list')}>
          <Ionicons name="list-outline" size={22} color={L.emeraldDark} />
          <View style={styles.menuTextWrap}>
            <Text style={styles.menuTitle}>Field Records</Text>
            <Text style={styles.menuSub}>View submissions, audio, geotag, export CSV</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin?tab=questions')}>
          <Ionicons name="settings-outline" size={22} color={L.emeraldDark} />
          <View style={styles.menuTextWrap}>
            <Text style={styles.menuTitle}>Survey Flow</Text>
            <Text style={styles.menuSub}>Manage ward questions</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin?tab=users')}>
          <Ionicons name="people-outline" size={22} color={L.emeraldDark} />
          <View style={styles.menuTextWrap}>
            <Text style={styles.menuTitle}>Users</Text>
            <Text style={styles.menuSub}>Field surveyors registered via sign-in</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>
      </View>
      ) : (
        <View style={styles.card}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/home')}>
            <Ionicons name="clipboard-outline" size={22} color={L.emeraldDark} />
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>Continue Survey</Text>
              <Text style={styles.menuSub}>Return to the field survey form</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: premium.bg },
  content: { padding: SCREEN_PADDING, paddingBottom: 40 },
  hero: { alignItems: 'center', marginBottom: 24, marginTop: 12 },
  heroTitle: { fontSize: 22, fontWeight: '700', color: premium.text, marginTop: 12 },
  heroSub: {
    fontSize: 14,
    color: premium.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  card: {
    backgroundColor: premium.bgCard,
    borderRadius: premium.radius.md,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: L.emeraldDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  menuTextWrap: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '600', color: premium.text },
  menuSub: { fontSize: 12, color: premium.textMuted, marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    padding: 14,
    backgroundColor: premium.bgCard,
    borderRadius: premium.radius.sm,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutText: { color: '#FF3B30', fontWeight: '600', fontSize: 16 },
});
