import axios from 'axios';
import { API_URL } from '../constants/config';

export async function requestSurveyorLogin(displayName: string, mobile: string) {
  const response = await axios.post(
    `${API_URL}/api/surveyor/login`,
    {
      display_name: displayName.trim(),
      mobile: mobile.replace(/\D/g, ''),
    },
    { validateStatus: () => true },
  );

  if (response.status === 200 && response.data?.access_token) {
    return { ok: true as const, token: response.data.access_token as string };
  }

  return {
    ok: false as const,
    status: response.status,
    detail: response.data?.detail || 'Login failed',
  };
}
