'use client';

import { useEffect, useState } from 'react';
import { checkGeofence } from '@/lib/api';
import { useJoinEvent } from '@/hooks/useJoinEvent';
import ProofUpload from '@/components/event/ProofUpload';
import type { Event, EventStatus } from '@/types';

interface EventDetailPanelProps {
  event: Pick<Event, 'id' | 'title' | 'description' | 'lat' | 'lng' | 'join_radius_m' | 'max_slots' | 'current_slots' | 'reward_points' | 'status'>;
  userId: string;
  userLat: number | null;
  userLng: number | null;
  onClose: () => void;
}

const STATUS_LABEL: Record<EventStatus, string> = {
  ACTIVE: '모집 중',
  CLOSED: '마감',
  SCHEDULED: '예정',
};

type GeofenceState = 'checking' | 'inside' | 'outside' | 'unknown';

export default function EventDetailPanel({ event, userId, userLat, userLng, onClose }: EventDetailPanelProps) {
  const [geofence, setGeofence] = useState<GeofenceState>('checking');
  const [distanceM, setDistanceM] = useState<number | null>(null);
  const { state: joinState, result: joinResult, error: joinError, join } = useJoinEvent();

  // Check geofence when panel opens
  useEffect(() => {
    if (userLat == null || userLng == null) {
      setGeofence('unknown');
      return;
    }
    setGeofence('checking');
    checkGeofence({ user_id: userId, event_id: event.id, lat: userLat, lng: userLng })
      .then((res) => {
        setDistanceM(res.distance_m);
        setGeofence(res.within_radius ? 'inside' : 'outside');
      })
      .catch(() => setGeofence('unknown'));
  }, [event.id, userId, userLat, userLng]);

  async function handleJoin() {
    if (userLat == null || userLng == null) return;
    await join(userId, event.id, userLat, userLng);
  }

  const isClosed = event.status === 'CLOSED' || event.current_slots >= event.max_slots;
  const alreadyJoined = joinState === 'success';
  const showProofUpload = alreadyJoined && joinResult != null;

  function joinButtonLabel() {
    if (isClosed) return '마감된 이벤트';
    if (alreadyJoined) return '참여 완료';
    if (geofence === 'checking') return '위치 확인 중...';
    if (geofence === 'outside') return `거리 초과 (${distanceM != null ? Math.round(distanceM) + 'm' : ''})`;
    if (geofence === 'unknown') return '위치 정보 없음';
    if (joinState === 'loading') return '참여 중...';
    return '참여하기';
  }

  const joinDisabled =
    isClosed ||
    alreadyJoined ||
    geofence !== 'inside' ||
    joinState === 'loading';

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={onClose} />

      {/* Panel: bottom sheet on mobile, side panel on desktop */}
      <div className="
        fixed z-50 bg-white dark:bg-zinc-900 shadow-xl
        bottom-0 left-0 right-0 rounded-t-2xl max-h-[80vh] overflow-y-auto
        md:bottom-auto md:top-0 md:right-0 md:left-auto md:h-full md:w-96 md:rounded-none
      ">
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="h-1 w-10 rounded-full bg-zinc-300" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full text-white ${event.status === 'ACTIVE' ? 'bg-green-500' : 'bg-zinc-400'}`}>
            {STATUS_LABEL[event.status]}
          </span>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 text-xl leading-none">×</button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{event.title}</h2>
            {event.description && (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{event.description}</p>
            )}
          </div>

          <div className="flex gap-4 text-sm">
            <div className="flex flex-col">
              <span className="text-xs text-zinc-400">참여 현황</span>
              <span className="font-semibold">{event.current_slots} / {event.max_slots}명</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-zinc-400">포인트</span>
              <span className="font-semibold text-green-600">🎁 {event.reward_points}pt</span>
            </div>
          </div>

          {showProofUpload ? (
            <ProofUpload
              participationId={joinResult.participation_id}
              rewardPoints={event.reward_points}
              onSuccess={(totalPoints) => console.log('[proof success] total_points:', totalPoints)}
            />
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleJoin}
                disabled={joinDisabled}
                className="w-full rounded-xl bg-green-500 py-3 text-sm font-semibold text-white disabled:bg-zinc-300 disabled:text-zinc-500 disabled:cursor-not-allowed transition-colors"
              >
                {joinButtonLabel()}
              </button>
              {joinError && <p className="text-xs text-red-500">{joinError}</p>}
              {geofence === 'outside' && distanceM != null && (
                <p className="text-xs text-zinc-400 text-center">
                  이벤트 반경까지 약 {Math.round(distanceM - event.join_radius_m)}m 더 이동하세요.
                </p>
              )}
              {geofence === 'unknown' && (
                <p className="text-xs text-zinc-400 text-center">위치 권한을 허용하면 참여할 수 있습니다.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
