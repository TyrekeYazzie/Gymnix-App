import { AppState, AppStateStatus } from 'react-native';
import { useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import supabase from '../lib/supabase';

export default function useSessionTimeout(timeoutMinutes: number = 30): { resetTimer: () => void } {
  const lastActivity = useRef<Date>(new Date());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const resetTimer = (): void => {
    lastActivity.current = new Date();
  };

  const checkTimeout = (): void => {
    const elapsed = Date.now() - lastActivity.current.getTime();
    const timeoutMs = timeoutMinutes * 60 * 1000;
    
    if (elapsed >= timeoutMs) {
      supabase.auth.signOut().then(() => {
        router.replace('/(auth)/login');
      });
    }
  };

  useEffect(() => {
    // Set up timer to check for inactivity every 60 seconds
    timerRef.current = setInterval(checkTimeout, 60000);

    // Set up AppState listener for background/foreground changes
    const appState = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        resetTimer();
        checkTimeout(); // Check immediately when coming to foreground
      }
    });

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      appState.remove();
    };
  }, []);

  return { resetTimer };
}