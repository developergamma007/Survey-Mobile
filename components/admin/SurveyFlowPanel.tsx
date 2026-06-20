import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '../../constants/config';
import { SCREEN_PADDING } from '../../constants/layout';
import { premium } from '../../constants/premiumTheme';
import { parseQuestionConfig, serializeChoiceQuestion } from '../../helpers/surveyText';

interface Ward {
  id: number;
  ward_name_en: string;
}

interface Question {
  text: string;
  options: string[];
}

export default function SurveyFlowPanel() {
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newWardName, setNewWardName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchWards();
  }, []);

  const fetchWards = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/wards`);
      if (Array.isArray(res.data)) setWards(res.data);
    } catch {
      Alert.alert('Error', 'Failed to fetch wards');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async (wardName: string) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/wards/${encodeURIComponent(wardName)}/questions`);
      if (Array.isArray(res.data)) {
        setQuestions(
          res.data.map((q: { text: string; options?: string }) => {
            const config = parseQuestionConfig(q.options);
            return {
              text: q.text,
              options: config.type === 'choice' ? config.options : [],
            };
          })
        );
      } else {
        setQuestions([]);
      }
    } catch {
      Alert.alert('Error', 'Failed to fetch questions');
    } finally {
      setLoading(false);
    }
  };

  const createWard = async () => {
    if (!newWardName.trim()) return;
    try {
      await axios.post(`${API_URL}/api/wards`, { ward_name_en: newWardName.trim() });
      setNewWardName('');
      fetchWards();
      Alert.alert('Success', 'Ward created successfully');
    } catch {
      Alert.alert('Error', 'Failed to create ward');
    }
  };

  const saveQuestions = async () => {
    if (!selectedWard) return;
    setSaving(true);
    try {
      await axios.post(
        `${API_URL}/api/wards/${encodeURIComponent(selectedWard.ward_name_en)}/questions`,
        questions.map((question) => ({
          text: question.text,
          options: serializeChoiceQuestion(question.options),
        }))
      );
      Alert.alert('Success', 'Questions saved successfully');
    } catch {
      Alert.alert('Error', 'Failed to save questions');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !selectedWard && wards.length === 0) {
    return (
      <View style={styles.contentLoader}>
        <ActivityIndicator size="large" color={premium.login.emeraldDark} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {!selectedWard ? (
          <>
            <View style={styles.addCard}>
              <Text style={styles.sectionTitle}>Add New Ward</Text>
              <TextInput
                style={styles.input}
                placeholder="Ward Name (e.g. KR Puram)"
                placeholderTextColor={premium.textLight}
                value={newWardName}
                onChangeText={setNewWardName}
              />
              <TouchableOpacity style={styles.primaryBtn} onPress={createWard}>
                <Text style={styles.primaryBtnText}>Create Ward</Text>
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
                <Ionicons name="chevron-forward" size={20} color={premium.textLight} />
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedWard(null)}>
              <Ionicons name="arrow-back" size={20} color="#007AFF" />
              <Text style={styles.backBtnText}>Back to Wards</Text>
            </TouchableOpacity>
            <Text style={styles.wardHighlight}>{selectedWard.ward_name_en}</Text>

            {questions.map((q, qIndex) => (
              <View key={qIndex} style={styles.questionCard}>
                <View style={styles.qHeader}>
                  <Text style={styles.qLabel}>Question {qIndex + 1}</Text>
                  <TouchableOpacity onPress={() => setQuestions(questions.filter((_, i) => i !== qIndex))}>
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.qInput}
                  value={q.text}
                  onChangeText={(text) => {
                    const next = [...questions];
                    next[qIndex].text = text;
                    setQuestions(next);
                  }}
                  placeholder="Type your question here..."
                  placeholderTextColor={premium.textLight}
                  multiline
                />
                <Text style={styles.optionsLabel}>Options</Text>
                {q.options.map((opt, oIndex) => (
                  <View key={oIndex} style={styles.optionRow}>
                    <TextInput
                      style={styles.optionInput}
                      value={opt}
                      onChangeText={(text) => {
                        const next = [...questions];
                        next[qIndex].options[oIndex] = text;
                        setQuestions(next);
                      }}
                      placeholder={`Option ${oIndex + 1}`}
                      placeholderTextColor={premium.textLight}
                    />
                    <TouchableOpacity
                      onPress={() => {
                        const next = [...questions];
                        next[qIndex].options = next[qIndex].options.filter((_, i) => i !== oIndex);
                        setQuestions(next);
                      }}
                    >
                      <Ionicons name="close-circle" size={20} color="#D1D1D6" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.linkBtn}
                  onPress={() => {
                    const next = [...questions];
                    next[qIndex].options.push('');
                    setQuestions(next);
                  }}
                >
                  <Ionicons name="add" size={18} color="#007AFF" />
                  <Text style={styles.linkBtnText}>Add Option</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={styles.dashedBtn}
              onPress={() => setQuestions([...questions, { text: '', options: [''] }])}
            >
              <Ionicons name="add-circle-outline" size={22} color={premium.textLight} />
              <Text style={styles.dashedBtnText}>Add New Question</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={saveQuestions}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contentLoader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 32 },
  addCard: {
    backgroundColor: premium.bgCard,
    borderRadius: premium.radius.md,
    borderWidth: 1,
    borderColor: premium.border,
    padding: 14,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: premium.text, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: premium.border,
    borderRadius: premium.radius.sm,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#F8FAFC',
    fontSize: 15,
    color: premium.text,
  },
  primaryBtn: {
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: premium.radius.sm,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  wardCard: {
    backgroundColor: premium.bgCard,
    borderRadius: premium.radius.md,
    borderWidth: 1,
    borderColor: premium.border,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wardName: { fontSize: 16, fontWeight: '700', color: premium.text, flex: 1 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  backBtnText: { color: '#007AFF', fontSize: 15, fontWeight: '600' },
  wardHighlight: { fontSize: 22, fontWeight: '900', color: '#007AFF', marginBottom: 16 },
  questionCard: {
    backgroundColor: premium.bgCard,
    borderRadius: premium.radius.md,
    borderWidth: 1,
    borderColor: premium.border,
    padding: 14,
    marginBottom: 12,
  },
  qHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  qLabel: { fontSize: 11, fontWeight: '800', color: premium.textLight, textTransform: 'uppercase' },
  qInput: { fontSize: 16, fontWeight: '700', color: premium.text, marginBottom: 12, padding: 0 },
  optionsLabel: { fontSize: 11, fontWeight: '800', color: premium.textLight, marginBottom: 8, textTransform: 'uppercase' },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  optionInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: premium.border,
    borderRadius: premium.radius.sm,
    padding: 10,
    fontSize: 14,
    color: premium.text,
  },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  linkBtnText: { color: '#007AFF', fontWeight: '700' },
  dashedBtn: {
    borderWidth: 2,
    borderColor: '#D1D1D6',
    borderStyle: 'dashed',
    borderRadius: premium.radius.md,
    padding: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  dashedBtnText: { color: premium.textLight, fontWeight: '700' },
  saveBtn: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: premium.radius.md,
    alignItems: 'center',
    marginBottom: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
