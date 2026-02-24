import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface RadioButtonProps {
    label: string;
    selected: boolean;
    onPress: () => void;
}

const RadioButton: React.FC<RadioButtonProps> = ({ label, selected, onPress }) => {
    return (
        <TouchableOpacity style={styles.radioContainer} onPress={onPress}>
            <View style={[styles.outerCircle, selected && styles.selectedOuterCircle]}>
                {selected && <View style={styles.innerCircle} />}
            </View>
            <Text style={styles.label}>{label}</Text>
        </TouchableOpacity>
    );
};

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
            {options.map((option) => (
                <RadioButton
                    key={option.value}
                    label={option.label}
                    selected={selectedValue === option.value}
                    onPress={() => onValueChange(option.value)}
                />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    groupContainer: {
        marginVertical: 5,
    },
    radioContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingVertical: 4,
    },
    outerCircle: {
        height: 24,
        width: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#007AFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    selectedOuterCircle: {
        borderColor: '#007AFF',
    },
    innerCircle: {
        height: 12,
        width: 12,
        borderRadius: 6,
        backgroundColor: '#007AFF',
    },
    label: {
        fontSize: 16,
        color: '#333',
    },
});
