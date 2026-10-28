import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOnboardingStatus } from '../services/profile';
import { parsePagbankOnboardingStatus } from '../utils/pagbankOnboarding';

const UNKNOWN = { connected: null, loading: false, error: false };

export function usePagbankOnboarding(enabled) {
  const [status, setStatus] = useState(UNKNOWN);
  const mounted = useRef(false);
  const generation = useRef(0);
  const active = useRef(enabled);
  active.current = enabled;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current += 1;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!active.current || !mounted.current) return null;
    const request = ++generation.current;
    setStatus({ connected: null, loading: true, error: false });
    try {
      const owner = await AsyncStorage.getItem('userId');
      if (!mounted.current || request !== generation.current) return null;
      if (!owner) throw new Error('Missing account');
      const result = parsePagbankOnboardingStatus(await getOnboardingStatus());
      const currentOwner = await AsyncStorage.getItem('userId');
      if (!mounted.current || request !== generation.current) return null;
      if (owner !== currentOwner) {
        setStatus(UNKNOWN);
        return null;
      }
      if (!result) throw new Error('Unverified connection');
      setStatus({ ...result, loading: false, error: false });
      return result;
    } catch {
      if (mounted.current && request === generation.current) {
        setStatus({ connected: null, loading: false, error: true });
      }
      return null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      generation.current += 1;
      setStatus(UNKNOWN);
      return undefined;
    }
    refresh();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => {
      generation.current += 1;
      subscription.remove();
    };
  }, [enabled, refresh]);

  return { ...status, refresh };
}
