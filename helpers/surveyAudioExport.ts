import { ADMIN_WEB_URL } from '../constants/config';
import type { RecordColumn, SurveyResponseRow } from './fieldRecords';
import { getRecordCellValue, hasSurveyAudio } from './fieldRecords';

export const SURVEY_AUDIO_COLUMN_LABEL = 'Survey audio';
export const SURVEY_AUDIO_DOWNLOAD_COLUMN_LABEL = 'Survey audio download';

export function buildSurveyAudioPlayUrl(surveyId: number): string {
  const base = ADMIN_WEB_URL.replace(/\/$/, '');
  return `${base}/responses/audio/${surveyId}`;
}

export function buildSurveyAudioDownloadUrl(surveyId: number): string {
  return `${buildSurveyAudioPlayUrl(surveyId)}?download=1`;
}

export function surveyAudioPortalLinks(
  row: SurveyResponseRow
): { play: string; download: string } | null {
  if (!hasSurveyAudio(row)) return null;
  return {
    play: buildSurveyAudioPlayUrl(row.id),
    download: buildSurveyAudioDownloadUrl(row.id),
  };
}

function columnExportLabel(col: RecordColumn): string {
  if (col.key === 'audio') return SURVEY_AUDIO_COLUMN_LABEL;
  return col.label;
}

export async function exportRecordsCsv(
  rows: SurveyResponseRow[],
  columns: RecordColumn[],
  filename = 'field-records.csv'
): Promise<void> {
  const { Share } = await import('react-native');
  const headers = [
    ...columns.map(columnExportLabel),
    SURVEY_AUDIO_DOWNLOAD_COLUMN_LABEL,
  ];
  const lines = [
    headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map((row) => {
      const links = surveyAudioPortalLinks(row);
      const cells = columns.map((col) => {
        let value = '';
        if (col.key === 'audio') {
          value = links?.play ?? 'Silent';
        } else {
          value = getRecordCellValue(row, col.key, col.legacyKeys);
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      cells.push(`"${(links?.download ?? '').replace(/"/g, '""')}"`);
      return cells.join(',');
    }),
  ];
  const csv = lines.join('\n');
  await Share.share({
    message: csv,
    title: filename,
  });
}
