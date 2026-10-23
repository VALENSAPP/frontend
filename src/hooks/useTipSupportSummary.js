import { useCallback, useEffect, useRef, useState } from 'react';
import { tipRecived } from '../services/wallet';
import { getTipSupportAmount } from '../utils/tipSupportSummary';

export function useTipSupportSummary(userId) {
  const [amount, setAmount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const requestRef = useRef(0);

  useEffect(() => {
    requestRef.current++;
    setAmount(null);
    setLoading(false);
    setError(false);
    return () => { requestRef.current++; };
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!userId) return false;
    const request = ++requestRef.current;
    setLoading(true);
    setError(false);
    try {
      const response = await tipRecived({ userId });
      const total = getTipSupportAmount(response);
      if (total == null) throw new Error('Invalid support total');
      if (request !== requestRef.current) return false;
      setAmount(total);
      return true;
    } catch (e) {
      // A summary refresh failure must not turn a confirmed payment into a
      // failure, or replace the last known total with a fabricated zero.
      if (request === requestRef.current) setError(true);
      return false;
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [userId]);

  return { amount, loading, error, refresh };
}
