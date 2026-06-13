import { useEffect } from 'react';
import { useRouter } from 'expo-router';

/** @deprecated Use /admin?tab=list */
export default function ResponsesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin?tab=list');
  }, [router]);
  return null;
}
