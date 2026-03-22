'use client';

import { useEffect } from 'react';
import { getFCMToken } from '@/lib/firebase';
import { getSupabase } from '@/lib/supabase/client';

/** Obtains an FCM token and persists it to the users table. */
export function useFCMToken(userId: string) {
  useEffect(() => {
    if (!userId) return;

    getFCMToken().then(async (token) => {
      if (!token) return;
      await getSupabase()
        .from('users')
        .update({ fcm_token: token })
        .eq('id', userId);
    });
  }, [userId]);
}
