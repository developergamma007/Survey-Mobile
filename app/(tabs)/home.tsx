import { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, Alert, Button, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAudioRecorder, AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorderState } from 'expo-audio';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import axios from 'axios';
import { API_URL } from '../../constants/config';
import { RadioButtonGroup } from '../../components/RadioButton';
import CustomDropdown from '../../components/CustomDropdown';

interface Ward {
    id: number;
    ward_name_en: string;
    ward_name_local: string;
}

interface DynamicQuestion {
    id: number;
    text: string;
    options: string;
}

interface Booth {
    id: number;
    booth_no: string;
    booth_name_en: string;
    booth_name_local: string;
    ward_id: number;
}

const PARTY_OPTIONS = [
    { label: 'Congress', value: 'congress' },
    { label: 'BJP', value: 'bjp' },
    { label: 'JDS', value: 'jds' },
    { label: 'Others', value: 'others' },
];

export default function Home() {
    const router = useRouter();
    const [form, setForm] = useState({
        assembly: 'KR Puram',
        gbaWard: '12 Devasandra',
        pollingStationName: 'Gvt High School',
        pollingStationNumber: '9',
        surveyorName: 'Sai',
        surveyorMobile: '728229',
        interviewerName: '',
        interviewerAge: '',
        interviewerGender: '',
        interviewerCaste: '',
        interviewerCommunity: '',
        interviewerMobile: '',
        interviewerEducation: '',
        interviewerWork: '',
        q1: '',
        q2: '',
        q3: '',
        q4: '',
        candidatePriority1: '',
        candidatePriority2: '',
        candidatePriority3: '',
        gbaWardId: 0,
        pollingStationId: 0,
        dynamicAnswers: {} as Record<string, string>,
    });

    const [wards, setWards] = useState<Ward[]>([]);
    const [booths, setBooths] = useState<Booth[]>([]);
    const [dynamicQuestions, setDynamicQuestions] = useState<DynamicQuestion[]>([]);
    const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const recorderState = useAudioRecorderState(audioRecorder);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [isSurveyStarted, setIsSurveyStarted] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [username, setUsername] = useState<string>('');

    useEffect(() => {
        (async () => {
            try {
                await AudioModule.requestRecordingPermissionsAsync();
                await setAudioModeAsync({
                    playsInSilentMode: true,
                    allowsRecording: true,
                });
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    let loc = await Location.getCurrentPositionAsync({});
                    setLocation(loc);
                } else {
                    console.log('Location permission denied');
                }
            } catch (err) {
                console.error('Error getting location/permissions:', err);
            }
        })();
        fetchWards();
        fetchUsername();
    }, []);

    const fetchUsername = async () => {
        const token = await SecureStore.getItemAsync('token');
        if (token) {
            try {
                // Manually decode the JWT payload
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                const decoded = JSON.parse(jsonPayload);
                setUsername(decoded.sub || 'User');
            } catch (e) {
                console.error('Error decoding token:', e);
                setUsername('User');
            }
        }
    };

    // Cleanup recording on unmount
    useEffect(() => {
        return () => {
            if (recorderState.isRecording) {
                audioRecorder.stop().catch(() => { });
            }
        };
    }, [recorderState.isRecording]);

    useEffect(() => {
        if (form.gbaWardId) {
            fetchBooths(form.gbaWardId);
            const selectedWard = wards.find(w => w.id === form.gbaWardId);
            if (selectedWard?.ward_name_en) {
                fetchDynamicQuestions(selectedWard.ward_name_en);
            }
        }
    }, [form.gbaWardId, wards]);

    const fetchDynamicQuestions = async (wardName: string) => {
        try {
            const response = await axios.get(`${API_URL}/api/wards/${encodeURIComponent(wardName)}/questions`);
            if (response.data && Array.isArray(response.data)) {
                setDynamicQuestions(response.data);
            } else {
                setDynamicQuestions([]);
            }
        } catch (error) {
            console.error('Error fetching dynamic questions:', error);
            setDynamicQuestions([]);
        }
    };

    const fetchWards = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/wards`);
            setWards(response.data);
        } catch (error) {
            console.error('Error fetching wards:', error);
        }
    };

    const fetchBooths = async (wardId: number) => {
        try {
            const response = await axios.get(`${API_URL}/api/booths`, {
                params: { ward_id: wardId }
            });
            setBooths(response.data);
        } catch (error) {
            console.error('Error fetching booths:', error);
        }
    };

    async function startRecording() {
        try {
            // If there's an existing recording, clean it up first
            if (recorderState.isRecording) {
                try {
                    await audioRecorder.stop();
                } catch (e) { }
            }

            await audioRecorder.prepareToRecordAsync();
            audioRecorder.record();
        } catch (err: any) {
            console.error('Failed to start recording', err);
            Alert.alert('Error', 'Failed to access microphone or audio is already recording.');
        }
    }

    async function stopRecording() {
        if (!recorderState.isRecording) return null;

        try {
            await audioRecorder.stop();
            const uri = audioRecorder.uri;
            return uri;
        } catch (error) {
            console.error('Failed to stop recording', error);
        }
        return null;
    }

    async function handleStartSurvey() {
        if (isStarting) return;
        setIsStarting(true);
        try {
            await startRecording();
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                setLocation(loc);
            }
            setIsSurveyStarted(true);
        } catch (err) {
            console.error('Error starting survey:', err);
            Alert.alert('Error', 'Could not initialize survey session. Please check permissions.');
        } finally {
            setIsStarting(false);
        }
    }

    const handleSubmit = async () => {
        if (!form.interviewerName) {
            Alert.alert('Error', 'Interviewer Name is required');
            return;
        }

        setSubmitting(true);
        try {
            const token = await SecureStore.getItemAsync('token');

            let audioBase64 = null;
            let uri = null;

            if (recorderState.isRecording) {
                uri = await stopRecording();
            }

            if (uri) {
                const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
                audioBase64 = `data:audio/m4a;base64,${base64}`;
            }

            const payload = {
                ...form,
                latitude: location?.coords.latitude || null,
                longitude: location?.coords.longitude || null,
                audio_base64: audioBase64,
                dynamicAnswers: JSON.stringify(form.dynamicAnswers),
            };

            await axios.post(`${API_URL}/surveys`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Alert.alert("Success", "Survey Submitted!");
            setForm(prev => ({
                ...prev,
                interviewerName: '',
                interviewerAge: '',
                interviewerGender: '',
                interviewerCaste: '',
                interviewerCommunity: '',
                interviewerMobile: '',
                interviewerEducation: '',
                interviewerWork: '',
                q1: '',
                q2: '',
                q3: '',
                q4: '',
                candidatePriority1: '',
                candidatePriority2: '',
                candidatePriority3: '',
                gbaWardId: 0,
                pollingStationId: 0,
                dynamicAnswers: {},
            }));
            setIsSurveyStarted(false);

        } catch (e: any) {
            console.error(e);
            if (e.response?.status === 401) {
                await SecureStore.deleteItemAsync('token');
                Alert.alert("Session Expired", "Please log in again.");
                router.replace('/login');
            } else {
                Alert.alert("Error", "Submission failed: " + (e.response?.data?.detail || e.message));
            }
        } finally {
            setSubmitting(false);
        }
    };

    const updateField = (key: string, value: string | number) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <View style={styles.greetingHeader}>
                <View>
                    <Text style={styles.greetingText}>Hello, {username || 'User'}! 👋</Text>
                    <Text style={styles.subGreetingText}>Ready to start a new survey?</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/profile')}>
                    <View style={styles.avatarMini}>
                        <Text style={styles.avatarMiniText}>{username ? username.charAt(0).toUpperCase() : 'U'}</Text>
                    </View>
                </TouchableOpacity>
            </View>


            {!isSurveyStarted ? (
                <View style={styles.startContainer}>
                    <TouchableOpacity
                        style={[styles.startButton, isStarting && { opacity: 0.7 }]}
                        onPress={handleStartSurvey}
                        disabled={isStarting}
                    >
                        {isStarting ? (
                            <ActivityIndicator size="large" color="white" />
                        ) : (
                            <Text style={styles.startText}>Start Survey</Text>
                        )}
                    </TouchableOpacity>
                    <Text style={styles.startNote}>Audio recording and location capture will begin automatically</Text>
                </View>
            ) : (
                <>
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Assembly & Ward Details</Text>
                        <TextInput style={styles.input} value={form.assembly} onChangeText={t => updateField('assembly', t)} placeholder="Assembly" />

                        <CustomDropdown
                            label="Ward"
                            placeholder="Select Ward"
                            options={wards.map(w => ({ id: w.id, label: w.ward_name_en, subLabel: w.ward_name_local }))}
                            value={form.gbaWardId}
                            onChange={(val) => {
                                const ward = wards.find(w => w.id === val);
                                setForm(prev => ({ ...prev, gbaWard: ward?.ward_name_en || '', gbaWardId: val as number }));
                            }}
                        />

                        <CustomDropdown
                            label="Polling Station"
                            placeholder="Select Polling Station"
                            options={booths.map(b => ({ id: b.id, label: b.booth_name_en, subLabel: b.booth_name_local }))}
                            value={form.pollingStationId}
                            onChange={(val) => {
                                const booth = booths.find(b => b.id === val);
                                setForm(prev => ({
                                    ...prev,
                                    pollingStationName: booth?.booth_name_en || '',
                                    pollingStationId: val as number,
                                    pollingStationNumber: booth?.booth_no || prev.pollingStationNumber
                                }));
                            }}
                        />

                        <TextInput style={[styles.input, { backgroundColor: '#f1f5f9' }]} value={form.pollingStationNumber} editable={false} placeholder="Polling Station Number" />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Surveyor Details</Text>
                        <TextInput style={styles.input} value={form.surveyorName} onChangeText={t => updateField('surveyorName', t)} placeholder="Surveyor Name" />
                        <TextInput style={styles.input} value={form.surveyorMobile} onChangeText={t => updateField('surveyorMobile', t)} placeholder="Surveyor Mobile" keyboardType="phone-pad" />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Interviewer Details</Text>
                        <TextInput style={styles.input} value={form.interviewerName} onChangeText={t => updateField('interviewerName', t)} placeholder="Name" />
                        <TextInput style={styles.input} value={form.interviewerAge} onChangeText={t => updateField('interviewerAge', t)} placeholder="Age" keyboardType="numeric" />

                        <CustomDropdown
                            label="Gender"
                            placeholder="Select Gender"
                            options={[
                                { id: 'Male', label: 'Male' },
                                { id: 'Female', label: 'Female' },
                                { id: 'Other', label: 'Other' },
                            ]}
                            value={form.interviewerGender}
                            onChange={(v) => updateField('interviewerGender', v as string)}
                        />

                        <CustomDropdown
                            label="Caste"
                            placeholder="Select Caste"
                            options={[
                                { id: 'Brahma', label: 'Brahma' },
                                { id: 'Lingayat', label: 'Lingayat' },
                                { id: 'Vokkaliga', label: 'Vokkaliga' },
                                { id: 'Kuruba', label: 'Kuruba' },
                                { id: 'SC', label: 'SC' },
                                { id: 'ST', label: 'ST' },
                                { id: 'OBC', label: 'OBC' },
                                { id: 'Others', label: 'Others' },
                            ]}
                            value={form.interviewerCaste}
                            onChange={(v) => updateField('interviewerCaste', v as string)}
                        />

                        <CustomDropdown
                            label="Community"
                            placeholder="Select Community"
                            options={[
                                { id: 'Hindu', label: 'Hindu' },
                                { id: 'Muslim', label: 'Muslim' },
                                { id: 'Christian', label: 'Christian' },
                                { id: 'Jain', label: 'Jain' },
                                { id: 'Others', label: 'Others' },
                            ]}
                            value={form.interviewerCommunity}
                            onChange={(v) => updateField('interviewerCommunity', v as string)}
                        />

                        <TextInput style={styles.input} value={form.interviewerMobile} onChangeText={t => updateField('interviewerMobile', t)} placeholder="Mobile" keyboardType="phone-pad" />

                        <CustomDropdown
                            label="Education"
                            placeholder="Select Education"
                            options={[
                                { id: 'Illiterate', label: 'Illiterate' },
                                { id: 'Primary', label: 'Primary' },
                                { id: 'Secondary', label: 'Secondary' },
                                { id: 'Graduate', label: 'Graduate' },
                                { id: 'Post-Graduate', label: 'Post-Graduate' },
                                { id: 'Others', label: 'Others' },
                            ]}
                            value={form.interviewerEducation}
                            onChange={(v) => updateField('interviewerEducation', v as string)}
                        />

                        <TextInput style={styles.input} value={form.interviewerWork} onChangeText={t => updateField('interviewerWork', t)} placeholder="Work" />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Party Preference</Text>

                        <Text style={styles.label}>Q1: Which party will come to power?</Text>
                        <RadioButtonGroup
                            options={PARTY_OPTIONS}
                            selectedValue={form.q1}
                            onValueChange={(v) => updateField('q1', v)}
                        />

                        <Text style={styles.label}>Q2: Which party will come to power?</Text>
                        <RadioButtonGroup
                            options={PARTY_OPTIONS}
                            selectedValue={form.q2}
                            onValueChange={(v) => updateField('q2', v)}
                        />

                        <Text style={styles.label}>Q3: Which party will come to power?</Text>
                        <RadioButtonGroup
                            options={PARTY_OPTIONS}
                            selectedValue={form.q3}
                            onValueChange={(v) => updateField('q3', v)}
                        />

                        <Text style={styles.label}>Q4: Which party will come to power?</Text>
                        <RadioButtonGroup
                            options={PARTY_OPTIONS}
                            selectedValue={form.q4}
                            onValueChange={(v) => updateField('q4', v)}
                        />
                        {/* Dynamic Questions */}
                        {dynamicQuestions.length > 0 && (
                            <View style={{ marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#eee' }}>
                                <Text style={[styles.sectionTitle, { fontSize: 16, color: '#007AFF', borderBottomWidth: 0 }]}>
                                    Ward Specific Questions
                                </Text>
                                {dynamicQuestions.map((dq) => (
                                    <View key={dq.id} style={{ marginBottom: 20 }}>
                                        <Text style={styles.label}>{dq.text}</Text>
                                        <RadioButtonGroup
                                            options={dq.options.split(',').map(opt => ({ label: opt, value: opt }))}
                                            selectedValue={form.dynamicAnswers[dq.text]}
                                            onValueChange={(val) => setForm(prev => ({
                                                ...prev,
                                                dynamicAnswers: { ...prev.dynamicAnswers, [dq.text]: val }
                                            }))}
                                        />
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Candidate Priority</Text>
                        <TextInput style={styles.input} value={form.candidatePriority1} onChangeText={t => updateField('candidatePriority1', t)} placeholder="Priority 1" />
                        <TextInput style={styles.input} value={form.candidatePriority2} onChangeText={t => updateField('candidatePriority2', t)} placeholder="Priority 2" />
                        <TextInput style={styles.input} value={form.candidatePriority3} onChangeText={t => updateField('candidatePriority3', t)} placeholder="Priority 3" />
                    </View>

                    <View style={styles.section}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={styles.sectionTitle}>Audio Recording</Text>
                            {recorderState.isRecording && <View style={{ backgroundColor: 'red', width: 10, height: 10, borderRadius: 5 }} />}
                        </View>
                        <Button
                            title={recorderState.isRecording ? 'Recording in progress... (Stop)' : 'Start Recording'}
                            onPress={recorderState.isRecording ? stopRecording : startRecording}
                            color={recorderState.isRecording ? 'red' : 'blue'}
                        />
                    </View>

                    <TouchableOpacity style={[styles.submitButton, submitting && styles.disabledButton]} onPress={handleSubmit} disabled={submitting}>
                        {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>Submit Survey</Text>}
                    </TouchableOpacity>
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9' },
    contentContainer: { padding: 20 },
    greetingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 10 },
    greetingText: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
    subGreetingText: { fontSize: 14, color: '#666', marginTop: 2 },
    avatarMini: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
    avatarMiniText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#333' },
    section: { marginBottom: 25, backgroundColor: 'white', padding: 15, borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#444', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5 },
    label: { fontSize: 14, marginBottom: 5, fontWeight: 'bold', color: '#444', marginTop: 10 },
    input: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 10, fontSize: 16, backgroundColor: '#fff' },
    submitButton: { backgroundColor: '#007AFF', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10, marginBottom: 40 },
    disabledButton: { backgroundColor: '#a0c4ff' },
    submitText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    startContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
    startButton: { backgroundColor: '#34C759', padding: 40, borderRadius: 100, width: 220, height: 220, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 12 },
    startText: { color: 'white', fontWeight: 'bold', fontSize: 26, textAlign: 'center' },
    startNote: { marginTop: 30, color: '#666', textAlign: 'center', fontSize: 14, paddingHorizontal: 20 },
});
