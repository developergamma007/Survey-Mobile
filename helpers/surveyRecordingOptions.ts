import { RecordingPresets, type RecordingOptions } from 'expo-audio';

/**
 * Voice field surveys: mono AAC ~64 kbps keeps 30-minute files under typical upload limits.
 */
export const SURVEY_FIELD_RECORDING_OPTIONS: RecordingOptions = {
    ...RecordingPresets.HIGH_QUALITY,
    numberOfChannels: 1,
    bitRate: 64_000,
    web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 48_000,
    },
};
