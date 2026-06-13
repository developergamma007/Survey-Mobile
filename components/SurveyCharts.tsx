import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BarData {
    label: string;
    count: number;
}

interface SimpleBarChartProps {
    data: BarData[];
    title: string;
    width?: number;
}

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ data, title, width }) => {
    const maxCount = Math.max(...data.map(d => d.count), 1);

    return (
        <View style={[styles.container, width ? { width } : null]}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.chartArea}>
                {data.map((item, index) => {
                    const barHeight = (item.count / maxCount) * 150;
                    return (
                        <View key={index} style={styles.barWrapper}>
                            <View style={styles.barAndValue}>
                                <Text style={styles.valueText}>{item.count}</Text>
                                <View
                                    style={[
                                        styles.bar,
                                        { height: Math.max(barHeight, 5) }
                                    ]}
                                />
                            </View>
                            <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 12,
        marginVertical: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
        textAlign: 'center',
    },
    chartArea: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        height: 200,
        paddingBottom: 20,
    },
    barWrapper: {
        alignItems: 'center',
        flex: 1,
    },
    barAndValue: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        width: '100%',
    },
    bar: {
        width: 30,
        backgroundColor: '#007AFF',
        borderRadius: 4,
    },
    valueText: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    label: {
        fontSize: 10,
        color: '#444',
        marginTop: 8,
        textAlign: 'center',
    },
});
