import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
} from 'react-native';
import MapView, { Callout, Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { SCREEN_PADDING } from '../../constants/layout';
import { premium } from '../../constants/premiumTheme';
import CustomDropdown, { type DropdownOption } from '../CustomDropdown';
import type { SurveyResponseRow } from '../../helpers/fieldRecords';

type AnalysisView = 'surveyor' | 'ward';
type DisplayMode = 'table' | 'map';
type SortOption = 'responses' | 'name' | 'latest';
type AggregateRow = {
  id: string;
  name: string;
  mobile: string;
  assembly: string;
  ward: string;
  responses: number;
  surveyors: number;
  gpsTagged: number;
  male: number;
  female: number;
  other: number;
  latest: string | null;
};

const ALL = '__all__';
const UNASSIGNED = '__unassigned__';

function text(value: string | null | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function hasGps(row: SurveyResponseRow) {
  return Number.isFinite(row.latitude) && Number.isFinite(row.longitude) && !(row.latitude === 0 && row.longitude === 0);
}

function genderColor(gender: string | null) {
  const value = gender?.trim().toLowerCase() || '';
  if (value.startsWith('m')) return '#D946EF';
  if (value.startsWith('f')) return '#FB7185';
  return '#64748B';
}

function sortRows(rows: AggregateRow[], option: SortOption) {
  return rows.sort((a, b) => {
    if (option === 'name') return a.name.localeCompare(b.name);
    if (option === 'latest') return new Date(b.latest || 0).getTime() - new Date(a.latest || 0).getTime();
    return b.responses - a.responses || a.name.localeCompare(b.name);
  });
}

function formatDate(value: string | null) {
  if (!value) return 'No submissions';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'No submissions' : date.toLocaleString();
}

function matchesScope(value: string | null | undefined, scope: string) {
  if (scope === ALL) return true;
  if (scope === UNASSIGNED) return !value?.trim();
  return value === scope;
}

function aggregateBySurveyor(rows: SurveyResponseRow[], sort: SortOption) {
  const result = new Map<string, AggregateRow>();
  rows.forEach((row) => {
    const name = text(row.surveyor_name, 'Unassigned surveyor');
    const mobile = text(row.surveyor_mobile, '-');
    const id = `${name}::${mobile}`;
    const current = result.get(id) ?? { id, name, mobile, assembly: '', ward: '', responses: 0, surveyors: 1, gpsTagged: 0, male: 0, female: 0, other: 0, latest: null };
    current.responses += 1;
    current.gpsTagged += Number(hasGps(row));
    const gender = row.interviewer_gender?.trim().toLowerCase() || '';
    if (gender.startsWith('m')) current.male += 1;
    else if (gender.startsWith('f')) current.female += 1;
    else current.other += 1;
    if (!current.latest || new Date(row.created_at).getTime() > new Date(current.latest).getTime()) current.latest = row.created_at;
    result.set(id, current);
  });
  return sortRows(Array.from(result.values()), sort);
}

function aggregateByWard(rows: SurveyResponseRow[], sort: SortOption) {
  const surveyors = new Map<string, Set<string>>();
  const result = new Map<string, AggregateRow>();
  rows.forEach((row) => {
    const assembly = text(row.assembly, 'Unassigned assembly');
    const ward = text(row.gba_ward, 'Unassigned ward');
    const id = `${assembly}::${ward}`;
    const current = result.get(id) ?? { id, name: ward, mobile: '', assembly, ward, responses: 0, surveyors: 0, gpsTagged: 0, male: 0, female: 0, other: 0, latest: null };
    current.responses += 1;
    current.gpsTagged += Number(hasGps(row));
    const gender = row.interviewer_gender?.trim().toLowerCase() || '';
    if (gender.startsWith('m')) current.male += 1;
    else if (gender.startsWith('f')) current.female += 1;
    else current.other += 1;
    if (!current.latest || new Date(row.created_at).getTime() > new Date(current.latest).getTime()) current.latest = row.created_at;
    const wardSurveyors = surveyors.get(id) ?? new Set<string>();
    wardSurveyors.add(`${text(row.surveyor_name, 'Unassigned surveyor')}::${text(row.surveyor_mobile, '-')}`);
    surveyors.set(id, wardSurveyors);
    result.set(id, current);
  });
  return sortRows(Array.from(result.values()).map((row) => ({ ...row, surveyors: surveyors.get(row.id)?.size || 0 })), sort);
}

function mapRegion(rows: SurveyResponseRow[]): Region {
  const points = rows.filter(hasGps);
  if (!points.length) return { latitude: 12.9716, longitude: 77.5946, latitudeDelta: 0.25, longitudeDelta: 0.25 };
  const latitudes = points.map((row) => row.latitude as number);
  const longitudes = points.map((row) => row.longitude as number);
  const minLat = Math.min(...latitudes); const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes); const maxLng = Math.max(...longitudes);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.015),
    longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.015),
  };
}

export default function VolunteerAnalysisPanel({ responses, onRefresh }: { responses: SurveyResponseRow[]; onRefresh: () => void }) {
  const [assembly, setAssembly] = useState(ALL);
  const [ward, setWard] = useState(ALL);
  const [view, setView] = useState<AnalysisView>('surveyor');
  const [sort, setSort] = useState<SortOption>('responses');
  const [mode, setMode] = useState<DisplayMode>('table');

  const assemblyOptions = useMemo<DropdownOption[]>(() => {
    const names = Array.from(new Set(responses.map((row) => row.assembly?.trim()).filter(Boolean))) as string[];
    return [
      { id: ALL, label: `All Assemblies (${responses.length})` },
      ...names.sort().map((name) => ({ id: name, label: `${name} (${responses.filter((row) => row.assembly?.trim() === name).length})` })),
      ...(responses.some((row) => !row.assembly?.trim()) ? [{ id: UNASSIGNED, label: 'Unassigned Assembly' }] : []),
    ];
  }, [responses]);
  const assemblyScoped = useMemo(() => responses.filter((row) => matchesScope(row.assembly, assembly)), [responses, assembly]);
  const wardOptions = useMemo<DropdownOption[]>(() => {
    const names = Array.from(new Set(assemblyScoped.map((row) => row.gba_ward?.trim()).filter(Boolean))) as string[];
    return [
      { id: ALL, label: `All Wards (${assemblyScoped.length})` },
      ...names.sort().map((name) => ({ id: name, label: `${name} (${assemblyScoped.filter((row) => row.gba_ward?.trim() === name).length})` })),
      ...(assemblyScoped.some((row) => !row.gba_ward?.trim()) ? [{ id: UNASSIGNED, label: 'Unassigned Ward' }] : []),
    ];
  }, [assemblyScoped]);
  const filtered = useMemo(() => assemblyScoped.filter((row) => matchesScope(row.gba_ward, ward)), [assemblyScoped, ward]);
  const rows = useMemo(() => view === 'surveyor' ? aggregateBySurveyor(filtered, sort) : aggregateByWard(filtered, sort), [filtered, view, sort]);
  const gpsRows = useMemo(() => filtered.filter(hasGps), [filtered]);
  const stats = useMemo(() => ({
    responses: filtered.length,
    surveyors: new Set(filtered.map((row) => `${text(row.surveyor_name, 'Unassigned surveyor')}::${text(row.surveyor_mobile, '-')}`)).size,
    gps: gpsRows.length,
    wards: new Set(filtered.map((row) => row.gba_ward?.trim()).filter(Boolean)).size,
  }), [filtered, gpsRows]);

  const exportVisible = async () => {
    const header = view === 'surveyor'
      ? ['Surveyor', 'Mobile', 'Responses', 'GPS Tagged', 'Male', 'Female', 'Other', 'Latest survey']
      : ['Assembly', 'Ward', 'Responses', 'Surveyors', 'GPS Tagged', 'Male', 'Female', 'Other', 'Latest survey'];
    const value = rows.map((row) => view === 'surveyor'
      ? [row.name, row.mobile, row.responses, row.gpsTagged, row.male, row.female, row.other, formatDate(row.latest)]
      : [row.assembly, row.ward, row.responses, row.surveyors, row.gpsTagged, row.male, row.female, row.other, formatDate(row.latest)]
    );
    await Share.share({ title: 'Survey Volunteer Analysis', message: [header, ...value].map((line) => line.join(',')).join('\n') });
  };

  return <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.intro}><View style={styles.introIcon}><Ionicons name="bar-chart-outline" size={20} color="#4F46E5" /></View><View style={styles.introText}><Text style={styles.title}>Volunteer Analysis</Text><Text style={styles.subtitle}>Survey activity, respondent coverage and captured GPS locations.</Text></View></View>

    <View style={styles.filterCard}>
      <CustomDropdown label="Assembly" value={assembly} onChange={(value) => { setAssembly(String(value)); setWard(ALL); }} placeholder="All Assemblies" options={assemblyOptions} />
      <CustomDropdown label="Ward" value={ward} onChange={(value) => setWard(String(value))} placeholder="All Wards" options={wardOptions} disabled={wardOptions.length === 1} />
      <View style={styles.filterRow}>
        <View style={styles.filterHalf}><CustomDropdown label="View" value={view} onChange={(value) => setView(value as AnalysisView)} placeholder="Surveyor wise" options={[{ id: 'surveyor', label: 'Surveyor wise' }, { id: 'ward', label: 'Ward wise' }]} /></View>
        <View style={styles.filterHalf}><CustomDropdown label="Sort by" value={sort} onChange={(value) => setSort(value as SortOption)} placeholder="Most responses" options={[{ id: 'responses', label: 'Most responses' }, { id: 'name', label: 'Name A-Z' }, { id: 'latest', label: 'Latest activity' }]} /></View>
      </View>
      <TouchableOpacity style={styles.exportButton} onPress={exportVisible}><Ionicons name="download-outline" size={17} color="#4338CA" /><Text style={styles.exportText}>Share CSV</Text></TouchableOpacity>
    </View>

    <View style={styles.statsGrid}>
      <Stat icon="bar-chart-outline" label="Responses" value={stats.responses} color="#EEF2FF" iconColor="#4F46E5" />
      <Stat icon="people-outline" label="Surveyors" value={stats.surveyors} color="#EFF6FF" iconColor="#0284C7" />
      <Stat icon="location-outline" label="GPS tagged" value={stats.gps} color="#ECFDF5" iconColor="#059669" />
      <Stat icon="map-outline" label="Wards covered" value={stats.wards} color="#FFFBEB" iconColor="#D97706" />
    </View>

    <View style={styles.modeBar}>
      <TouchableOpacity onPress={() => setMode('table')} style={[styles.modeButton, mode === 'table' && styles.modeButtonActive]}><Text style={[styles.modeText, mode === 'table' && styles.modeTextActive]}>Table</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => setMode('map')} style={[styles.modeButton, mode === 'map' && styles.modeButtonActive]}><Text style={[styles.modeText, mode === 'map' && styles.modeTextActive]}>Map</Text></TouchableOpacity>
    </View>

    {mode === 'table' ? <View style={styles.resultsCard}>
      <Text style={styles.sectionTitle}>{view === 'surveyor' ? 'Surveyor activity' : 'Ward activity'}</Text>
      {rows.map((row) => <View key={row.id} style={styles.resultRow}>
        <View style={styles.resultHeading}><View style={styles.personBadge}><Text style={styles.personBadgeText}>{row.name.charAt(0).toUpperCase()}</Text></View><View style={styles.resultHeadingText}><Text style={styles.resultName}>{row.name}</Text><Text style={styles.resultMeta}>{view === 'surveyor' ? row.mobile : row.assembly}</Text></View><View style={styles.responseBadge}><Text style={styles.responseBadgeValue}>{row.responses}</Text><Text style={styles.responseBadgeLabel}>responses</Text></View></View>
        <View style={styles.metricRow}><Metric label="GPS" value={row.gpsTagged} color="#059669" />{view === 'ward' && <Metric label="Surveyors" value={row.surveyors} color="#0284C7" />}<Metric label="Male" value={row.male} color="#C026D3" /><Metric label="Female" value={row.female} color="#E11D48" /><Metric label="Other" value={row.other} color="#475569" /></View>
        <Text style={styles.latest}>Latest: {formatDate(row.latest)}</Text>
      </View>)}
      {!rows.length && <EmptyState label="No survey activity matches this selection." />}
    </View> : <View style={styles.mapCard}>
      <View style={styles.mapHeader}><View><Text style={styles.sectionTitle}>Captured location coverage</Text><Text style={styles.mapSub}>Tap a marker for respondent and surveyor details.</Text></View><TouchableOpacity onPress={onRefresh} style={styles.refresh}><Ionicons name="refresh-outline" size={16} color="#4338CA" /><Text style={styles.refreshText}>Refresh</Text></TouchableOpacity></View>
      <View style={styles.legend}><Legend color="#D946EF" label="Male" /><Legend color="#FB7185" label="Female" /><Legend color="#64748B" label="Other / not recorded" /></View>
      {gpsRows.length ? <MapView key={`coverage-${assembly}-${ward}-${gpsRows.map((row) => row.id).join('-')}`} style={styles.map} provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined} initialRegion={mapRegion(gpsRows)}>
        {gpsRows.map((row) => <Marker key={row.id} coordinate={{ latitude: row.latitude as number, longitude: row.longitude as number }} pinColor={genderColor(row.interviewer_gender)}><Callout><View style={styles.callout}><Text style={styles.calloutTitle}>{text(row.interviewer_name, 'Unnamed respondent')}</Text><Text style={styles.calloutText}>Surveyor: {text(row.surveyor_name, 'Unassigned surveyor')}</Text><Text style={styles.calloutText}>Assembly: {text(row.assembly, 'Unassigned assembly')}</Text><Text style={styles.calloutText}>Ward: {text(row.gba_ward, 'Unassigned ward')}</Text><Text style={styles.calloutText}>GPS: {(row.latitude as number).toFixed(5)}, {(row.longitude as number).toFixed(5)}</Text></View></Callout></Marker>)}
      </MapView> : <EmptyState label="No GPS-tagged survey responses for this selection." />}
    </View>}
  </ScrollView>;
}

function Stat({ icon, label, value, color, iconColor }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number; color: string; iconColor: string }) {
  return <View style={styles.stat}><View><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View><View style={[styles.statIcon, { backgroundColor: color }]}><Ionicons name={icon} size={17} color={iconColor} /></View></View>;
}
function Metric({ label, value, color }: { label: string; value: number; color: string }) { return <View style={styles.metric}><Text style={[styles.metricValue, { color }]}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }
function Legend({ color, label }: { color: string; label: string }) { return <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: color }]} /><Text style={styles.legendText}>{label}</Text></View>; }
function EmptyState({ label }: { label: string }) { return <View style={styles.empty}><Ionicons name="location-outline" size={28} color="#94A3B8" /><Text style={styles.emptyText}>{label}</Text></View>; }

const styles = StyleSheet.create({
  scroll: { flex: 1 }, content: { padding: SCREEN_PADDING, paddingBottom: 30, gap: 12 },
  intro: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3 }, introIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }, introText: { flex: 1 }, title: { color: premium.text, fontSize: 18, fontWeight: '900' }, subtitle: { color: premium.textMuted, fontSize: 11, marginTop: 2, lineHeight: 16 },
  filterCard: { backgroundColor: premium.bgCard, borderRadius: premium.radius.md, borderWidth: 1, borderColor: premium.border, padding: 12 }, filterRow: { flexDirection: 'row', gap: 8 }, filterHalf: { flex: 1, minWidth: 0 }, exportButton: { minHeight: 42, borderRadius: 9, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, marginTop: 1 }, exportText: { color: '#4338CA', fontSize: 13, fontWeight: '800' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, stat: { width: '48%', flexGrow: 1, backgroundColor: premium.bgCard, borderRadius: premium.radius.md, borderWidth: 1, borderColor: premium.border, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, statLabel: { color: premium.textMuted, fontWeight: '600', fontSize: 10 }, statValue: { color: premium.text, fontSize: 23, fontWeight: '900', marginTop: 4 }, statIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  modeBar: { flexDirection: 'row', padding: 4, borderRadius: 10, backgroundColor: '#E2E8F0', gap: 4 }, modeButton: { flex: 1, paddingVertical: 10, borderRadius: 7, alignItems: 'center' }, modeButtonActive: { backgroundColor: '#4F46E5' }, modeText: { fontSize: 13, color: '#475569', fontWeight: '800' }, modeTextActive: { color: '#fff' },
  resultsCard: { backgroundColor: premium.bgCard, borderRadius: premium.radius.md, borderWidth: 1, borderColor: premium.border, overflow: 'hidden' }, sectionTitle: { color: premium.text, fontSize: 15, fontWeight: '900' }, resultRow: { padding: 13, borderTopWidth: 1, borderTopColor: '#F1F5F9' }, resultHeading: { flexDirection: 'row', alignItems: 'center', gap: 9 }, personBadge: { height: 34, width: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#4F46E5' }, personBadgeText: { color: '#fff', fontWeight: '900' }, resultHeadingText: { flex: 1, minWidth: 0 }, resultName: { fontSize: 14, color: premium.text, fontWeight: '800' }, resultMeta: { color: premium.textMuted, fontSize: 11, marginTop: 2 }, responseBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: '#EEF2FF', alignItems: 'center' }, responseBadgeValue: { color: '#4338CA', fontSize: 14, fontWeight: '900' }, responseBadgeLabel: { color: '#6366F1', fontSize: 8, fontWeight: '700' }, metricRow: { flexDirection: 'row', gap: 6, marginTop: 11, flexWrap: 'wrap' }, metric: { paddingHorizontal: 7, paddingVertical: 5, borderRadius: 7, backgroundColor: '#F8FAFC', flexDirection: 'row', gap: 3, alignItems: 'center' }, metricValue: { fontWeight: '900', fontSize: 12 }, metricLabel: { color: premium.textMuted, fontWeight: '700', fontSize: 10 }, latest: { marginTop: 10, color: premium.textMuted, fontSize: 10 },
  mapCard: { backgroundColor: premium.bgCard, borderRadius: premium.radius.md, borderWidth: 1, borderColor: premium.border, padding: 12 }, mapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, mapSub: { color: premium.textMuted, fontSize: 10, marginTop: 3 }, refresh: { flexDirection: 'row', gap: 4, alignItems: 'center', padding: 6 }, refreshText: { color: '#4338CA', fontWeight: '800', fontSize: 11 }, legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 11, marginBottom: 10 }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 }, legendDot: { width: 8, height: 8, borderRadius: 4 }, legendText: { color: premium.textMuted, fontSize: 9, fontWeight: '700' }, map: { height: 390, borderRadius: 10, overflow: 'hidden' }, callout: { width: 220, padding: 4 }, calloutTitle: { color: '#0F172A', fontSize: 14, fontWeight: '900', marginBottom: 6 }, calloutText: { color: '#475569', fontSize: 11, lineHeight: 17 },
  empty: { minHeight: 180, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: '#CBD5E1', backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', padding: 22, gap: 7 }, emptyText: { color: premium.textMuted, fontSize: 12, textAlign: 'center' },
});
