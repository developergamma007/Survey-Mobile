import { digitsOnly } from './validation';

export type VoterSuggestion = {
    name_en?: string;
    [key: string]: string | number | null | undefined;
};

export const pickVoterValue = (voter: VoterSuggestion, keys: string[]): string => {
    for (const key of keys) {
        const value = voter[key];
        if (value !== null && value !== undefined) {
            const text = String(value).trim();
            if (text) return text;
        }
    }
    return '';
};

const normalizeOptionValue = (value: string, allowed: string[]): string => {
    if (!value) return '';
    const found = allowed.find((option) => option.toLowerCase() === value.toLowerCase());
    return found ?? '';
};

const normalizeGender = (value: string): string => {
    const v = value.trim().toLowerCase();
    if (v === 'm' || v === 'male') return 'Male';
    if (v === 'f' || v === 'female') return 'Female';
    return normalizeOptionValue(value, ['Male', 'Female', 'Other']);
};

export type VoterFormPatch = {
    interviewerName: string;
    interviewerAge: string;
    interviewerGender: string;
    interviewerCaste: string;
    interviewerCommunity: string;
    interviewerMobile: string;
    interviewerEducation: string;
    interviewerWork: string;
    interviewerCurrentAddress: string;
};

export function buildVoterFormPatch(voter: VoterSuggestion): VoterFormPatch {
    const age = pickVoterValue(voter, ['age', 'voter_age', 'interviewer_age']);
    const gender = normalizeGender(pickVoterValue(voter, ['gender', 'sex', 'interviewer_gender']));
    const caste = normalizeOptionValue(pickVoterValue(voter, ['caste', 'interviewer_caste']), [
        'Brahma', 'Lingayat', 'Vokkaliga', 'Kuruba', 'SC', 'ST', 'OBC', 'Others',
    ]);
    const community = normalizeOptionValue(
        pickVoterValue(voter, ['community', 'religion', 'interviewer_community']),
        ['Hindu', 'Muslim', 'Christian', 'Jain', 'Others'],
    );
    const education = normalizeOptionValue(
        pickVoterValue(voter, ['education', 'qualification', 'interviewer_education', 'highest_qualification']),
        ['Illiterate', 'Primary', 'Secondary', 'Graduate', 'Post-Graduate', 'Others'],
    );
    const mobile = digitsOnly(
        pickVoterValue(voter, ['mobile', 'phone', 'mobile_no', 'voter_mobile', 'interviewer_mobile']),
    );

    const house = pickVoterValue(voter, ['house']);
    const addressParts = [
        pickVoterValue(voter, ['address_en', 'present_address', 'family_address', 'building_address']),
        pickVoterValue(voter, ['address_local']),
        house ? `House ${house}` : '',
    ].filter(Boolean);

    return {
        interviewerName: String(voter.name_en ?? ''),
        interviewerAge: age,
        interviewerGender: gender,
        interviewerCaste: caste,
        interviewerCommunity: community,
        interviewerMobile: mobile,
        interviewerEducation: education,
        interviewerWork: pickVoterValue(voter, ['job_type', 'occupation', 'work']),
        interviewerCurrentAddress: addressParts.join(', '),
    };
}

export function buildVoterSubtitle(voter: VoterSuggestion): string {
    const epic = pickVoterValue(voter, ['epic']);
    const house = pickVoterValue(voter, ['house']);
    const age = pickVoterValue(voter, ['age']);
    const parts = [epic ? `EPIC: ${epic}` : '', house ? `House ${house}` : '', age ? `Age ${age}` : ''].filter(Boolean);
    return parts.join(' · ');
}
