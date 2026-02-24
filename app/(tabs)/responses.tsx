import { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Button, Alert, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import { createAudioPlayer } from 'expo-audio';
import { SimpleBarChart } from '../../components/SurveyCharts';
import { API_URL } from '../../constants/config';
const PARTY_LABELS: Record<string, string> = {
    'congress': 'Congress',
    'bjp': 'BJP',
    'jds': 'JDS',
    'others': 'Others',
    '': 'Unknown'
};

export default function Responses() {
    const [responses, setResponses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const playerRef = useRef<any>(null);

    useEffect(() => {
        fetchData();
        return () => {
            if (playerRef.current) {
                playerRef.current.remove();
            }
        };
    }, []);

    const router = useRouter();

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = await SecureStore.getItemAsync('token');
            if (!token) {
                router.replace('/login');
                return;
            }

            const res = await axios.get(`${API_URL}/api/responses`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setResponses(res.data);
        } catch (e: any) {
            console.error(e);
            if (e.response?.status === 401) {
                await SecureStore.deleteItemAsync('token');
                Alert.alert("Session Expired", "Please log in again.");
                router.replace('/login');
            } else {
                Alert.alert("Error", "Failed to fetch responses: " + (e.response?.data?.detail || e.message));
            }
        } finally {
            setLoading(false);
        }
    };

    const getChartData = (qKey: 'q1' | 'q2' | 'q3' | 'q4') => {
        const counts: Record<string, number> = { 'congress': 0, 'bjp': 0, 'jds': 0, 'others': 0 };
        responses.forEach(r => {
            const val = r[qKey];
            if (val && counts[val] !== undefined) {
                counts[val]++;
            }
        });
        return Object.keys(counts).map(key => ({
            label: PARTY_LABELS[key],
            count: counts[key]
        }));
    };

    const playAudio = async (base64: string) => {
        try {
            if (!base64 || base64.length < 100) {
                Alert.alert("Error", "Audio recording is too short or empty.");
                return;
            }

            // Clean the base64 string
            const base64Data = base64.replace(/^data:audio\/[a-z0-9]+;base64,/, "");

            // Use FileSystem to save it temporarily
            const fileUri = (FileSystem.cacheDirectory || FileSystem.documentDirectory || "") + "temp_survey_audio.m4a";

            await FileSystem.writeAsStringAsync(fileUri, base64Data, { encoding: 'base64' });

            if (playerRef.current) {
                try { playerRef.current.remove(); } catch (e) { }
            }

            const player = createAudioPlayer({ uri: fileUri });
            playerRef.current = player;
            player.play();
        } catch (error: any) {
            console.error("Playback error:", error);
            Alert.alert("Error", `Could not play audio. The recording might be corrupted or in an unsupported format.\n\nDetails: ${error.message}`);
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const isExpanded = expandedId === item.id;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => setExpandedId(isExpanded ? null : item.id)}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.interviewerName}>{item.interviewer_name || "Anonymous"}</Text>
                        <Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text>
                    </View>
                    <Text style={styles.partyBadge}>{PARTY_LABELS[item.q1] || item.q1 || "N/A"}</Text>
                </View>

                {isExpanded && (
                    <View style={styles.details}>
                        <View style={styles.detailSection}>
                            <Text style={styles.sectionTitle}>Interviewer Details</Text>
                            <Text>Age: {item.interviewer_age} | Gender: {item.interviewer_gender}</Text>
                            <Text>Caste: {item.interviewer_caste} | Community: {item.interviewer_community}</Text>
                            <Text>Mobile: {item.interviewer_mobile}</Text>
                            <Text>Education: {item.interviewer_education}</Text>
                            <Text>Work: {item.interviewer_work}</Text>
                        </View>

                        <View style={styles.detailSection}>
                            <Text style={styles.sectionTitle}>Location & Assembly</Text>
                            <Text>Assembly: {item.assembly}</Text>
                            <Text>Ward: {item.gba_ward}</Text>
                            <Text>Polling Station: {item.polling_station_name} (#{item.polling_station_number})</Text>
                            <Text>Surveyor: {item.surveyor_name} ({item.surveyor_mobile})</Text>
                        </View>

                        <View style={styles.detailSection}>
                            <Text style={styles.sectionTitle}>Preferences</Text>
                            <Text>Q1: {PARTY_LABELS[item.q1] || item.q1}</Text>
                            <Text>Q2: {PARTY_LABELS[item.q2] || item.q2}</Text>
                            <Text>Q3: {PARTY_LABELS[item.q3] || item.q3}</Text>
                            <Text>Q4: {PARTY_LABELS[item.q4] || item.q4}</Text>
                        </View>

                        <View style={styles.detailSection}>
                            <Text style={styles.sectionTitle}>Candidate Priorities</Text>
                            <Text>1: {item.candidate_priority1}</Text>
                            <Text>2: {item.candidate_priority2}</Text>
                            <Text>3: {item.candidate_priority3}</Text>
                        </View>

                        {item.audio_base64 && (
                            <TouchableOpacity style={styles.audioButton} onPress={() => playAudio(item.audio_base64)}>
                                <Text style={styles.audioButtonText}>🔊 Play Recorded Audio</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    if (loading && responses.length === 0) {
        return <ActivityIndicator size="large" style={{ flex: 1 }} color="#007AFF" />;
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={responses}
                ListHeaderComponent={() => (
                    <View style={styles.header}>
                        <Text style={styles.pageTitle}>Survey Insights</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} pagingEnabled style={styles.chartsScroll}>
                            <View style={styles.chartSlide}>
                                <SimpleBarChart data={getChartData('q1')} title="Q1: Which party will come to power?" />
                            </View>
                            <View style={styles.chartSlide}>
                                <SimpleBarChart data={getChartData('q2')} title="Q2: Influence in Assembly?" />
                            </View>
                            <View style={styles.chartSlide}>
                                <SimpleBarChart data={getChartData('q3')} title="Q3: Strongest Opposition?" />
                            </View>
                            <View style={styles.chartSlide}>
                                <SimpleBarChart data={getChartData('q4')} title="Q4: Preferred Governance?" />
                            </View>
                        </ScrollView>
                        <Text style={styles.listHeader}>Recent Responses ({responses.length})</Text>
                    </View>
                )}
                keyExtractor={item => item.id.toString()}
                renderItem={renderItem}
                refreshing={loading}
                onRefresh={fetchData}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f7' },
    listContent: { padding: 15 },
    header: { marginBottom: 10 },
    pageTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 15, color: '#1d1d1f' },
    chartsScroll: { marginBottom: 10, alignSelf: 'center' },
    chartSlide: { width: Dimensions.get('window').width - 30, paddingRight: 10 },
    listHeader: { fontSize: 18, fontWeight: '600', marginTop: 20, marginBottom: 10, color: '#333' },
    card: {
        backgroundColor: 'white',
        padding: 15,
        marginBottom: 12,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    interviewerName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    date: { fontSize: 12, color: '#888', marginTop: 2 },
    partyBadge: {
        backgroundColor: '#e3f2fd',
        color: '#007AFF',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'capitalize'
    },
    details: { marginTop: 15, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 15 },
    detailSection: { marginBottom: 12 },
    sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 4 },
    audioButton: {
        backgroundColor: '#007AFF',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10
    },
    audioButtonText: { color: 'white', fontWeight: 'bold' }
});
