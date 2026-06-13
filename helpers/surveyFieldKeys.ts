import { resolveOthersValue, isOthersSelection } from './validation';

export type FormPayloadInput = {
    assembly: string;
    gbaWard: string;
    pollingStationName: string;
    pollingStationNumber: string;
    surveyorName: string;
    surveyorMobile: string;
    interviewerName: string;
    interviewerAge: string;
    interviewerGender: string;
    interviewerCaste: string;
    interviewerCommunity: string;
    interviewerMobile: string;
    interviewerEducation: string;
    interviewerWork: string;
    interviewerHouseholdIncome: string;
    interviewerCurrentAddress: string;
    voterOfConstituency: string;
    dynamicAnswers: Record<string, string>;
    surveyStartedAt?: string | null;
    surveyEndedAt?: string | null;
};

const SURVEY_META_KEYS = {
    startedAt: '_surveyStartedAt',
    endedAt: '_surveyEndedAt',
} as const;

function resolveOthersInAnswers(answers: Record<string, string>): Record<string, string> {
    const resolved: Record<string, string> = {};
    for (const [key, value] of Object.entries(answers)) {
        if (!value || key.endsWith('__other')) continue;
        resolved[key] = isOthersSelection(value)
            ? resolveOthersValue(value, answers[`${key}__other`] || '')
            : value;
    }
    return resolved;
}

export function buildStructuredDynamicAnswers(input: FormPayloadInput): Record<string, string> {
    const merged: Record<string, string> = {};
    const resolvedAnswers = resolveOthersInAnswers(input.dynamicAnswers);
    for (const [key, value] of Object.entries(resolvedAnswers)) {
        if (value) merged[key] = value;
    }

    const staticMap: Record<string, string> = {
        team_code: input.surveyorMobile,
        voter_of_constituency: input.voterOfConstituency || input.assembly,
        village: input.gbaWard,
        name: input.interviewerName,
        mobile: input.interviewerMobile,
        gender: input.interviewerGender,
        age: input.interviewerAge,
        highest_qualification: input.interviewerEducation,
        religion: input.interviewerCommunity,
        caste_list: input.interviewerCaste,
        job_type: input.interviewerWork,
        household_income: input.interviewerHouseholdIncome,
        current_address: input.interviewerCurrentAddress,
        polling_station: [input.pollingStationName, input.pollingStationNumber].filter(Boolean).join(' / '),
        au_name: input.surveyorName,
    };

    for (const [key, value] of Object.entries(staticMap)) {
        if (value) merged[key] = value;
    }

    if (input.surveyStartedAt) merged[SURVEY_META_KEYS.startedAt] = input.surveyStartedAt;
    if (input.surveyEndedAt) merged[SURVEY_META_KEYS.endedAt] = input.surveyEndedAt;

    return merged;
}
