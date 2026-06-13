import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { premium } from '../constants/premiumTheme';

export interface DropdownOption {
  id: string | number;
  label: string;
  subLabel?: string;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder: string;
  label?: string;
  disabled?: boolean;
  search?: boolean;
}

type DropdownRow = {
  label: string;
  value: string;
  subLabel?: string;
};

const LIST_SCROLL = { nestedScrollEnabled: true as const };

export default function CustomDropdown({
  options,
  value,
  onChange,
  placeholder,
  label,
  disabled,
  search,
}: CustomDropdownProps) {
  const data = useMemo<DropdownRow[]>(
    () =>
      options.map((opt) => ({
        label: opt.label,
        value: String(opt.id),
        subLabel: opt.subLabel,
      })),
    [options]
  );

  const selectedValue = value !== undefined && value !== null && value !== '' ? String(value) : null;
  const enableSearch = search ?? options.length > 6;

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Dropdown
        data={data}
        labelField="label"
        valueField="value"
        value={selectedValue}
        placeholder={placeholder}
        disable={disabled}
        search={enableSearch}
        searchPlaceholder="Search..."
        searchPlaceholderTextColor={premium.textLight}
        autoScroll={false}
        onChange={(item) => {
          const match = options.find((opt) => String(opt.id) === String(item.value));
          onChange(match?.id ?? item.value);
        }}
        style={[styles.dropdown, disabled && styles.dropdownDisabled]}
        containerStyle={styles.container}
        placeholderStyle={styles.placeholder}
        selectedTextStyle={styles.selectedText}
        itemTextStyle={styles.itemText}
        inputSearchStyle={styles.searchInput}
        activeColor="#EEF2FF"
        maxHeight={280}
        flatListProps={LIST_SCROLL}
        showsVerticalScrollIndicator
        dropdownPosition="auto"
        renderItem={(item: DropdownRow, selected?: boolean) => (
          <View style={[styles.itemRow, selected && styles.itemRowSelected]}>
            <View style={styles.itemTextWrap}>
              <Text style={[styles.itemTitle, selected && styles.itemTitleSelected]}>{item.label}</Text>
              {item.subLabel ? <Text style={styles.itemSub}>{item.subLabel}</Text> : null}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: premium.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginLeft: 2,
  },
  dropdown: {
    backgroundColor: premium.bgCard,
    borderColor: premium.border,
    borderWidth: 1,
    borderRadius: premium.radius.md,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  dropdownDisabled: {
    opacity: 0.55,
    backgroundColor: '#f8fafc',
  },
  container: {
    backgroundColor: premium.bgCard,
    borderColor: premium.border,
    borderRadius: premium.radius.md,
    borderWidth: 1,
    marginTop: 4,
    elevation: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  placeholder: {
    color: premium.textLight,
    fontSize: 15,
    fontWeight: '500',
  },
  selectedText: {
    color: premium.text,
    fontSize: 15,
    fontWeight: '600',
  },
  itemText: {
    color: premium.text,
    fontSize: 14,
    fontWeight: '600',
  },
  searchInput: {
    borderColor: premium.border,
    borderRadius: premium.radius.sm,
    fontSize: 14,
    color: premium.text,
    backgroundColor: '#f8fafc',
    minHeight: 42,
    paddingHorizontal: 10,
  },
  itemRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
  },
  itemRowSelected: {
    backgroundColor: '#EEF2FF',
  },
  itemTextWrap: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  itemTitleSelected: {
    color: '#4338ca',
  },
  itemSub: {
    fontSize: 12,
    color: premium.textLight,
    marginTop: 3,
  },
});
