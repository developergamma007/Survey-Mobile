import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import { API_URL } from '../constants/config';
import {
    DEFAULT_SURVEY_FIELD_CONFIG,
    mergeFieldConfig,
    type SurveyFieldConfig,
} from './surveyFieldConfig';

export type { SurveyFieldConfig };
export { DEFAULT_SURVEY_FIELD_CONFIG, DEFAULT_SURVEY_FIELD_CONFIG as DEFAULT_FIELD_CONFIG, mergeFieldConfig };

export async function fetchFieldConfig(): Promise<SurveyFieldConfig> {
    try {
        const res = await axios.get(`${API_URL}/api/survey-form-config`);
        return mergeFieldConfig(res.data);
    } catch {
        return DEFAULT_SURVEY_FIELD_CONFIG;
    }
}

export async function uploadSurveyAudio(
    uri: string | null,
    token?: string | null
): Promise<{ audioKey?: string; audio_base64?: string | null }> {
    if (!uri) return { audio_base64: null };

    const headers: Record<string, string> = {
        'Content-Type': 'multipart/form-data',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const formData = new FormData();
    formData.append('audio', {
        uri,
        type: 'audio/m4a',
        name: 'recording.m4a',
    } as unknown as Blob);

    try {
        const res = await axios.post(`${API_URL}/api/surveys/upload-audio`, formData, { headers });
        return { audioKey: res.data.audioKey };
    } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response?.status === 503) {
            const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
            return { audio_base64: `data:audio/m4a;base64,${base64}` };
        }
        throw error;
    }
}
