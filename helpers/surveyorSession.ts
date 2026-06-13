import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../constants/config';

export type SurveyorProfile = {
  username: string;
  display_name: string;
  mobile: string;
  is_admin: boolean;
};

const PROFILE_KEY = 'surveyor_profile';

export async function loadCachedProfile(): Promise<SurveyorProfile | null> {
  const raw = await SecureStore.getItemAsync(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SurveyorProfile;
  } catch {
    return null;
  }
}

export async function saveCachedProfile(profile: SurveyorProfile) {
  await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(profile));
}

export async function clearCachedProfile() {
  await SecureStore.deleteItemAsync(PROFILE_KEY);
}

export async function fetchSurveyorProfile(token: string): Promise<SurveyorProfile> {
  const res = await axios.get(`${API_URL}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
    validateStatus: () => true,
  });
  if (res.status === 401) {
    throw new Error('unauthorized');
  }
  if (res.status !== 200) {
    throw new Error('profile_fetch_failed');
  }
  return res.data as SurveyorProfile;
}

export async function restoreSurveyorProfile(token: string): Promise<SurveyorProfile | null> {
  try {
    const profile = await fetchSurveyorProfile(token);
    await saveCachedProfile(profile);
    return profile;
  } catch (err) {
    if (err instanceof Error && err.message === 'unauthorized') {
      await clearCachedProfile();
      return null;
    }
    return loadCachedProfile();
  }
}

export function isSurveyorAccount(profile: SurveyorProfile | null | undefined): boolean {
  if (!profile) return false;
  return profile.username.trim().toLowerCase() !== 'admin@iswot.io';
}

export function surveyorDefaults(profile: SurveyorProfile | null | undefined) {
  if (!isSurveyorAccount(profile)) {
    return { surveyorName: '', surveyorMobile: '' };
  }
  return {
    surveyorName: profile?.display_name?.trim() || '',
    surveyorMobile: profile?.mobile?.trim() || '',
  };
}
