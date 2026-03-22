'use client';

import { useState } from 'react';
import { uploadProof } from '@/lib/api';
import type { UploadProofResponse } from '@/types';

type UploadState = 'idle' | 'loading' | 'success' | 'error';

export function useUploadProof() {
  const [state, setState] = useState<UploadState>('idle');
  const [result, setResult] = useState<UploadProofResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(participationId: string, file: File) {
    setState('loading');
    setError(null);
    try {
      const res = await uploadProof(participationId, file);
      setResult(res);
      setState('success');
      console.log('[upload-proof success] points_earned:', res.points_earned);
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '업로드에 실패했습니다.';
      setError(msg);
      setState('error');
      console.log('[upload-proof error]', msg);
      return null;
    }
  }

  return { state, result, error, upload };
}
