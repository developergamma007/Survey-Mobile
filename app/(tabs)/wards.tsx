import { useEffect } from 'react';
import { useRouter } from 'expo-router';

/** @deprecated Use /admin?tab=questions */
export default function WardsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin?tab=questions');
  }, [router]);
  return null;
}
