import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../constants/config';
import { SCREEN_PADDING } from '../../constants/layout';
import { premium } from '../../constants/premiumTheme';
import { clearCachedProfile, fetchSurveyorProfile } from '../../helpers/surveyorSession';
import { isResponsesAdmin } from '../../helpers/adminUsers';
import AdminTabBar, { type AdminTab } from '../../components/admin/AdminTabBar';
import InsightsPanel from '../../components/admin/InsightsPanel';
import FieldRecordsPanel from '../../components/admin/FieldRecordsPanel';
import SurveyFlowPanel from '../../components/admin/SurveyFlowPanel';
import FormFieldsPanel from '../../components/admin/FormFieldsPanel';
import UsersPanel from '../../components/admin/UsersPanel';
import type { SurveyResponseRow } from '../../helpers/fieldRecords';

const VALID_TABS = new Set<AdminTab>(['insights', 'list', 'questions', 'fields', 'users']);

function parseTab(value: string | string[] | undefined): AdminTab {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && VALID_TABS.has(raw as AdminTab) ? (raw as AdminTab) : 'insights';
}

export default function AdminDashboard() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<AdminTab>(() => parseTab(params.tab));
  const [responses, setResponses] = useState<SurveyResponseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    setActiveTab(parseTab(params.tab));
  }, [params.tab]);

  const fetchResponses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) {
        router.replace('/(tabs)/profile');
        return;
      }

      const profile = await fetchSurveyorProfile(token);
      if (!isResponsesAdmin(profile.username)) {
        Alert.alert('Access denied', 'Field records are only available to the admin account.');
        router.replace('/(tabs)/profile');
        return;
      }

      const res = await axios.get(`${API_URL}/api/responses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResponses(Array.isArray(res.data) ? res.data : []);
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && (e.response?.status === 401 || e.response?.status === 403)) {
        await SecureStore.deleteItemAsync('token');
        await clearCachedProfile();
        router.replace('/(tabs)/profile');
        return;
      }
      setError('Error loading data');
    } finally {
      setLoading(false);
      setAuthChecked(true);
    }
  }, [router]);

  useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

  const handleLogout = () => {
    Alert.alert('Sign out', 'Sign out of your admin account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync('token');
          await clearCachedProfile();
          router.replace('/(tabs)/profile');
        },
      },
    ]);
  };

  const changeTab = (tab: AdminTab) => {
    setActiveTab(tab);
    router.setParams({ tab });
  };

  const showInitialLoader = !authChecked && loading;
  const showContentError = authChecked && error && responses.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.nav}>
          <View style={styles.navLeft}>
            <View style={styles.logo}>
              <Ionicons name="checkbox-outline" size={16} color="#fff" />
            </View>
            <Text style={styles.brand}>
              PulseSync <Text style={styles.brandAccent}>Admin</Text>
            </Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={14} color="#64748B" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <AdminTabBar active={activeTab} onChange={changeTab} />
      </View>

      <View style={styles.panel}>
        {showInitialLoader ? (
          <View style={styles.contentLoader}>
            <ActivityIndicator size="large" color={premium.login.emeraldDark} />
            <Text style={styles.loadingText}>Syncing survey intelligence…</Text>
          </View>
        ) : showContentError ? (
          <View style={styles.contentLoader}>
            <Ionicons name="alert-circle-outline" size={40} color="#DC2626" />
            <Text style={styles.errorTitle}>Data Fetch Failed</Text>
            <Text style={styles.errorSub}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchResponses}>
              <Text style={styles.retryBtnText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {activeTab === 'insights' && <InsightsPanel data={responses} />}
            {activeTab === 'list' && (
              <FieldRecordsPanel responses={responses} loading={loading} onRefresh={fetchResponses} />
            )}
            {activeTab === 'questions' && <SurveyFlowPanel />}
            {activeTab === 'fields' && <FormFieldsPanel />}
            {activeTab === 'users' && <UsersPanel />}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    zIndex: 10,
    elevation: 4,
  },
  contentLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SCREEN_PADDING,
    gap: 10,
  },
  loadingText: { color: premium.textMuted, fontSize: 14 },
  errorTitle: { fontSize: 18, fontWeight: '800', color: premium.text },
  errorSub: { color: premium.textMuted, textAlign: 'center' },
  retryBtn: {
    marginTop: 8,
    backgroundColor: '#1e293b',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryBtnText: { color: '#fff', fontWeight: '700' },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  navLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  brandAccent: { color: '#059669' },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  liveText: { fontSize: 9, fontWeight: '800', color: '#047857', letterSpacing: 0.5 },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  signOutText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  panel: { flex: 1, minHeight: 0 },
});
