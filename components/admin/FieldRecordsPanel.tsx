import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
  Alert,
  Linking,
} from 'react-native';
import axios from 'axios';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../constants/config';
import { SCREEN_PADDING } from '../../constants/layout';
import { premium } from '../../constants/premiumTheme';
import WardFilterSelect from './WardFilterSelect';
import FieldRecordAudioPlayer from '../FieldRecordAudioPlayer';
import {
  BASE_RECORD_COLUMNS,
  exportRecordsCsv,
  getRecordCellValue,
  hasGeotag,
  hasSurveyAudio,
  questionAnswerKey,
  questionColumnLabel,
  type RecordColumn,
  type SurveyResponseRow,
} from '../../helpers/fieldRecords';

type Ward = { id: number; ward_name_en: string };
type WardQuestion = { id: number; text: string; options: string };

const ALL_WARDS = '';

function FieldRow({ label, value }: { label: string; value: string }) {
  if (!value?.trim()) return null;
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

type Props = {
  responses: SurveyResponseRow[];
  loading: boolean;
  onRefresh: () => void;
};

export default function FieldRecordsPanel({ responses, loading, onRefresh }: Props) {
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWard, setSelectedWard] = useState<string>(ALL_WARDS);
  const [wardQuestions, setWardQuestions] = useState<WardQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    axios
      .get(`${API_URL}/api/wards`)
      .then((res) => {
        if (Array.isArray(res.data)) setWards(res.data);
      })
      .catch(() => setWards([]));
  }, []);

  useEffect(() => {
    if (!selectedWard) {
      setWardQuestions([]);
      return;
    }
    setLoadingQuestions(true);
    axios
      .get(`${API_URL}/api/wards/${encodeURIComponent(selectedWard)}/questions`)
      .then((res) => setWardQuestions(Array.isArray(res.data) ? res.data : []))
      .catch(() => setWardQuestions([]))
      .finally(() => setLoadingQuestions(false));
  }, [selectedWard]);

  const dynamicColumns: RecordColumn[] = useMemo(() => {
    if (!selectedWard) return [];
    return wardQuestions.map((q) => {
      const key = questionAnswerKey(q.text);
      return {
        key,
        label: questionColumnLabel(q.text),
        isDynamic: true,
        legacyKeys: key !== q.text ? [q.text] : [],
      };
    });
  }, [selectedWard, wardQuestions]);

  const visibleColumns = useMemo(
    () => [...BASE_RECORD_COLUMNS, ...dynamicColumns],
    [dynamicColumns]
  );

  const filteredRows = useMemo(() => {
    if (!selectedWard) return responses;
    return responses.filter((r) => r.gba_ward === selectedWard);
  }, [responses, selectedWard]);

  const handleExport = async () => {
    if (filteredRows.length === 0) {
      Alert.alert('No data', 'No records to export for this filter.');
      return;
    }
    setExporting(true);
    try {
      const slug = selectedWard
        ? selectedWard.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
        : 'all';
      await exportRecordsCsv(filteredRows, visibleColumns, `field-records-${slug}.csv`);
    } catch {
      Alert.alert('Export failed', 'Could not export CSV.');
    } finally {
      setExporting(false);
    }
  };

  const openMaps = useCallback(async (row: SurveyResponseRow) => {
    if (!hasGeotag(row) || row.latitude == null || row.longitude == null) return;
    const lat = row.latitude;
    const lng = row.longitude;
    const googleUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    const geoUrl = `geo:${lat},${lng}?q=${lat},${lng}`;
    for (const url of [geoUrl, googleUrl]) {
      try {
        await Linking.openURL(url);
        return;
      } catch {
        /* try next */
      }
    }
    try {
      await WebBrowser.openBrowserAsync(googleUrl);
    } catch {
      Alert.alert('Could not open maps', `Location: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  }, []);

  const renderRecord = ({ item }: { item: SurveyResponseRow }) => {
    const isExpanded = expandedId === item.id;
    const voterName = item.interviewer_name || '—';
    const surveyor = item.surveyor_name || '—';
    const ward = item.gba_ward || '—';
    const mobile = item.interviewer_mobile || '—';
    const gender = item.interviewer_gender || '—';
    const dateStr = new Date(item.created_at).toLocaleDateString();
    const audio = hasSurveyAudio(item);
    const geo = hasGeotag(item);

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardTitleBlock}>
            <View style={styles.idRow}>
              <Text style={styles.recordId}>#{item.id}</Text>
              <Text style={styles.recordDate}>{dateStr}</Text>
            </View>
            <Text style={styles.voterName} numberOfLines={1}>{voterName}</Text>
            <Text style={styles.metaLine} numberOfLines={1}>Surveyor: {surveyor}</Text>
            <Text style={styles.metaLine} numberOfLines={1}>Ward: {ward}</Text>
            <Text style={styles.metaLine}>{mobile} · {gender}</Text>
          </View>
          <View style={styles.actionCol}>
            {geo ? (
              <Pressable
                style={({ pressed }) => [styles.geoBtn, pressed && styles.geoBtnPressed]}
                onPress={() => openMaps(item)}
                hitSlop={8}
              >
                <Ionicons name="location-outline" size={14} color="#4338CA" />
                <Text style={styles.geoBtnText}>Open</Text>
              </Pressable>
            ) : (
              <Text style={styles.noGeo}>—</Text>
            )}
          </View>
        </View>

        <View style={styles.audioRow}>
          <FieldRecordAudioPlayer surveyId={item.id} hasAudio={audio} />
        </View>
        <TouchableOpacity
          style={styles.expandHint}
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
          activeOpacity={0.7}
        >
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={premium.textLight} />
          <Text style={styles.expandHintText}>
            {isExpanded ? 'Hide full record' : 'View full record'}
          </Text>
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.details}>
            {visibleColumns.map((col) => {
              if (col.key === 'audio' || col.key === 'geotag') return null;
              const value = getRecordCellValue(item, col.key, col.legacyKeys);
              return <FieldRow key={col.key} label={col.label} value={value} />;
            })}
          </View>
        )}
      </View>
    );
  };

  const toolbar = (
    <View style={styles.toolbar}>
      <View style={styles.toolbarRow}>
        <WardFilterSelect wards={wards} value={selectedWard} onChange={setSelectedWard} />
        <View style={styles.exportCol}>
          <View style={styles.exportLabelSpacer} />
          <TouchableOpacity
            style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
            onPress={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#4338CA" />
            ) : (
              <>
                <Ionicons name="download-outline" size={16} color="#4338CA" />
                <Text style={styles.exportBtnText}>Export</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.countBadge}>
        <Text style={styles.countBadgeText}>{filteredRows.length} records</Text>
      </View>
      {loadingQuestions && selectedWard ? (
        <Text style={styles.filterNote}>Loading ward question columns…</Text>
      ) : (
        <Text style={styles.filterNote}>
          {!selectedWard
            ? `All wards — ${filteredRows.length} records. Select a ward for question columns.`
            : `${selectedWard} — ${dynamicColumns.length} ward question column(s).`}
        </Text>
      )}
    </View>
  );

  if (loading && responses.length === 0) {
    return (
      <View style={styles.container}>
        {toolbar}
        <View style={styles.contentLoader}>
          <ActivityIndicator size="large" color={premium.login.emeraldDark} />
          <Text style={styles.loadingText}>Loading field records…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {toolbar}
      <FlatList
        data={filteredRows}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderRecord}
        refreshing={loading}
        onRefresh={onRefresh}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No records for this filter.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 24, flexGrow: 1 },
  toolbar: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  toolbarRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  exportCol: { flexShrink: 0 },
  exportLabelSpacer: { height: 16 },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 48,
    minWidth: 92,
    backgroundColor: '#EEF2FF',
    borderRadius: premium.radius.md,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    paddingHorizontal: 12,
  },
  exportBtnDisabled: { opacity: 0.6 },
  exportBtnText: { fontSize: 12, fontWeight: '800', color: '#4338CA' },
  contentLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    padding: SCREEN_PADDING,
  },
  loadingText: { color: premium.textMuted, fontSize: 14 },
  countBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  countBadgeText: { fontSize: 12, fontWeight: '800', color: '#4338CA' },
  filterNote: { fontSize: 12, color: premium.textMuted, lineHeight: 18 },
  card: {
    backgroundColor: premium.bgCard,
    borderRadius: premium.radius.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: premium.border,
  },
  cardTop: { flexDirection: 'row', gap: 10 },
  audioRow: { marginTop: 10 },
  cardTitleBlock: { flex: 1, minWidth: 0 },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  recordId: { fontSize: 12, fontWeight: '800', color: '#4338CA' },
  recordDate: { fontSize: 11, color: premium.textLight, fontWeight: '600' },
  voterName: { fontSize: 17, fontWeight: '800', color: premium.text, marginBottom: 4 },
  metaLine: { fontSize: 12, color: premium.textMuted, lineHeight: 18 },
  actionCol: { alignItems: 'center', justifyContent: 'flex-start', gap: 8, minWidth: 72 },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnActive: { backgroundColor: premium.login.emeraldDark, borderColor: premium.login.emeraldDark },
  actionBtnPressed: { opacity: 0.85 },
  silentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  silentText: { fontSize: 9, fontWeight: '800', color: '#94A3B8' },
  geoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    minWidth: 72,
    justifyContent: 'center',
  },
  geoBtnPressed: { opacity: 0.85, backgroundColor: '#E0E7FF' },
  geoBtnText: { fontSize: 10, fontWeight: '800', color: '#4338CA' },
  noGeo: { fontSize: 14, color: '#CBD5E1' },
  expandHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  expandHintText: { fontSize: 12, fontWeight: '600', color: premium.textLight },
  details: { marginTop: 12, gap: 2 },
  fieldRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  fieldLabel: {
    width: '38%',
    fontSize: 10,
    fontWeight: '800',
    color: premium.textLight,
    textTransform: 'uppercase',
  },
  fieldValue: { flex: 1, fontSize: 13, fontWeight: '600', color: premium.text },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: premium.textMuted, fontSize: 14 },
});
