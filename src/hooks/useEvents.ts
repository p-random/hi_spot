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
