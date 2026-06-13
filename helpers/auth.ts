import axios from 'axios';
import { API_URL } from '../constants/config';

export function buildUsernameCandidates(raw: string) {
  const trimmed = raw.trim();
  const candidates = [trimmed];
  if (trimmed.includes('@')) {
    const local = trimmed.split('@')[0]?.trim();
    if (local && !candidates.includes(local)) candidates.push(local);
  }
  return candidates.filter(Boolean);
}

export async function requestToken(username: string, password: string) {
  const body = new URLSearchParams();
  body.append('username', username);
  body.append('password', password);

  const response = await axios.post(`${API_URL}/token`, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    validateStatus: () => true,
  });

  if (response.status === 200 && response.data?.access_token) {
    return { ok: true as const, token: response.data.access_token as string };
  }

  return {
    ok: false as const,
    status: response.status,
    detail: response.data?.detail || 'Incorrect username or password',
  };
}

export async function decodeUsernameFromToken(token: string): Promise<string> {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    return decoded.sub || 'Admin';
  } catch {
    return 'Admin';
  }
}
