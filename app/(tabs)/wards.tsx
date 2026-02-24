import { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { API_URL } from '../../constants/config';

interface Ward {
    id: number;
    ward_name_en: string;
}

interface Question {
    text: string;
    options: string[];
}

export default function WardManagement() {
    const [wards, setWards] = useState<Ward[]>([]);
    const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [newWardName, setNewWardName] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchWards();
    }, []);

    const fetchWards = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/api/wards`);
            if (Array.isArray(res.data)) {
                setWards(res.data);
            }
        } catch (err) {
            console.error("Failed to fetch wards", err);
            Alert.alert("Error", "Failed to fetch wards");
        } finally {
            setLoading(false);
        }
    };

    const fetchQuestions = async (wardName: string) => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/api/wards/${encodeURIComponent(wardName)}/questions`);
            if (Array.isArray(res.data)) {
                setQuestions(res.data.map((q: any) => ({
                    text: q.text,
                    options: q.options ? q.options.split(",") : []
                })));
            } else {
                setQuestions([]);
            }
        } catch (err) {
            console.error("Failed to fetch questions", err);
            Alert.alert("Error", "Failed to fetch questions");
        } finally {
            setLoading(false);
        }
    };

    const createWard = async () => {
        if (!newWardName) return;
        try {
            const res = await axios.post(`${API_URL}/api/wards`, { ward_name_en: newWardName });
            if (res.status === 200 || res.status === 201) {
                setNewWardName("");
                fetchWards();
                Alert.alert("Success", "Ward created successfully");
            }
        } catch (err) {
            console.error("Failed to create ward", err);
            Alert.alert("Error", "Failed to create ward");
        }
    };

    const saveQuestions = async () => {
        if (!selectedWard) return;
        setSaving(true);
        try {
            // The backend expects List[QuestionCreate] which has text and options (List[str])
            // My current 'questions' state matches this.
            const res = await axios.post(`${API_URL}/api/wards/${encodeURIComponent(selectedWard.ward_name_en)}/questions`, questions);
            if (res.status === 200) {
                Alert.alert("Success", "Questions saved successfully");
            }
        } catch (err) {
            console.error("Failed to save questions", err);
            Alert.alert("Error", "Failed to save questions");
        } finally {
            setSaving(false);
        }
    };

    const addQuestion = () => {
        setQuestions([...questions, { text: "", options: [""] }]);
    };

    const removeQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const updateQuestionText = (index: number, text: string) => {
        const newQuestions = [...questions];
        newQuestions[index].text = text;
        setQuestions(newQuestions);
    };

    const addOption = (qIndex: number) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options.push("");
        setQuestions(newQuestions);
    };

    const updateOption = (qIndex: number, oIndex: number, text: string) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[oIndex] = text;
        setQuestions(newQuestions);
    };

    const removeOption = (qIndex: number, oIndex: number) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options = newQuestions[qIndex].options.filter((_, i) => i !== oIndex);
        setQuestions(newQuestions);
    };

    if (loading && !selectedWard) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        >
            <ScrollView contentContainerStyle={styles.scroll}>
                {!selectedWard ? (
                    <View style={styles.wardListContainer}>
                        <Text style={styles.title}>Ward Management</Text>

                        <View style={styles.addWardCard}>
                            <Text style={styles.sectionTitle}>Add New Ward</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ward Name (e.g. KR Puram)"
                                value={newWardName}
                                onChangeText={setNewWardName}
                            />
                            <TouchableOpacity style={styles.createButton} onPress={createWard}>
                                <Text style={styles.createButtonText}>Create Ward</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.sectionTitle}>Select Ward to Manage Questions</Text>
                        {wards.map((ward) => (
                            <TouchableOpacity
                                key={ward.id}
                                style={styles.wardCard}
                                onPress={() => {
                                    setSelectedWard(ward);
                                    fetchQuestions(ward.ward_name_en);
                                }}
                            >
                                <Text style={styles.wardName}>{ward.ward_name_en}</Text>
                                <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : (
                    <View style={styles.questionConfigContainer}>
                        <TouchableOpacity style={styles.backButton} onPress={() => setSelectedWard(null)}>
                            <Ionicons name="arrow-back" size={24} color="#007AFF" />
                            <Text style={styles.backButtonText}>Back to Wards</Text>
                        </TouchableOpacity>

                        <View style={styles.headerRow}>
                            <Text style={styles.title}>Questions for</Text>
                            <Text style={styles.wardHighlight}>{selectedWard.ward_name_en}</Text>
                        </View>

                        {questions.map((q, qIndex) => (
                            <View key={qIndex} style={styles.questionCard}>
                                <View style={styles.qHeader}>
                                    <Text style={styles.qLabel}>Question {qIndex + 1}</Text>
                                    <TouchableOpacity onPress={() => removeQuestion(qIndex)}>
                                        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                                    </TouchableOpacity>
                                </View>

                                <TextInput
                                    style={styles.qInput}
                                    value={q.text}
                                    onChangeText={(text) => updateQuestionText(qIndex, text)}
                                    placeholder="Type your question here..."
                                    multiline
                                />

                                <Text style={styles.optionsLabel}>Options</Text>
                                {q.options.map((opt, oIndex) => (
                                    <View key={oIndex} style={styles.optionRow}>
                                        <View style={styles.optionCircle}>
                                            <Text style={styles.optionLetter}>{String.fromCharCode(65 + oIndex)}</Text>
                                        </View>
                                        <TextInput
                                            style={styles.optionInput}
                                            value={opt}
                                            onChangeText={(text) => updateOption(qIndex, oIndex, text)}
                                            placeholder={`Option ${oIndex + 1}`}
                                        />
                                        <TouchableOpacity onPress={() => removeOption(qIndex, oIndex)}>
                                            <Ionicons name="close-circle" size={20} color="#D1D1D6" />
                                        </TouchableOpacity>
                                    </View>
                                ))}

                                <TouchableOpacity style={styles.addOptionButton} onPress={() => addOption(qIndex)}>
                                    <Ionicons name="add" size={18} color="#007AFF" />
                                    <Text style={styles.addOptionText}>Add Option</Text>
                                </TouchableOpacity>
                            </View>
                        ))}

                        <TouchableOpacity style={styles.addQuestionButton} onPress={addQuestion}>
                            <Ionicons name="add-circle" size={24} color="#007AFF" />
                            <Text style={styles.addQuestionText}>Add New Question</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.saveButton, saving && styles.disabledButton]}
                            onPress={saveQuestions}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Ionicons name="save" size={20} color="white" />
                                    <Text style={styles.saveButtonText}>Save Changes</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f7' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scroll: { padding: 15 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1d1d1f', marginBottom: 20 },
    wardListContainer: { flex: 1 },
    addWardCard: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 12,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2
    },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
    input: {
        borderWidth: 1,
        borderColor: '#E5E5EA',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
        backgroundColor: '#F2F2F7'
    },
    createButton: {
        backgroundColor: '#1d1d1f',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center'
    },
    createButtonText: { color: 'white', fontWeight: 'bold' },
    wardCard: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2
    },
    wardName: { fontSize: 16, fontWeight: '600' },
    questionConfigContainer: { flex: 1 },
    backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    backButtonText: { color: '#007AFF', fontSize: 16, marginLeft: 5 },
    headerRow: { marginBottom: 20 },
    wardHighlight: { fontSize: 28, fontWeight: 'bold', color: '#007AFF' },
    questionCard: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 15,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3
    },
    qHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    qLabel: { fontSize: 12, fontWeight: 'bold', color: '#8E8E93', textTransform: 'uppercase' },
    qInput: { fontSize: 18, fontWeight: 'bold', color: '#1C1C1E', padding: 0, marginBottom: 15 },
    optionsLabel: { fontSize: 12, fontWeight: 'bold', color: '#8E8E93', textTransform: 'uppercase', marginBottom: 10 },
    optionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    optionCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10
    },
    optionLetter: { fontSize: 12, fontWeight: 'bold', color: '#8E8E93' },
    optionInput: { flex: 1, backgroundColor: '#F2F2F7', padding: 8, borderRadius: 8, marginRight: 10 },
    addOptionButton: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    addOptionText: { color: '#007AFF', fontWeight: 'bold', marginLeft: 5 },
    addQuestionButton: {
        padding: 25,
        borderWidth: 2,
        borderColor: '#D1D1D6',
        borderStyle: 'dashed',
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        marginBottom: 30
    },
    addQuestionText: { color: '#8E8E93', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
    saveButton: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40
    },
    saveButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
    disabledButton: { opacity: 0.5 }
});
