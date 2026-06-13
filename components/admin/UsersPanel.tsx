import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../../constants/config';
import { SCREEN_PADDING } from '../../constants/layout';
import { premium } from '../../constants/premiumTheme';

type SurveyUserRow = {
  id: number;
  username: string;
  display_name: string;
  mobile: string;
  created_at: string;
  disabled: boolean;
};

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function isListableUser(u: SurveyUserRow) {
  const name = u.display_name?.toLowerCase() ?? '';
  const username = u.username?.toLowerCase() ?? '';
  return (
    name !== 'admin@iswot.io' &&
    !username.includes('admin_iswot') &&
    !username.startsWith('surveyor_admin')
  );
}

export default function UsersPanel() {
  const [users, setUsers] = useState<SurveyUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('token');
        if (!token) {
          setError('Not signed in');
          return;
        }
        const res = await axios.get(`${API_URL}/api/survey-users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const rows = Array.isArray(res.data) ? res.data.filter(isListableUser) : [];
        setUsers(rows);
      } catch {
        setError('Could not load survey users');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.display_name.toLowerCase().includes(q) ||
        u.mobile.includes(q) ||
        u.username.toLowerCase().includes(q)
    );
  }, [users, query]);

  if (loading) {
    return (
      <View style={styles.contentLoader}>
        <ActivityIndicator size="large" color={premium.login.emeraldDark} />
        <Text style={styles.loadingText}>Loading survey users…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.contentLoader}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Text style={styles.label}>Search</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Name or mobile…"
          placeholderTextColor={premium.textLight}
          style={styles.searchInput}
        />
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{filtered.length} users</Text>
        </View>
      </View>

      <Text style={styles.meta}>
        Field surveyors registered via sign-in. Admin accounts are not listed here.
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No survey users found.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.name}>{item.display_name || '—'}</Text>
              <View style={[styles.badge, item.disabled ? styles.badgeMuted : styles.badgeLive]}>
                <Text style={[styles.badgeText, item.disabled ? styles.badgeTextMuted : styles.badgeTextLive]}>
                  {item.disabled ? 'Disabled' : 'Active'}
                </Text>
              </View>
            </View>
            <Text style={styles.row}>Mobile: {item.mobile || '—'}</Text>
            <Text style={styles.rowMuted} numberOfLines={1}>
              Username: {item.username}
            </Text>
            <Text style={styles.rowMuted}>Registered: {formatDate(item.created_at)}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, padding: SCREEN_PADDING },
  loadingText: { color: premium.textMuted, fontSize: 14 },
  errorText: { color: '#DC2626', fontSize: 14, textAlign: 'center' },
  toolbar: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 8,
    gap: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: premium.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  searchInput: {
    backgroundColor: premium.bgCard,
    borderWidth: 1,
    borderColor: premium.border,
    borderRadius: premium.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: premium.text,
  },
  countBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    marginTop: 4,
  },
  countText: { fontSize: 12, fontWeight: '800', color: '#4338CA' },
  meta: {
    fontSize: 12,
    color: premium.textMuted,
    lineHeight: 18,
    paddingHorizontal: SCREEN_PADDING,
    marginBottom: 10,
  },
  listContent: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 24 },
  card: {
    backgroundColor: premium.bgCard,
    borderRadius: premium.radius.md,
    borderWidth: 1,
    borderColor: premium.border,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  name: { flex: 1, fontSize: 17, fontWeight: '800', color: premium.text },
  row: { fontSize: 14, fontWeight: '600', color: premium.text, marginBottom: 4 },
  rowMuted: { fontSize: 12, color: premium.textMuted, marginBottom: 2 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeLive: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' },
  badgeMuted: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  badgeTextLive: { color: '#047857' },
  badgeTextMuted: { color: '#64748B' },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: premium.textMuted, fontSize: 14 },
});
