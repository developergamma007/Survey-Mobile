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
import CustomDropdown, { type DropdownOption } from '../CustomDropdown';
import {
  DEFAULT_SURVEY_FIELD_CONFIG,
  buildFormConfigPutBody,
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
  const [assemblies, setAssemblies] = useState<Array<{ assembly_no: number; assembly_name_en: string | null }>>([]);
  const [wards, setWards] = useState<Array<{ id: number; ward_name_en: string }>>([]);
  const [assemblyNo, setAssemblyNo] = useState<string>('');
  const [wardId, setWardId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingScope, setLoadingScope] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/api/assemblies`);
        setAssemblies(Array.isArray(res.data) ? res.data : []);
      } catch {
        setAssemblies([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!assemblyNo) {
      setWards([]);
      setWardId('');
      return;
    }
    axios
      .get(`${API_URL}/api/wards`, { params: { assembly_no: Number(assemblyNo) } })
      .then((res) => setWards(Array.isArray(res.data) ? res.data : []))
      .catch(() => setWards([]));
  }, [assemblyNo]);

  useEffect(() => {
    (async () => {
      setLoadingScope(true);
      try {
        const token = await SecureStore.getItemAsync('token');
        const res = await axios.get(`${API_URL}/api/survey-form-config`, {
          params: {
            ...(assemblyNo ? { assembly_no: Number(assemblyNo) } : {}),
            ...(wardId ? { ward_id: Number(wardId) } : {}),
          },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        setConfig(mergeFieldConfig(res.data));
      } catch {
        setConfig(DEFAULT_SURVEY_FIELD_CONFIG);
      } finally {
        setLoadingScope(false);
      }
    })();
  }, [assemblyNo, wardId]);

  const assemblyOptions: DropdownOption[] = [
    { id: '', label: 'Global settings (all assemblies)' },
    ...assemblies.map((assembly) => ({
      id: String(assembly.assembly_no),
      label: `${assembly.assembly_name_en || `Assembly ${assembly.assembly_no}`} (${assembly.assembly_no})`,
    })),
  ];
  const wardOptions: DropdownOption[] = [
    { id: '', label: 'Assembly settings (all wards)' },
    ...wards.map((ward) => ({ id: String(ward.id), label: ward.ward_name_en })),
  ];

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
      const res = await axios.put(`${API_URL}/api/survey-form-config`, buildFormConfigPutBody(config, { assemblyNo, wardId }), {
        params: {
          ...(assemblyNo ? { assembly_no: Number(assemblyNo) } : {}),
          ...(wardId ? { ward_id: Number(wardId) } : {}),
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      setConfig(mergeFieldConfig(res.data));
      Alert.alert('Saved', wardId ? 'Ward form field settings saved.' : assemblyNo ? 'Assembly form field settings saved.' : 'Global form field settings saved.');
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
        Choose which fields appear on web and mobile survey forms for the selected assembly or ward.
      </Text>

      <View style={styles.scopeCard}>
        <Text style={styles.scopeTitle}>Configuration Scope</Text>
        <Text style={styles.scopeSub}>Ward settings override assembly settings. Global settings remain the fallback.</Text>
        <CustomDropdown
          label="Assembly"
          value={assemblyNo}
          onChange={(value) => { setAssemblyNo(String(value)); setWardId(''); }}
          placeholder="Global settings"
          options={assemblyOptions}
        />
        <CustomDropdown
          label="Ward"
          value={wardId}
          onChange={(value) => setWardId(String(value))}
          placeholder="Assembly settings"
          options={wardOptions}
          disabled={!assemblyNo}
        />
      </View>

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
        disabled={saving || loadingScope}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>{loadingScope ? 'Loading Settings...' : 'Save Settings'}</Text>
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
  scopeCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: premium.radius.md,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    padding: 14,
    marginBottom: 12,
  },
  scopeTitle: { fontSize: 15, fontWeight: '800', color: premium.text, marginBottom: 3 },
  scopeSub: { fontSize: 12, lineHeight: 17, color: premium.textMuted, marginBottom: 12 },
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
