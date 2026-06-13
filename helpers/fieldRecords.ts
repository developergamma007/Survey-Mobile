/** Field Records helpers — aligned with Survey-WebSite surveyFieldKeys.ts */

import { Share } from 'react-native';

export type SurveyResponseRow = {
  id: number;
  assembly: string | null;
  gba_ward: string | null;
  polling_station_name: string | null;
  polling_station_number: string | null;
  surveyor_name: string | null;
  surveyor_mobile: string | null;
  interviewer_name: string | null;
  interviewer_age: string | null;
  interviewer_gender: string | null;
  interviewer_caste: string | null;
  interviewer_community: string | null;
  interviewer_mobile: string | null;
  interviewer_education: string | null;
  interviewer_work: string | null;
  q1: string | null;
  q2: string | null;
  q3: string | null;
  q4: string | null;
  latitude: number | null;
  longitude: number | null;
  audio_url: string | null;
  has_audio?: boolean;
  audio_link?: string | null;
  audio_base64?: string | null;
  dynamic_answers: string | null;
  created_at: string;
};

export type RecordColumn = {
  key: string;
  label: string;
  isDynamic?: boolean;
  legacyKeys?: string[];
};

export const SURVEY_META_KEYS = {
  startedAt: '_surveyStartedAt',
  endedAt: '_surveyEndedAt',
} as const;

export const BASE_RECORD_COLUMNS: RecordColumn[] = [
  { key: 'id', label: 'Submission Id' },
  { key: 'au_name', label: 'Surveyor Name' },
  { key: 'submission_date', label: 'Submission Date' },
  { key: 'survey_start', label: 'Survey Start Time' },
  { key: 'survey_end', label: 'Survey End Time' },
  { key: 'audio', label: 'Audio' },
  { key: 'geotag', label: 'Geotag' },
  { key: 'team_code', label: 'Team Code' },
  { key: 'voter_of_constituency', label: 'Voter of Constituency' },
  { key: 'village', label: 'Village / Ward' },
  { key: 'name', label: 'Name' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'gender', label: 'Gender' },
  { key: 'age', label: 'Age' },
  { key: 'highest_qualification', label: 'Education' },
  { key: 'household_income', label: 'Household Income' },
  { key: 'religion', label: 'Religion' },
  { key: 'caste_list', label: 'Caste' },
  { key: 'job_type', label: 'Occupation' },
  { key: 'current_address', label: 'Current Address' },
  { key: 'polling_station', label: 'Polling Station' },
];

const STATIC_FIELD_SOURCES: Record<string, (row: SurveyResponseRow) => string> = {
  id: (row) => String(row.id),
  au_name: (row) => row.surveyor_name ?? '',
  submission_date: (row) => formatDate(row.created_at),
  team_code: (row) => row.surveyor_mobile ?? '',
  voter_of_constituency: (row) => row.assembly ?? '',
  village: (row) => row.gba_ward ?? '',
  name: (row) => row.interviewer_name ?? '',
  mobile: (row) => row.interviewer_mobile ?? '',
  gender: (row) => row.interviewer_gender ?? '',
  age: (row) => row.interviewer_age ?? '',
  highest_qualification: (row) => row.interviewer_education ?? '',
  religion: (row) => row.interviewer_community ?? '',
  caste_list: (row) => row.interviewer_caste ?? '',
  job_type: (row) => row.interviewer_work ?? '',
  polling_station: (row) =>
    [row.polling_station_name, row.polling_station_number].filter(Boolean).join(' / '),
  geotag: (row) =>
    row.latitude != null && row.longitude != null
      ? `${row.latitude.toFixed(5)}, ${row.longitude.toFixed(5)}`
      : '',
};

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

function formatDateTime(value: string | undefined): string {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function parseDynamicAnswers(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value === null || value === undefined) continue;
      out[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    return out;
  } catch {
    return {};
  }
}

export function getRecordCellValue(
  row: SurveyResponseRow,
  columnKey: string,
  legacyKeys: string[] = []
): string {
  const dynamic = parseDynamicAnswers(row.dynamic_answers);

  if (columnKey === SURVEY_META_KEYS.startedAt || columnKey === 'survey_start') {
    return formatDateTime(dynamic[SURVEY_META_KEYS.startedAt]);
  }
  if (columnKey === SURVEY_META_KEYS.endedAt || columnKey === 'survey_end') {
    return formatDateTime(dynamic[SURVEY_META_KEYS.endedAt]);
  }
  if (columnKey === 'audio') {
    return hasSurveyAudio(row) ? 'Recorded' : '';
  }
  if (columnKey === 'household_income') {
    return dynamic.household_income ?? '';
  }
  if (columnKey === 'current_address') {
    return dynamic.current_address ?? '';
  }
  if (columnKey === 'voter_of_constituency' && dynamic.voter_of_constituency) {
    return dynamic.voter_of_constituency;
  }

  if (dynamic[columnKey]) {
    const value = dynamic[columnKey];
    if (value.startsWith('{') || value.startsWith('[')) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed
            .map((entry) =>
              typeof entry === 'object' && entry
                ? Object.values(entry as Record<string, string>).filter(Boolean).join(', ')
                : String(entry)
            )
            .filter(Boolean)
            .join(' | ');
        }
      } catch {
        /* use raw */
      }
    }
    return value;
  }

  for (const legacyKey of legacyKeys) {
    if (dynamic[legacyKey]) return dynamic[legacyKey];
  }

  const staticReader = STATIC_FIELD_SOURCES[columnKey];
  if (staticReader) return staticReader(row);

  return '';
}

export function hasSurveyAudio(row: SurveyResponseRow): boolean {
  return !!(row.has_audio || row.audio_url || row.audio_base64);
}

export function getAudioExportLink(row: SurveyResponseRow): string {
  if (row.audio_link?.trim()) return row.audio_link.trim();
  if (row.audio_url?.startsWith('http')) return row.audio_url;
  return '';
}

export function hasGeotag(row: SurveyResponseRow): boolean {
  return row.latitude != null && row.longitude != null;
}

export function questionAnswerKey(text: string): string {
  const parts = String(text || '')
    .split('|')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 3) return parts[parts.length - 1];
  return text;
}

export function questionColumnLabel(text: string): string {
  const parts = String(text || '')
    .split('|')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) return parts.slice(0, 2).join(' | ');
  return parts[0] || text;
}

function escapeCsv(value: string): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export async function exportRecordsCsv(
  rows: SurveyResponseRow[],
  columns: RecordColumn[],
  filename = 'field-records.csv'
): Promise<void> {
  const headers = columns.map((col) => col.label);
  const lines = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) =>
      columns
        .map((col) => {
          if (col.key === 'audio') {
            const link = getAudioExportLink(row);
            if (link) return escapeCsv(link);
            return escapeCsv(
              hasSurveyAudio(row) ? 'Recorded (no public link)' : 'Silent'
            );
          }
          return escapeCsv(getRecordCellValue(row, col.key, col.legacyKeys));
        })
        .join(',')
    ),
  ];
  const csv = lines.join('\n');
  await Share.share({
    message: csv,
    title: filename,
  });
}
