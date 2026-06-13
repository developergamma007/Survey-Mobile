import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface RadioButtonGroupProps {
    options: { label: string; value: string }[];
    selectedValue: string;
    onValueChange: (value: string) => void;
}

export const RadioButtonGroup: React.FC<RadioButtonGroupProps> = ({
    options,
    selectedValue,
    onValueChange,
}) => {
    return (
        <View style={styles.groupContainer}>
            {options.map((option) => {
                const selected = selectedValue === option.value;
                return (
                    <TouchableOpacity
                        key={option.value}
                        style={[styles.optionChip, selected && styles.optionChipSelected]}
                        onPress={() => onValueChange(option.value)}
                        activeOpacity={0.85}
                    >
                        <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                            {option.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    groupContainer: {
        gap: 8,
    },
    optionChip: {
        width: '100%',
        minHeight: 44,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#ffffff',
        justifyContent: 'center',
    },
    optionChipSelected: {
        borderColor: '#6366f1',
        backgroundColor: '#eef2ff',
    },
    optionLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#475569',
        lineHeight: 20,
    },
    optionLabelSelected: {
        color: '#312e81',
    },
});
