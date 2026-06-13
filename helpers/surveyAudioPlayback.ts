import * as FileSystem from 'expo-file-system/legacy';
import axios from 'axios';
import { API_URL } from '../constants/config';

const MIME_EXT: Record<string, string> = {
  webm: 'webm',
  m4a: 'm4a',
  mp4: 'm4a',
  mpeg: 'mp3',
  mp3: 'mp3',
  ogg: 'ogg',
  wav: 'wav',
  'x-m4a': 'm4a',
};

function cacheDir(): string {
  const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  if (!dir) throw new Error('No cache directory available');
  return dir;
}

function extFromMime(mime: string): string {
  const subtype = mime.toLowerCase().replace(/^audio\//, '').split(';')[0].trim();
  return MIME_EXT[subtype] || 'm4a';
}

function extFromUrl(url: string): string {
  const path = url.split('?')[0] || '';
  const match = path.match(/\.([a-z0-9]+)$/i);
  if (match) {
    const ext = match[1].toLowerCase();
    if (MIME_EXT[ext] || ['webm', 'm4a', 'mp3', 'mp4', 'ogg', 'wav'].includes(ext)) {
      return ext === 'mp4' ? 'm4a' : ext;
    }
  }
  return 'm4a';
}

function cachePath(surveyId: number, ext: string): string {
  return `${cacheDir()}survey_audio_${surveyId}.${ext}`;
}

async function fileIsReady(path: string): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(path);
  return info.exists && (info.size ?? 0) > 50;
}

async function materializeDataUrl(surveyId: number, dataUrl: string): Promise<string> {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/is);
  if (!match) throw new Error('Invalid audio data URL');

  const ext = extFromMime(match[1]);
  const path = cachePath(surveyId, ext);

  if (await fileIsReady(path)) return path;

  await FileSystem.writeAsStringAsync(path, match[2], { encoding: 'base64' });
  if (!(await fileIsReady(path))) throw new Error('Failed to write audio cache');
  return path;
}

async function materializeRemoteUrl(surveyId: number, remoteUrl: string): Promise<string> {
  const ext = extFromUrl(remoteUrl);
  const path = cachePath(surveyId, ext);

  if (await fileIsReady(path)) return path;

  const result = await FileSystem.downloadAsync(remoteUrl, path);
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Audio download failed (${result.status})`);
  }
  if (!(await fileIsReady(result.uri))) throw new Error('Downloaded audio file is empty');
  return result.uri;
}

/** Fetch a fresh playback URL (presigned S3 or legacy data URL). */
export async function fetchSurveyPlaybackUrl(
  surveyId: number,
  token: string
): Promise<string> {
  const res = await axios.get(`${API_URL}/api/responses/${surveyId}/audio`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 45000,
  });
  const url = res.data?.url as string | undefined;
  if (!url?.trim()) throw new Error('No audio URL returned');
  return url.trim();
}

/** Turn API/S3/data URL into a local file URI expo-av can play reliably. */
export async function resolveLocalAudioUri(
  surveyId: number,
  playbackUrl: string
): Promise<string> {
  const trimmed = playbackUrl.trim();
  if (trimmed.startsWith('data:')) {
    return materializeDataUrl(surveyId, trimmed);
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return materializeRemoteUrl(surveyId, trimmed);
  }
  if (trimmed.startsWith('file://')) {
    return trimmed;
  }
  throw new Error('Unsupported audio URL scheme');
}

export async function prepareSurveyAudioForPlayback(
  surveyId: number,
  token: string
): Promise<string> {
  const playbackUrl = await fetchSurveyPlaybackUrl(surveyId, token);
  return resolveLocalAudioUri(surveyId, playbackUrl);
}
