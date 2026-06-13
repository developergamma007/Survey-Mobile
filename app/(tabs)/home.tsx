import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useAudioRecorder, AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorderState } from 'expo-audio';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API_URL } from '../../constants/config';
import { SCREEN_PADDING } from '../../constants/layout';
import { resolveCurrentLocation } from '../../helpers/location';
import { RadioButtonGroup } from '../../components/RadioButton';
import CustomDropdown from '../../components/CustomDropdown';
import { digitsOnly, validateMobileOptional, resolveOthersValue, isOthersSelection } from '../../helpers/validation';
import { fetchFieldConfig, uploadSurveyAudio, DEFAULT_FIELD_CONFIG, type SurveyFieldConfig } from '../../helpers/surveyApi';
import { buildStructuredDynamicAnswers } from '../../helpers/surveyFieldKeys';
import { buildVoterFormPatch, buildVoterSubtitle, pickVoterValue, type VoterSuggestion } from '../../helpers/voterSearch';
import * as Linking from 'expo-linking';
import { parseWardFromUrl, resolveInitialWardName } from '../../helpers/wardContext';
import { surveyorDefaults, type SurveyorProfile } from '../../helpers/surveyorSession';
import PulseSyncLoginScreen from '../../components/PulseSyncLoginScreen';
import { MAX_SURVEY_AUDIO_MS } from '../../helpers/audioLimits';

const INCOME_OPTIONS = [
    { id: 'Below 10,000', label: 'Below ₹10,000' },
    { id: '10,000 - 20,000', label: '₹10,000 - ₹20,000' },
    { id: '20,000 - 50,000', label: '₹20,000 - ₹50,000' },
    { id: '50,000 - 1,00,000', label: '₹50,000 - ₹1,00,000' },
    { id: 'Above 1,00,000', label: 'Above ₹1,00,000' },
];

interface Ward {
    id: number;
    ward_name_en: string;
    ward_name_local: string;
    assembly_no?: number | null;
}

interface DynamicQuestion {
    id: number;
    text: string;
    options: string;
}

interface Booth {
    id: number;
    booth_no: string;
    booth_add_en: string;
    booth_add_local?: string | null;
    ward_id: number;
}

const OTHER_FIELDS = {
    interviewerCaste: 'interviewerCasteOther',
    interviewerCommunity: 'interviewerCommunityOther',
    interviewerEducation: 'interviewerEducationOther',
    interviewerGender: 'interviewerGenderOther',
} as const;

export default function Home() {
    const { isAdminAuthenticated, isSurveyorLoggedIn, isAuthLoading, profile, refreshAdminAuth } = useAdminAuth();

    if (isAuthLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#059669" />
            </View>
        );
    }

    if (isAdminAuthenticated) {
        return <Redirect href="/(tabs)/profile" />;
    }

    if (!isSurveyorLoggedIn) {
        return (
            <View style={{ flex: 1 }}>
                <PulseSyncLoginScreen onLoggedIn={refreshAdminAuth} initialMode="surveyor" />
            </View>
        );
    }

    return <SurveyFormScreen profile={profile} />;
}

function SurveyFormScreen({ profile }: { profile: SurveyorProfile | null }) {
    const router = useRouter();
    const [form, setForm] = useState({
        assembly: '',
        assemblyNo: 0,
        gbaWard: '',
        pollingStationName: '',
        pollingStationNumber: '',
        surveyorName: '',
        surveyorMobile: '',
        interviewerName: '',
        interviewerAge: '',
        interviewerGender: '',
        interviewerGenderOther: '',
        interviewerCaste: '',
        interviewerCasteOther: '',
        interviewerCommunity: '',
        interviewerCommunityOther: '',
        interviewerMobile: '',
        interviewerEducation: '',
        interviewerEducationOther: '',
        interviewerWork: '',
        interviewerHouseholdIncome: '',
        interviewerCurrentAddress: '',
        voterOfConstituency: '',
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

    const [fieldConfig, setFieldConfig] = useState<SurveyFieldConfig>(DEFAULT_FIELD_CONFIG);
    const [linkedWardName, setLinkedWardName] = useState('');
    const [wards, setWards] = useState<Ward[]>([]);
    const [booths, setBooths] = useState<Booth[]>([]);
    const [dynamicQuestions, setDynamicQuestions] = useState<DynamicQuestion[]>([]);
    const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const recorderState = useAudioRecorderState(audioRecorder);
    const recordingLimitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isSurveyStartedRef = useRef(false);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [isSurveyStarted, setIsSurveyStarted] = useState(false);
    const [surveyStartedAt, setSurveyStartedAt] = useState<string | null>(null);
    const [isStarting, setIsStarting] = useState(false);
    const [selectedVoter, setSelectedVoter] = useState<VoterSuggestion | null>(null);
    const [voterSearchQuery, setVoterSearchQuery] = useState('');
    const [voterSuggestions, setVoterSuggestions] = useState<VoterSuggestion[]>([]);
    const [voterSearchLoading, setVoterSearchLoading] = useState(false);
    const [voterSearchAttempted, setVoterSearchAttempted] = useState(false);

    const useManualBooth = fieldConfig.manualEntryWhenApiEmpty && booths.length === 0;

    const sf = fieldConfig.surveyorFields;
    const vf = fieldConfig.voterFields;
    const showVoterSearch = fieldConfig.enableVoterSearch && form.gbaWardId > 0;

    useEffect(() => {
        const defaults = surveyorDefaults(profile);
        if (!defaults.surveyorName && !defaults.surveyorMobile) return;
        setForm((prev) => ({
            ...prev,
            surveyorName: prev.surveyorName.trim() || defaults.surveyorName,
            surveyorMobile: prev.surveyorMobile.trim() || defaults.surveyorMobile,
        }));
    }, [profile]);

    useEffect(() => {
        const query = voterSearchQuery.trim();
        if (!showVoterSearch || !query) {
            setVoterSuggestions([]);
            setVoterSearchAttempted(false);
            setVoterSearchLoading(false);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                setVoterSearchLoading(true);
                const params = new URLSearchParams({ q: query });
                if (form.gbaWardId > 0) params.set('ward_id', String(form.gbaWardId));
                const res = await axios.get(`${API_URL}/api/voters/search?${params.toString()}`);
                setVoterSuggestions(Array.isArray(res.data) ? res.data : []);
                setVoterSearchAttempted(true);
            } catch {
                setVoterSuggestions([]);
                setVoterSearchAttempted(true);
            } finally {
                setVoterSearchLoading(false);
            }
        }, 150);

        return () => clearTimeout(timer);
    }, [voterSearchQuery, form.gbaWardId, showVoterSearch]);

    const selectVoter = (voter: VoterSuggestion) => {
        setSelectedVoter(voter);
        const patch = buildVoterFormPatch(voter);
        setForm(prev => ({
            ...prev,
            interviewerName: patch.interviewerName || prev.interviewerName,
            interviewerAge: patch.interviewerAge || prev.interviewerAge,
            interviewerGender: patch.interviewerGender || prev.interviewerGender,
            interviewerCaste: patch.interviewerCaste || prev.interviewerCaste,
            interviewerCommunity: patch.interviewerCommunity || prev.interviewerCommunity,
            interviewerMobile: patch.interviewerMobile || prev.interviewerMobile,
            interviewerEducation: patch.interviewerEducation || prev.interviewerEducation,
            interviewerWork: patch.interviewerWork || prev.interviewerWork,
            interviewerCurrentAddress: patch.interviewerCurrentAddress || prev.interviewerCurrentAddress,
        }));
        setVoterSearchQuery(String(voter.name_en ?? ''));
        setVoterSuggestions([]);
        setVoterSearchAttempted(false);
    };

    useEffect(() => {
        isSurveyStartedRef.current = isSurveyStarted;
    }, [isSurveyStarted]);

    useEffect(() => {
        (async () => {
            try {
                const loc = await resolveCurrentLocation();
                if (loc) setLocation(loc);
            } catch (err) {
                if (__DEV__) console.warn('Startup location:', err);
            }
        })();
        fetchAllWards();
        fetchFieldConfig().then(setFieldConfig);
        resolveInitialWardName().then(setLinkedWardName);
        const sub = Linking.addEventListener('url', ({ url }) => {
            const name = parseWardFromUrl(url);
            if (name) setLinkedWardName(name);
        });
        return () => sub.remove();
    }, []);

    const fetchAllWards = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/wards`);
            setWards(Array.isArray(response.data) ? response.data : []);
        } catch {
            setWards([]);
        }
    };

    useEffect(() => {
        return () => {
            if (recordingLimitRef.current) {
                clearTimeout(recordingLimitRef.current);
                recordingLimitRef.current = null;
            }
            audioRecorder.stop().catch(() => { });
        };
    }, [audioRecorder]);

    useEffect(() => {
        if (!linkedWardName || wards.length === 0) return;
        const ward = wards.find(w => w.ward_name_en === linkedWardName);
        if (!ward) return;
        setForm(prev => ({
            ...prev,
            gbaWard: ward.ward_name_en,
            gbaWardId: ward.id,
            pollingStationName: '',
            pollingStationId: 0,
            pollingStationNumber: '',
            dynamicAnswers: {},
        }));
    }, [linkedWardName, wards]);

    useEffect(() => {
        if (!form.gbaWardId) {
            setBooths([]);
            setDynamicQuestions([]);
            return;
        }
        fetchBooths(form.gbaWardId);
        const selectedWard = wards.find(w => w.id === form.gbaWardId);
        if (selectedWard?.ward_name_en) fetchDynamicQuestions(selectedWard.ward_name_en);
    }, [form.gbaWardId, wards]);

    const fetchDynamicQuestions = async (wardName: string) => {
        try {
            const response = await axios.get(`${API_URL}/api/wards/${encodeURIComponent(wardName)}/questions`);
            setDynamicQuestions(Array.isArray(response.data) ? response.data : []);
        } catch {
            setDynamicQuestions([]);
        }
    };

    const fetchBooths = async (wardId: number) => {
        try {
            const response = await axios.get(`${API_URL}/api/booths`, { params: { ward_id: wardId } });
            setBooths(Array.isArray(response.data) ? response.data : []);
        } catch {
            setBooths([]);
        }
    };

    async function startRecording() {
        const permission = await AudioModule.requestRecordingPermissionsAsync();
        if (!permission.granted) {
            throw new Error('Microphone permission denied');
        }
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });

        try {
            try { await audioRecorder.stop(); } catch { /* ignore */ }
            await audioRecorder.prepareToRecordAsync();
            await audioRecorder.record();
            if (recordingLimitRef.current) clearTimeout(recordingLimitRef.current);
            recordingLimitRef.current = setTimeout(async () => {
                if (!isSurveyStartedRef.current) return;
                await stopRecording();
                Alert.alert(
                    'Recording limit',
                    'Audio recording stopped at 5 minutes. Only the first 5 minutes are saved.',
                );
            }, MAX_SURVEY_AUDIO_MS);
        } catch (err) {
            console.error('Failed to start recording', err);
            throw err;
        }
    }

    async function stopRecording(): Promise<string | null> {
        if (recordingLimitRef.current) {
            clearTimeout(recordingLimitRef.current);
            recordingLimitRef.current = null;
        }
        try {
            if (recorderState.isRecording) await audioRecorder.stop();
            else {
                try { await audioRecorder.stop(); } catch { /* may already be stopped */ }
            }
            await new Promise((resolve) => setTimeout(resolve, 300));
            return audioRecorder.uri ?? null;
        } catch (error) {
            console.error('Failed to stop recording', error);
            return audioRecorder.uri ?? null;
        }
    }

    async function handleStartSurvey() {
        if (isStarting) return;
        setIsStarting(true);
        try {
            await startRecording();
            const loc = await resolveCurrentLocation();
            if (loc) setLocation(loc);
            setSurveyStartedAt(new Date().toISOString());
            setIsSurveyStarted(true);
        } catch {
            Alert.alert('Error', 'Could not start audio recording. Please check microphone permissions.');
        } finally {
            setIsStarting(false);
        }
    }

    const handleSubmit = async () => {
        if (!form.surveyorName.trim()) {
            Alert.alert('Error', 'Surveyor name is required before submitting.');
            return;
        }
        if (!form.interviewerName.trim()) {
            Alert.alert('Error', 'Voter name is required');
            return;
        }
        const mobileErr =
            validateMobileOptional(form.surveyorMobile, 'Surveyor mobile') ||
            validateMobileOptional(form.interviewerMobile, 'Voter mobile');
        if (mobileErr) {
            Alert.alert('Error', mobileErr);
            return;
        }
        if ((sf.ward ?? true) && !form.gbaWard) {
            Alert.alert('Error', 'Please select a ward before submitting.');
            return;
        }

        setSubmitting(true);
        try {
            const token = await SecureStore.getItemAsync('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

            const loc = await resolveCurrentLocation();
            if (loc) setLocation(loc);

            const uri = await stopRecording();
            const audioUpload = await uploadSurveyAudio(uri, token);

            const wardName = form.gbaWard;

            const voter = selectedVoter ?? ({} as VoterSuggestion);
            const structuredAnswers = buildStructuredDynamicAnswers({
                assembly: form.assembly,
                gbaWard: wardName,
                pollingStationName: form.pollingStationName,
                pollingStationNumber: form.pollingStationNumber,
                surveyorName: form.surveyorName,
                surveyorMobile: digitsOnly(form.surveyorMobile),
                interviewerName: form.interviewerName,
                interviewerAge: form.interviewerAge,
                interviewerGender: resolveOthersValue(form.interviewerGender, form.interviewerGenderOther),
                interviewerCaste: resolveOthersValue(form.interviewerCaste, form.interviewerCasteOther),
                interviewerCommunity: resolveOthersValue(form.interviewerCommunity, form.interviewerCommunityOther),
                interviewerMobile: digitsOnly(form.interviewerMobile),
                interviewerEducation: resolveOthersValue(form.interviewerEducation, form.interviewerEducationOther),
                interviewerWork: form.interviewerWork,
                interviewerHouseholdIncome: form.interviewerHouseholdIncome,
                interviewerCurrentAddress: form.interviewerCurrentAddress,
                voterOfConstituency: form.voterOfConstituency,
                dynamicAnswers: form.dynamicAnswers,
                surveyStartedAt,
                surveyEndedAt: new Date().toISOString(),
            });

            const payload = {
                ...form,
                gbaWard: wardName,
                surveyorMobile: digitsOnly(form.surveyorMobile),
                interviewerMobile: digitsOnly(form.interviewerMobile),
                interviewerGender: resolveOthersValue(form.interviewerGender, form.interviewerGenderOther),
                interviewerCaste: resolveOthersValue(form.interviewerCaste, form.interviewerCasteOther),
                interviewerCommunity: resolveOthersValue(form.interviewerCommunity, form.interviewerCommunityOther),
                interviewerEducation: resolveOthersValue(form.interviewerEducation, form.interviewerEducationOther),
                latitude: loc?.coords.latitude ?? location?.coords.latitude ?? null,
                longitude: loc?.coords.longitude ?? location?.coords.longitude ?? null,
                audioKey: audioUpload.audioKey ?? null,
                audio_base64: audioUpload.audio_base64 ?? null,
                dynamicAnswers: JSON.stringify(structuredAnswers),
                voterNameEn: pickVoterValue(voter, ['name_en']) || form.interviewerName || null,
                voterNameKannada: pickVoterValue(voter, ['name_kannada']) || null,
                voterGender: pickVoterValue(voter, ['gender']) || form.interviewerGender || null,
                voterAge: pickVoterValue(voter, ['age', 'voter_age', 'interviewer_age']) || form.interviewerAge || null,
                voterWardCode: pickVoterValue(voter, ['ward_code', 'ward_no']) || null,
                voterBoothNo: pickVoterValue(voter, ['booth_no', 'booth']) || null,
                voterSlNo: pickVoterValue(voter, ['sl', 'sl_no', 'serial_no']) || null,
                voterHouse: pickVoterValue(voter, ['house']) || null,
                voterEpic: pickVoterValue(voter, ['epic']) || null,
                voterRelEng: pickVoterValue(voter, ['rel_eng', 'relation_name', 'father_name', 'mother_name', 'guardian_name']) || null,
                voterRelKannada: pickVoterValue(voter, ['rel_kannada', 'relation_name_kannada']) || null,
                voterRelType: pickVoterValue(voter, ['rel_type', 'relation_type']) || null,
            };

            await axios.post(`${API_URL}/surveys`, payload, { headers });
            Alert.alert('Success', 'Survey Submitted!');
            setForm(prev => ({
                ...prev,
                interviewerName: '', interviewerAge: '', interviewerGender: '', interviewerGenderOther: '',
                interviewerCaste: '', interviewerCasteOther: '', interviewerCommunity: '', interviewerCommunityOther: '',
                interviewerMobile: '', interviewerEducation: '', interviewerEducationOther: '', interviewerWork: '',
                interviewerHouseholdIncome: '', interviewerCurrentAddress: '', voterOfConstituency: '',
                q1: '', q2: '', q3: '', q4: '', candidatePriority1: '', candidatePriority2: '', candidatePriority3: '',
                gbaWardId: 0, pollingStationId: 0, dynamicAnswers: {},
            }));
            setSelectedVoter(null);
            setVoterSearchQuery('');
            setSurveyStartedAt(null);
            setIsSurveyStarted(false);
        } catch (e: unknown) {
            if (axios.isAxiosError(e)) {
                const detail = e.response?.data?.detail;
                const message = Array.isArray(detail)
                    ? detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join(', ')
                    : typeof detail === 'string'
                        ? detail
                        : e.message;
                if (e.response?.status === 403) {
                    Alert.alert('Cannot Submit', message || 'Admin accounts cannot submit surveys.');
                } else {
                    Alert.alert('Error', `Submission failed: ${message}`);
                }
            } else {
                Alert.alert('Error', 'Submission failed');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const updateField = (key: string, value: string | number) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const updateMobileField = (key: 'surveyorMobile' | 'interviewerMobile', value: string) => {
        updateField(key, digitsOnly(value));
    };

    const renderOthersInput = (field: keyof typeof OTHER_FIELDS) => {
        const otherKey = OTHER_FIELDS[field];
        const selected = form[field] as string;
        if (!isOthersSelection(selected) && selected !== 'Other') return null;
        return (
            <TextInput
                style={styles.input}
                value={form[otherKey as keyof typeof form] as string}
                onChangeText={t => updateField(otherKey, t)}
                placeholder="Please specify"
            />
        );
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            <View style={styles.greetingHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.greetingText}>PulseSync Field Survey</Text>
                    <Text style={styles.subGreetingText}>
                        Signed in as {profile?.display_name || profile?.username}
                    </Text>
                </View>
                <TouchableOpacity style={styles.adminLink} onPress={() => router.push('/(tabs)/profile')}>
                    <Text style={styles.adminLinkText}>Account</Text>
                </TouchableOpacity>
            </View>

            {!isSurveyStarted ? (
                <View style={styles.startContainer}>
                    <TouchableOpacity style={[styles.startButton, isStarting && { opacity: 0.7 }]} onPress={handleStartSurvey} disabled={isStarting}>
                        {isStarting ? <ActivityIndicator size="large" color="white" /> : <Text style={styles.startText}>Start Survey</Text>}
                    </TouchableOpacity>
                    <Text style={styles.startNote}>Audio recording and location capture will begin automatically</Text>
                </View>
            ) : (
                <>
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Surveyor Information</Text>
                        {(sf.ward ?? true) && (
                            <CustomDropdown
                                label="Ward Name"
                                placeholder="Select ward"
                                search
                                options={wards.map((w) => ({
                                    id: w.id,
                                    label: w.ward_name_en,
                                    subLabel: w.ward_name_local || undefined,
                                }))}
                                value={form.gbaWardId || ''}
                                onChange={(val) => {
                                    const ward = wards.find((w) => w.id === Number(val));
                                    if (!ward) return;
                                    setForm((prev) => ({
                                        ...prev,
                                        gbaWard: ward.ward_name_en,
                                        gbaWardId: ward.id,
                                        assemblyNo: ward.assembly_no ?? prev.assemblyNo,
                                        pollingStationName: '',
                                        pollingStationId: 0,
                                        pollingStationNumber: '',
                                        dynamicAnswers: {},
                                    }));
                                    setSelectedVoter(null);
                                    setVoterSearchQuery('');
                                    setVoterSuggestions([]);
                                    setVoterSearchAttempted(false);
                                }}
                            />
                        )}

                        {(sf.pollingStation ?? true) && (
                            useManualBooth ? (
                                <TextInput
                                    style={styles.input}
                                    value={form.pollingStationName}
                                    onChangeText={(t) => {
                                        updateField('pollingStationName', t);
                                        updateField('pollingStationNumber', '');
                                    }}
                                    placeholder="Enter polling station"
                                />
                            ) : (
                                <>
                                    <CustomDropdown
                                        label="Polling Station"
                                        placeholder={form.gbaWardId ? 'Select Polling Station' : 'Select ward first'}
                                        disabled={!form.gbaWardId}
                                        options={booths.map(b => ({ id: b.id, label: b.booth_add_en || `Booth ${b.booth_no}`, subLabel: b.booth_add_local || `Booth No: ${b.booth_no}` }))}
                                        value={form.pollingStationId}
                                        onChange={(val) => {
                                            const booth = booths.find(b => b.id === val);
                                            setForm(prev => ({
                                                ...prev, pollingStationName: booth?.booth_add_en || '',
                                                pollingStationId: val as number, pollingStationNumber: booth?.booth_no || '',
                                            }));
                                        }}
                                    />
                                </>
                            )
                        )}

                        {(sf.surveyorName ?? true) && (
                            <>
                                <Text style={[styles.label, styles.labelMuted]}>Surveyor Name</Text>
                                <View style={styles.readOnlyFieldWrap}>
                                    <TextInput
                                        style={[styles.input, styles.inputReadOnly]}
                                        value={form.surveyorName}
                                        editable={false}
                                        placeholder="Sign in to fill"
                                    />
                                    <Ionicons name="lock-closed-outline" size={18} color="#94a3b8" style={styles.readOnlyIcon} />
                                </View>
                            </>
                        )}
                        {(sf.surveyorMobile ?? true) && (
                            <>
                                <Text style={[styles.label, styles.labelMuted]}>Surveyor Phone Number</Text>
                                <View style={styles.readOnlyFieldWrap}>
                                    <TextInput
                                        style={[styles.input, styles.inputReadOnly]}
                                        value={form.surveyorMobile}
                                        editable={false}
                                        placeholder="Sign in to fill"
                                        keyboardType="phone-pad"
                                    />
                                    <Ionicons name="lock-closed-outline" size={18} color="#94a3b8" style={styles.readOnlyIcon} />
                                </View>
                            </>
                        )}
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Voter Demographics</Text>
                        {showVoterSearch ? (
                            <>
                                <Text style={styles.label}>Search Voter</Text>
                                <TextInput
                                    style={styles.input}
                                    value={voterSearchQuery}
                                    onChangeText={(text) => {
                                        setVoterSearchQuery(text);
                                        setSelectedVoter(null);
                                    }}
                                    placeholder="Type Name or EPIC"
                                    autoCapitalize="characters"
                                />
                                {voterSearchLoading ? <ActivityIndicator size="small" color="#4338ca" style={{ marginBottom: 8 }} /> : null}
                                {voterSearchAttempted && voterSuggestions.length === 0 && voterSearchQuery.trim() ? (
                                    <Text style={styles.wardHint}>No result found. Enter details manually below.</Text>
                                ) : null}
                                {voterSuggestions.map((voter, index) => (
                                    <TouchableOpacity
                                        key={`${voter.epic || voter.name_en}-${index}`}
                                        style={styles.voterSuggestion}
                                        onPress={() => selectVoter(voter)}
                                    >
                                        <Text style={styles.voterSuggestionName}>{String(voter.name_en ?? 'Unknown')}</Text>
                                        <Text style={styles.voterSuggestionMeta}>{buildVoterSubtitle(voter)}</Text>
                                    </TouchableOpacity>
                                ))}
                            </>
                        ) : !form.gbaWardId ? (
                            <Text style={styles.wardHint}>Select a ward above to search voters, or enter details manually.</Text>
                        ) : (
                            <Text style={styles.wardHint}>Enter voter details manually below.</Text>
                        )}
                        {(vf.interviewerName ?? true) && (
                            <TextInput style={styles.input} value={form.interviewerName} onChangeText={t => updateField('interviewerName', t)} placeholder="Voter Name" />
                        )}
                        {(vf.interviewerAge ?? true) && (
                            <TextInput style={styles.input} value={form.interviewerAge} onChangeText={t => updateField('interviewerAge', t)} placeholder="Age" keyboardType="numeric" />
                        )}
                        {(vf.interviewerGender ?? true) && (
                            <>
                                <CustomDropdown label="Gender" placeholder="Select Gender" options={[{ id: 'Male', label: 'Male' }, { id: 'Female', label: 'Female' }, { id: 'Other', label: 'Other' }]} value={form.interviewerGender} onChange={v => updateField('interviewerGender', v as string)} />
                                {renderOthersInput('interviewerGender')}
                            </>
                        )}
                        {(vf.interviewerCaste ?? true) && (
                            <>
                                <CustomDropdown label="Caste" placeholder="Select Caste" options={['Brahma', 'Lingayat', 'Vokkaliga', 'Kuruba', 'SC', 'ST', 'OBC', 'Others'].map(id => ({ id, label: id }))} value={form.interviewerCaste} onChange={v => updateField('interviewerCaste', v as string)} />
                                {renderOthersInput('interviewerCaste')}
                            </>
                        )}
                        {(vf.interviewerCommunity ?? true) && (
                            <>
                                <CustomDropdown label="Community" placeholder="Select Community" options={['Hindu', 'Muslim', 'Christian', 'Jain', 'Others'].map(id => ({ id, label: id }))} value={form.interviewerCommunity} onChange={v => updateField('interviewerCommunity', v as string)} />
                                {renderOthersInput('interviewerCommunity')}
                            </>
                        )}
                        {(vf.interviewerMobile ?? true) && (
                            <TextInput style={styles.input} value={form.interviewerMobile} onChangeText={t => updateMobileField('interviewerMobile', t)} placeholder="Voter Mobile (10 digits)" keyboardType="phone-pad" maxLength={10} />
                        )}
                        {(vf.interviewerEducation ?? true) && (
                            <>
                                <CustomDropdown label="Education" placeholder="Select Education" options={['Illiterate', 'Primary', 'Secondary', 'Graduate', 'Post-Graduate', 'Others'].map(id => ({ id, label: id }))} value={form.interviewerEducation} onChange={v => updateField('interviewerEducation', v as string)} />
                                {renderOthersInput('interviewerEducation')}
                            </>
                        )}
                        {(vf.interviewerWork ?? true) && (
                            <TextInput style={styles.input} value={form.interviewerWork} onChangeText={t => updateField('interviewerWork', t)} placeholder="Occupation" />
                        )}
                        {(vf.voterOfConstituency ?? true) && (
                            <CustomDropdown
                                label="Voter of Constituency"
                                placeholder="Are you a voter here?"
                                options={[{ id: 'Yes', label: 'Yes' }, { id: 'No', label: 'No' }]}
                                value={form.voterOfConstituency}
                                onChange={v => updateField('voterOfConstituency', v as string)}
                            />
                        )}
                        {(vf.interviewerHouseholdIncome ?? true) && (
                            <CustomDropdown
                                label="Household Income"
                                placeholder="Select income range"
                                options={INCOME_OPTIONS}
                                value={form.interviewerHouseholdIncome}
                                onChange={v => updateField('interviewerHouseholdIncome', v as string)}
                            />
                        )}
                        {(vf.interviewerCurrentAddress ?? true) && (
                            <TextInput
                                style={styles.input}
                                value={form.interviewerCurrentAddress}
                                onChangeText={t => updateField('interviewerCurrentAddress', t)}
                                placeholder="Current Address"
                            />
                        )}
                    </View>

                    <View style={styles.sectionPlain}>
                        <Text style={styles.sectionTitlePlain}>Ward Specific Questions</Text>
                        {!form.gbaWardId && !form.gbaWard ? (
                            <Text style={styles.wardHint}>Select a ward above to load questions.</Text>
                        ) : dynamicQuestions.length === 0 ? (
                            <Text style={styles.wardHint}>No questions configured for this ward yet.</Text>
                        ) : (
                            dynamicQuestions.map((dq, index) => (
                                <View key={dq.id} style={styles.questionCard}>
                                    <Text style={styles.questionLabel}>Q{index + 1} · {dq.text}</Text>
                                    <RadioButtonGroup
                                        options={dq.options.split(',').map(opt => ({ label: opt.trim(), value: opt.trim() })).filter(o => o.label)}
                                        selectedValue={form.dynamicAnswers[dq.text]}
                                        onValueChange={(val) => setForm(prev => ({ ...prev, dynamicAnswers: { ...prev.dynamicAnswers, [dq.text]: val } }))}
                                    />
                                    {isOthersSelection(form.dynamicAnswers[dq.text]) && (
                                        <TextInput
                                            style={styles.input}
                                            value={form.dynamicAnswers[`${dq.text}__other`] || ''}
                                            onChangeText={t => setForm(prev => ({ ...prev, dynamicAnswers: { ...prev.dynamicAnswers, [`${dq.text}__other`]: t } }))}
                                            placeholder="Please specify"
                                        />
                                    )}
                                </View>
                            ))
                        )}
                    </View>

                    {location?.coords && (
                        <Text style={styles.gpsText}>GPS: {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}</Text>
                    )}

                    <TouchableOpacity style={[styles.submitButton, submitting && styles.disabledButton]} onPress={handleSubmit} disabled={submitting}>
                        {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>Complete Survey</Text>}
                    </TouchableOpacity>
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, width: '100%', backgroundColor: '#f9f9f9' },
    contentContainer: { paddingHorizontal: SCREEN_PADDING, paddingBottom: SCREEN_PADDING, flexGrow: 1 },
    greetingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 10 },
    greetingText: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
    subGreetingText: { fontSize: 14, color: '#666', marginTop: 2 },
    adminLink: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#eef2ff', borderWidth: 1, borderColor: '#c7d2fe' },
    adminLinkText: { color: '#4338ca', fontWeight: '700', fontSize: 12 },
    section: { marginBottom: 20, paddingVertical: 4 },
    sectionPlain: { marginBottom: 16, paddingVertical: 2 },
    sectionTitle: { fontSize: 13, fontWeight: '800', marginBottom: 12, color: '#64748b', letterSpacing: 0.8, textTransform: 'uppercase' },
    sectionTitlePlain: { fontSize: 12, fontWeight: '700', marginBottom: 10, color: '#6366f1', letterSpacing: 0.6, textTransform: 'uppercase' },
    questionCard: {
        marginBottom: 12,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#ffffff',
    },
    questionLabel: { fontSize: 14, fontWeight: '600', color: '#0f172a', lineHeight: 20, marginBottom: 10 },
    label: { fontSize: 14, marginBottom: 5, fontWeight: 'bold', color: '#444', marginTop: 10 },
    labelMuted: { color: '#94a3b8' },
    readOnlyFieldWrap: { position: 'relative', marginBottom: 10 },
    readOnlyIcon: { position: 'absolute', right: 12, top: 13, opacity: 0.32 },
    input: { borderWidth: 1, borderColor: '#e2e8f0', padding: 12, borderRadius: 10, marginBottom: 10, fontSize: 16, backgroundColor: '#fff' },
    inputReadOnly: {
        backgroundColor: '#d4d8d5',
        color: '#64748b',
        paddingRight: 42,
        marginBottom: 0,
        borderColor: '#b8bfbb',
    },
    submitButton: { backgroundColor: '#007AFF', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10, marginBottom: 40 },
    disabledButton: { backgroundColor: '#a0c4ff' },
    submitText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    startContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
    startButton: { backgroundColor: '#34C759', padding: 40, borderRadius: 100, width: 220, height: 220, justifyContent: 'center', alignItems: 'center', elevation: 12 },
    startText: { color: 'white', fontWeight: 'bold', fontSize: 26, textAlign: 'center' },
    startNote: { marginTop: 30, color: '#666', textAlign: 'center', fontSize: 14, paddingHorizontal: 20 },
    wardHint: { fontSize: 14, color: '#94a3b8', fontStyle: 'italic', lineHeight: 20, marginBottom: 8 },
    linkButton: { marginBottom: 10 },
    linkButtonText: { color: '#4338ca', fontWeight: '700', fontSize: 14 },
    gpsText: { fontSize: 12, color: '#4338ca', marginBottom: 8, fontWeight: '600' },
    recordingText: { fontSize: 12, color: '#dc2626', marginBottom: 8, fontWeight: '600' },
    voterSuggestion: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        backgroundColor: '#f8fafc',
    },
    voterSuggestionName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
    voterSuggestionMeta: { fontSize: 12, color: '#64748b', marginTop: 4 },
});
