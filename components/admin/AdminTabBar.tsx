import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { premium } from '../../constants/premiumTheme';

export type AdminTab = 'insights' | 'list' | 'questions' | 'fields' | 'users';

const TABS: { id: AdminTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'insights', label: 'Insights', icon: 'grid-outline' },
  { id: 'list', label: 'Field Records', icon: 'list-outline' },
  { id: 'questions', label: 'Survey Flow', icon: 'git-branch-outline' },
  { id: 'fields', label: 'Form Fields', icon: 'options-outline' },
  { id: 'users', label: 'Users', icon: 'people-outline' },
];

type Props = {
  active: AdminTab;
  onChange: (tab: AdminTab) => void;
};

export default function AdminTabBar({ active, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {TABS.map((tab) => {
          const selected = active === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, selected && styles.tabActive]}
              onPress={() => onChange(tab.id)}
              activeOpacity={0.85}
            >
              <Ionicons
                name={tab.icon}
                size={14}
                color={selected ? '#4338CA' : premium.textMuted}
              />
              <Text style={[styles.tabText, selected && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff',
  },
  row: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: premium.textMuted,
  },
  tabTextActive: {
    color: '#4338CA',
  },
});
