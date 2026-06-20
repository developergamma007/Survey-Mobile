export type QuestionFieldType = 'choice' | 'text';

export type ParsedQuestionConfig =
    | { type: 'choice'; options: string[] }
    | { type: 'text'; fields: string[] };

export function splitQuestionText(text: string): {
    primary: string;
    secondary: string | null;
    fieldKey: string | null;
} {
    const trimmed = String(text || '').trim();
    if (!trimmed) return { primary: '', secondary: null, fieldKey: null };

    const parts = trimmed.split('|').map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 3) {
        const fieldKey = parts[parts.length - 1];
        const secondary = parts[parts.length - 2];
        const primary = parts.slice(0, -2).join(' | ');
        return { primary, secondary, fieldKey };
    }
    if (parts.length === 2) return { primary: parts[0], secondary: parts[1], fieldKey: null };
    return { primary: trimmed, secondary: null, fieldKey: null };
}

export function questionAnswerKey(text: string): string {
    return splitQuestionText(text).fieldKey || text;
}

export function parseQuestionConfig(options: string | string[] | null | undefined): ParsedQuestionConfig {
    if (Array.isArray(options)) {
        return { type: 'choice', options: options.map((opt) => String(opt).trim()).filter(Boolean) };
    }

    const raw = String(options || '').trim();
    if (!raw) return { type: 'choice', options: [] };

    if (raw.startsWith('{')) {
        try {
            const parsed = JSON.parse(raw) as { type?: string; fields?: string[]; values?: string[] };
            if (parsed.type === 'text' && Array.isArray(parsed.fields)) {
                return {
                    type: 'text',
                    fields: parsed.fields.map((field) => String(field).trim()).filter(Boolean),
                };
            }
            if (parsed.type === 'choice' && Array.isArray(parsed.values)) {
                return {
                    type: 'choice',
                    options: parsed.values.map((value) => String(value).trim()).filter(Boolean),
                };
            }
        } catch {
            // Fall through to legacy comma-separated options.
        }
    }

    return {
        type: 'choice',
        options: raw.split(',').map((opt) => opt.trim()).filter(Boolean),
    };
}

export function serializeChoiceQuestion(options: string[]): string {
    return JSON.stringify({
        type: 'choice',
        values: options.map((opt) => opt.trim()).filter(Boolean),
    });
}

export function readTextAnswerMap(raw: string | undefined): Record<string, string> {
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as Record<string, string>;
        }
    } catch {
        return { response: raw };
    }
    return {};
}

export function writeTextAnswer(
    answers: Record<string, string>,
    questionText: string,
    field: string,
    value: string,
): Record<string, string> {
    const existing = readTextAnswerMap(answers[questionText]);
    existing[field] = value;
    return { ...answers, [questionText]: JSON.stringify(existing) };
}
