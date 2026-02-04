import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface EditorInfo {
  userId: string;
  email: string;
  startedAt: string;
}

interface UseResourceEditLockOptions {
  resourceType: 'content' | 'healing';
  resourceId: string | undefined;
  enabled?: boolean;
}

interface UseResourceEditLockResult {
  isLocked: boolean;
  lockedBy: EditorInfo | null;
  isLoading: boolean;
  acquireLock: () => Promise<boolean>;
  releaseLock: () => void;
}

export const useResourceEditLock = ({
  resourceType,
  resourceId,
  enabled = true,
}: UseResourceEditLockOptions): UseResourceEditLockResult => {
  const [isLocked, setIsLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState<EditorInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user info
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getUser();
  }, []);

  // Set up presence channel
  useEffect(() => {
    if (!enabled || !resourceId || !currentUserId) {
      setIsLoading(false);
      return;
    }

    const channelName = `edit-lock:${resourceType}:${resourceId}`;
    const newChannel = supabase.channel(channelName);

    newChannel
      .on('presence', { event: 'sync' }, () => {
        const state = newChannel.presenceState();
        const editors: EditorInfo[] = [];
        
        Object.values(state).forEach((presences) => {
          presences.forEach((p: unknown) => {
            const presence = p as Record<string, unknown>;
            if (presence.userId && presence.email && presence.startedAt) {
              editors.push({
                userId: presence.userId as string,
                email: presence.email as string,
                startedAt: presence.startedAt as string,
              });
            }
          });
        });
        
        // Find if there's another user editing (not the current user)
        const otherEditor = editors.find(e => e.userId !== currentUserId);
        
        if (otherEditor) {
          setIsLocked(true);
          setLockedBy(otherEditor);
        } else {
          setIsLocked(false);
          setLockedBy(null);
        }
        setIsLoading(false);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        const presences = newPresences as unknown as Record<string, unknown>[];
        const otherEditor = presences.find(
          p => p.userId && p.userId !== currentUserId
        );
        if (otherEditor) {
          setIsLocked(true);
          setLockedBy({
            userId: otherEditor.userId as string,
            email: otherEditor.email as string,
            startedAt: otherEditor.startedAt as string,
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const presences = leftPresences as unknown as Record<string, unknown>[];
        const leftEditor = presences.find(
          p => p.userId && p.userId !== currentUserId
        );
        if (leftEditor && lockedBy?.userId === leftEditor.userId) {
          setIsLocked(false);
          setLockedBy(null);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsLoading(false);
        }
      });

    setChannel(newChannel);

    return () => {
      newChannel.unsubscribe();
    };
  }, [resourceType, resourceId, currentUserId, enabled]);

  const acquireLock = useCallback(async (): Promise<boolean> => {
    if (!channel || !currentUserId) return false;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if someone else already has the lock
    const state = channel.presenceState();
    const editors: EditorInfo[] = [];
    
    Object.values(state).forEach((presences) => {
      presences.forEach((p: unknown) => {
        const presence = p as Record<string, unknown>;
        if (presence.userId && presence.email && presence.startedAt) {
          editors.push({
            userId: presence.userId as string,
            email: presence.email as string,
            startedAt: presence.startedAt as string,
          });
        }
      });
    });
    
    const otherEditor = editors.find(e => e.userId !== currentUserId);

    if (otherEditor) {
      setIsLocked(true);
      setLockedBy(otherEditor);
      return false;
    }

    // Track our presence
    await channel.track({
      userId: user.id,
      email: user.email || 'Unknown',
      startedAt: new Date().toISOString(),
    });

    return true;
  }, [channel, currentUserId]);

  const releaseLock = useCallback(() => {
    if (channel) {
      channel.untrack();
    }
  }, [channel]);

  // Release lock on unmount
  useEffect(() => {
    return () => {
      if (channel) {
        channel.untrack();
      }
    };
  }, [channel]);

  return {
    isLocked,
    lockedBy,
    isLoading,
    acquireLock,
    releaseLock,
  };
};
