import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { premium } from '../../constants/premiumTheme';

type Ward = { id: number; ward_name_en: string };

type Props = {
  wards: Ward[];
  value: string;
  onChange: (wardName: string) => void;
};

export default function WardFilterSelect({ wards, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedLabel = value || 'All Wards';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return wards;
    return wards.filter((w) => w.ward_name_en.toLowerCase().includes(q));
  }, [wards, search]);

  const select = (wardName: string) => {
    onChange(wardName);
    setOpen(false);
    setSearch('');
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Ward</Text>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)} activeOpacity={0.85}>
        <Text style={styles.triggerText} numberOfLines={1}>
          {selectedLabel}
        </Text>
        <Ionicons name="chevron-down" size={16} color={premium.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.menu} onPress={(e) => e.stopPropagation()}>
            <View style={styles.searchRow}>
              <Ionicons name="search" size={16} color={premium.textLight} />
              <TextInput
                autoFocus
                value={search}
                onChangeText={setSearch}
                placeholder="Search wards…"
                placeholderTextColor={premium.textLight}
                style={styles.searchInput}
              />
            </View>

            <TouchableOpacity
              style={[styles.option, !value && styles.optionSelected]}
              onPress={() => select('')}
            >
              <Text style={[styles.optionText, !value && styles.optionTextSelected]}>All Wards</Text>
              {!value ? <Ionicons name="checkmark" size={16} color="#4338CA" /> : null}
            </TouchableOpacity>

            <FlatList
              data={filtered}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              ListEmptyComponent={
                <Text style={styles.empty}>No wards match your search.</Text>
              }
              renderItem={({ item }) => {
                const selected = value === item.ward_name_en;
                return (
                  <TouchableOpacity
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => select(item.ward_name_en)}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]} numberOfLines={2}>
                      {item.ward_name_en}
                    </Text>
                    {selected ? <Ionicons name="checkmark" size={16} color="#4338CA" /> : null}
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: premium.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginLeft: 2,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: premium.bgCard,
    borderColor: premium.border,
    borderWidth: 1,
    borderRadius: premium.radius.md,
    minHeight: 48,
    paddingHorizontal: 14,
    gap: 8,
  },
  triggerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: premium.text,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  menu: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxHeight: '70%',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 16,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: premium.text,
    paddingVertical: 4,
  },
  list: { maxHeight: 320 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
  },
  optionSelected: { backgroundColor: '#EEF2FF' },
  optionText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#334155' },
  optionTextSelected: { color: '#4338CA' },
  empty: { padding: 20, textAlign: 'center', color: premium.textMuted, fontSize: 14 },
});
