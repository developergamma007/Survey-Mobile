import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../../constants/config';
import { SCREEN_PADDING } from '../../constants/layout';
import { premium } from '../../constants/premiumTheme';
import {
  DEFAULT_SURVEY_FIELD_CONFIG,
  mergeFieldConfig,
  SURVEYOR_FIELD_LABELS,
  VOTER_FIELD_LABELS,
  type SurveyFieldConfig,
} from '../../helpers/surveyFieldConfig';

function CheckboxRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity style={styles.checkRow} onPress={onToggle} activeOpacity={0.8}>
      <Switch value={checked} onValueChange={onToggle} trackColor={{ true: '#6366F1' }} />
      <Text style={styles.checkLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function FormFieldsPanel() {
  const [config, setConfig] = useState<SurveyFieldConfig>(DEFAULT_SURVEY_FIELD_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('token');
        const res = await axios.get(`${API_URL}/api/survey-form-config`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        setConfig(mergeFieldConfig(res.data));
      } catch {
        setConfig(DEFAULT_SURVEY_FIELD_CONFIG);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleSurveyor = (key: string) => {
    setConfig((prev) => ({
      ...prev,
      surveyorFields: { ...prev.surveyorFields, [key]: !prev.surveyorFields[key] },
    }));
  };

  const toggleVoter = (key: string) => {
    setConfig((prev) => ({
      ...prev,
      voterFields: { ...prev.voterFields, [key]: !prev.voterFields[key] },
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      const res = await axios.put(`${API_URL}/api/survey-form-config`, config, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      setConfig(mergeFieldConfig(res.data));
      Alert.alert('Saved', 'Form field settings saved.');
    } catch {
      Alert.alert('Error', 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.contentLoader}>
        <ActivityIndicator size="large" color={premium.login.emeraldDark} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Form Field Settings</Text>
      <Text style={styles.sub}>
        Choose which fields appear on web and mobile survey forms.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Surveyor Information</Text>
        {Object.entries(SURVEYOR_FIELD_LABELS).map(([key, label]) => (
          <CheckboxRow
            key={key}
            label={label}
            checked={config.surveyorFields[key] ?? true}
            onToggle={() => toggleSurveyor(key)}
          />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Voter Demographics</Text>
        {Object.entries(VOTER_FIELD_LABELS).map(([key, label]) => (
          <CheckboxRow
            key={key}
            label={label}
            checked={config.voterFields[key] ?? true}
            onToggle={() => toggleVoter(key)}
          />
        ))}
      </View>

      <View style={styles.section}>
        <CheckboxRow
          label="Enable voter search (when ward data exists)"
          checked={config.enableVoterSearch}
          onToggle={() => setConfig((p) => ({ ...p, enableVoterSearch: !p.enableVoterSearch }))}
        />
        <CheckboxRow
          label="Allow manual text entry when API lists are empty"
          checked={config.manualEntryWhenApiEmpty}
          onToggle={() =>
            setConfig((p) => ({ ...p, manualEntryWhenApiEmpty: !p.manualEntryWhenApiEmpty }))
          }
        />
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={save}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Save Settings</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contentLoader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 32 },
  title: { fontSize: 20, fontWeight: '900', color: premium.text, marginBottom: 4 },
  sub: { fontSize: 13, color: premium.textMuted, marginBottom: 16, lineHeight: 18 },
  section: {
    backgroundColor: premium.bgCard,
    borderRadius: premium.radius.md,
    borderWidth: 1,
    borderColor: premium.border,
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: premium.text, marginBottom: 8 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  checkLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#334155' },
  saveBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: premium.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
