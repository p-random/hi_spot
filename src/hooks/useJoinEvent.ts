'use client';

import { useState } from 'react';
import { joinEvent } from '@/lib/api';
import type { JoinEventResponse } from '@/types';

type JoinState = 'idle' | 'loading' | 'success' | 'error';

export function useJoinEvent() {
  const [state, setState] = useState<JoinState>('idle');
  const [result, setResult] = useState<JoinEventResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function join(userId: string, eventId: string, lat: number, lng: number) {
    setState('loading');
    setError(null);
    try {
      const res = await joinEvent({ user_id: userId, event_id: eventId, lat, lng });
      setResult(res);
      setState('success');
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '참여에 실패했습니다.';
      setError(msg);
      setState('error');
      console.log('[join-event error]', msg);
      return null;
    }
  }

  function reset() {
    setState('idle');
    setResult(null);
    setError(null);
  }

  return { state, result, error, join, reset };
}
