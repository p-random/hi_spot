'use client';

import { useEffect, useRef, useState } from 'react';
import { listActiveEvents } from '@/lib/api';
import { getSupabase } from '@/lib/supabase/client';
import type { Event } from '@/types';

type ActiveEvent = Pick<
  Event,
  'id' | 'title' | 'description' | 'lat' | 'lng' | 'join_radius_m' |
  'max_slots' | 'current_slots' | 'reward_points' | 'recruit_duration_min' | 'activated_at' | 'status'
>;

// ── 더미 이벤트 데이터 (한양대 서울캠퍼스 주변) ──────────────────────────────
const DUMMY_EVENTS: ActiveEvent[] = [
  {
    id: 'demo-evt-001',
    title: '🎤 버스킹 관객 모집',
    description: '학생회관 앞에서 열리는 봄맞이 버스킹! 함께 즐겨요.',
    lat: 37.5572,
    lng: 127.0445,
    join_radius_m: 100,
    max_slots: 30,
    current_slots: 12,
    reward_points: 50,
    recruit_duration_min: 60,
    activated_at: new Date().toISOString(),
    status: 'ACTIVE',
  },
  {
    id: 'demo-evt-002',
    title: '📸 캠퍼스 사진 챌린지',
    description: '봄 캠퍼스의 멋진 사진을 찍어주세요! 인증샷 이벤트입니다.',
    lat: 37.5585,
    lng: 127.0480,
    join_radius_m: 200,
    max_slots: 50,
    current_slots: 23,
    reward_points: 100,
    recruit_duration_min: 120,
    activated_at: new Date().toISOString(),
    status: 'ACTIVE',
  },
  {
    id: 'demo-evt-003',
    title: '🏃 점심시간 플로깅',
    description: '캠퍼스를 깨끗하게! 쓰레기 줍기 달리기에 참여하세요.',
    lat: 37.5565,
    lng: 127.0500,
    join_radius_m: 150,
    max_slots: 20,
    current_slots: 20,
    reward_points: 200,
    recruit_duration_min: 90,
    activated_at: new Date().toISOString(),
    status: 'CLOSED',
  },
  {
    id: 'demo-evt-004',
    title: '☕ 무료 커피 나눔',
    description: '도서관 앞에서 무료 커피를 나눠드립니다!',
    lat: 37.5595,
    lng: 127.0460,
    join_radius_m: 50,
    max_slots: 100,
    current_slots: 67,
    reward_points: 30,
    recruit_duration_min: 30,
    activated_at: new Date().toISOString(),
    status: 'ACTIVE',
  },
  {
    id: 'demo-evt-005',
    title: '🎮 게임 대회 예선',
    description: '다음 주 게임 대회 참가 신청을 받고 있어요.',
    lat: 37.5555,
    lng: 127.0425,
    join_radius_m: 80,
    max_slots: 16,
    current_slots: 8,
    reward_points: 500,
    recruit_duration_min: 180,
    activated_at: new Date().toISOString(),
    status: 'SCHEDULED',
  },
];

export function useEvents() {
  const [events, setEvents] = useState<ActiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // Keep a ref so the Realtime handler always sees the latest list
  const eventsRef = useRef(events);
  eventsRef.current = events;

  async function load() {
    try {
      const { events: data } = await listActiveEvents();
      setEvents(data);
      setError(null);
    } catch (err) {
      console.warn('[useEvents] API 로드 실패, 더미 데이터를 사용합니다.', err);
      // API가 실패하면(CORS 등) 더미 데이터 사용
      setEvents(DUMMY_EVENTS);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const supabase = getSupabase();
    load();

    const channel = supabase
      .channel('events-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events' },
        (payload) => {
          const updated = payload.new as Partial<ActiveEvent> & { id: string };
          setEvents((prev) =>
            prev.map((e) =>
              e.id === updated.id ? { ...e, ...updated } : e
            )
          );
        }
      )
      .subscribe((status) => {
        // On reconnect after a disconnect, re-sync to avoid missed updates
        if (status === 'SUBSCRIBED') {
          load();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { events, loading, error };
}

