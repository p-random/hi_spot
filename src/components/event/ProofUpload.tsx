'use client';

import { useRef } from 'react';
import { useUploadProof } from '@/hooks/useUploadProof';

interface ProofUploadProps {
  participationId: string;
  rewardPoints: number;
  onSuccess: (totalPoints: number) => void;
}

export default function ProofUpload({ participationId, rewardPoints, onSuccess }: ProofUploadProps) {
  const { state, result, error, upload } = useUploadProof();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const res = await upload(participationId, file);
    if (res) onSuccess(res.total_points);
  }

  if (state === 'success' && result) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <span className="text-2xl">🎉</span>
        <p className="font-semibold text-green-600">+{result.points_earned}pt 획득!</p>
        <p className="text-sm text-zinc-500">누적 포인트: {result.total_points}pt</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-zinc-600">
        사진을 업로드하면 <span className="font-semibold text-green-600">{rewardPoints}pt</span>를 즉시 획득합니다.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      <button
        onClick={() => inputRef.current?.click()}
        disabled={state === 'loading'}
        className="w-full rounded-xl bg-green-500 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {state === 'loading' ? '업로드 중...' : '📷 사진 인증하기'}
      </button>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
