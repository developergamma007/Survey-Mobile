import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  LayoutChangeEvent,
} from 'react-native';
import { Audio } from 'expo-av';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { premium } from '../constants/premiumTheme';
import { prepareSurveyAudioForPlayback } from '../helpers/surveyAudioPlayback';

type Props = {
  surveyId: number;
  hasAudio: boolean;
};

function formatTime(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function FieldRecordAudioPlayer({ surveyId, hasAudio }: Props) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const loadingRef = useRef(false);
  const localUriRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [trackWidth, setTrackWidth] = useState(1);
  const [error, setError] = useState(false);

  const unload = useCallback(async () => {
    try {
      const sound = soundRef.current;
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }
    } catch {
      /* ignore */
    } finally {
      soundRef.current = null;
      setPlaying(false);
      setPositionMs(0);
      setDurationMs(0);
    }
  }, []);

  useEffect(() => () => {
    unload();
  }, [unload]);

  const ensureLoaded = useCallback(async (): Promise<Audio.Sound> => {
    if (soundRef.current) return soundRef.current;

    const token = await SecureStore.getItemAsync('token');
    if (!token) throw new Error('Not authenticated');

    let localUri = localUriRef.current;
    if (!localUri) {
      localUri = await prepareSurveyAudioForPlayback(surveyId, token);
      localUriRef.current = localUri;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri: localUri },
      { shouldPlay: false, progressUpdateIntervalMillis: 250 }
    );

    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) return;
      setPositionMs(status.positionMillis ?? 0);
      setDurationMs(status.durationMillis ?? 0);
      if (status.didJustFinish) {
        setPlaying(false);
        setPositionMs(0);
      }
      setPlaying(status.isPlaying);
    });

    soundRef.current = sound;
    return sound;
  }, [surveyId]);

  const loadAndPlay = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(false);
    try {
      const sound = await ensureLoaded();
      await sound.playAsync();
      setPlaying(true);
    } catch (err) {
      setError(true);
      localUriRef.current = null;
      await unload();
      const detail = err instanceof Error ? err.message : 'Unknown error';
      if (__DEV__) console.warn('Audio playback failed:', detail);
      Alert.alert(
        'Playback failed',
        detail.includes('download') || detail.includes('Download')
          ? 'Could not download this recording. Check your connection and try again.'
          : 'Could not load this recording. It may be in an unsupported format or missing on the server.'
      );
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [ensureLoaded, unload]);

  const togglePlay = async () => {
    const sound = soundRef.current;
    if (!sound) {
      await loadAndPlay();
      return;
    }
    const status = await sound.getStatusAsync();
    if (!status.isLoaded) {
      await loadAndPlay();
      return;
    }
    if (status.isPlaying) {
      await sound.pauseAsync();
      setPlaying(false);
    } else {
      await sound.playAsync();
      setPlaying(true);
    }
  };

  const seekTo = async (ratio: number) => {
    const sound = soundRef.current;
    if (!sound || durationMs <= 0) return;
    const clamped = Math.min(1, Math.max(0, ratio));
    await sound.setPositionAsync(clamped * durationMs);
    setPositionMs(clamped * durationMs);
  };

  if (!hasAudio) {
    return (
      <View style={styles.silentBadge}>
        <Text style={styles.silentText}>SILENT</Text>
      </View>
    );
  }

  const progress = durationMs > 0 ? positionMs / durationMs : 0;

  return (
    <View style={styles.wrap}>
      <Pressable
        style={[styles.playBtn, playing && styles.playBtnActive]}
        onPress={togglePlay}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={playing ? '#fff' : premium.login.emeraldDark} />
        ) : (
          <Ionicons name={playing ? 'pause' : 'play'} size={14} color={playing ? '#fff' : '#4338CA'} />
        )}
      </Pressable>
      <View style={styles.trackCol}>
        <Pressable
          style={styles.track}
          onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}
          onPress={(e) => {
            if (durationMs <= 0) {
              if (!soundRef.current && !loading) loadAndPlay();
              return;
            }
            seekTo(e.nativeEvent.locationX / trackWidth);
          }}
        >
          <View style={[styles.trackFill, { width: `${progress * 100}%` }]} />
        </Pressable>
        <Text style={styles.timeText}>
          {loading ? 'Loading…' : formatTime(positionMs)}
          {durationMs > 0 ? ` / ${formatTime(durationMs)}` : ''}
        </Text>
      </View>
      {error ? <Text style={styles.errorText}>!</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 200, flex: 1 },
  silentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  silentText: { fontSize: 9, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5 },
  playBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnActive: { backgroundColor: '#4338CA', borderColor: '#4338CA' },
  trackCol: { flex: 1, minWidth: 120 },
  track: {
    height: 8,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  trackFill: { height: '100%', backgroundColor: '#6366F1', borderRadius: 3 },
  timeText: { fontSize: 9, color: '#94A3B8', marginTop: 2, fontWeight: '600' },
  errorText: { color: '#DC2626', fontWeight: '800' },
});
