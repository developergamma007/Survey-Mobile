const RESPONSES_ADMIN_USERNAME = 'admin@iswot.io';

export function isResponsesAdmin(username: string | null | undefined): boolean {
  if (!username) return false;
  return username.trim().toLowerCase() === RESPONSES_ADMIN_USERNAME;
}
