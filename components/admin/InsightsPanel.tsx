import { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SCREEN_PADDING } from '../../constants/layout';
import { premium } from '../../constants/premiumTheme';
import { SimpleBarChart } from '../SurveyCharts';
import type { SurveyResponseRow } from '../../helpers/fieldRecords';

type Props = {
  data: SurveyResponseRow[];
};

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statTextWrap}>
        <Text style={styles.statLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.statValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <View style={[styles.statIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={16} color="#fff" />
      </View>
    </View>
  );
}

export default function InsightsPanel({ data }: Props) {
  const partyData = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((r) => {
      [r.q1, r.q2, r.q3, r.q4].forEach((party) => {
        if (party) {
          const key = party.toLowerCase();
          counts[key] = (counts[key] || 0) + 1;
        }
      });
    });
    return Object.entries(counts)
      .map(([name, count]) => ({
        label: name.charAt(0).toUpperCase() + name.slice(1),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [data]);

  const genderData = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((r) => {
      if (r.interviewer_gender) {
        const key = r.interviewer_gender.toLowerCase();
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, count]) => ({
      label: name.charAt(0).toUpperCase() + name.slice(1),
      count,
    }));
  }, [data]);

  const totalResponses = data.length;
  const uniqueWards = new Set(data.map((r) => r.gba_ward).filter(Boolean)).size;
  const uniqueSurveyors = new Set(data.map((r) => r.surveyor_name).filter(Boolean)).size;
  const topParty = partyData[0]?.label ?? 'N/A';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.statsGrid}>
        <StatCard icon="people-outline" label="Total Responses" value={totalResponses} color="#3B82F6" />
        <StatCard icon="location-outline" label="Unique Wards" value={uniqueWards} color="#10B981" />
        <StatCard icon="pulse-outline" label="Active Surveyors" value={uniqueSurveyors} color="#F59E0B" />
        <StatCard icon="bar-chart-outline" label="Top Party Trend" value={topParty} color="#8B5CF6" />
      </View>

      {partyData.length > 0 ? (
        <SimpleBarChart data={partyData} title="Party Preferences (Cumulative)" />
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No party preference data yet.</Text>
        </View>
      )}

      {genderData.length > 0 ? (
        <SimpleBarChart data={genderData} title="Respondent Gender Distribution" />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 24, gap: 4 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: premium.bgCard,
    borderRadius: premium.radius.md,
    borderWidth: 1,
    borderColor: premium.border,
    padding: 12,
    gap: 8,
  },
  statTextWrap: { flex: 1, minWidth: 0 },
  statLabel: { fontSize: 10, fontWeight: '600', color: premium.textMuted },
  statValue: { fontSize: 18, fontWeight: '900', color: premium.text, marginTop: 2 },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    backgroundColor: premium.bgCard,
    borderRadius: premium.radius.md,
    borderWidth: 1,
    borderColor: premium.border,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { color: premium.textMuted, fontSize: 14 },
});
