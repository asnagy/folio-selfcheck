import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useSettings } from '@/config/SettingsContext';
import type { Loan, PatronSnapshot } from '@/folio/types';

/**
 * The patron half of kiosk state, and the idle timer that protects it.
 *
 * An unattended kiosk that keeps a patron signed in after they walk away lets
 * the next person borrow on their card. So the session is the only place a
 * patron identity lives, every screen reports activity into it, and it clears
 * itself on inactivity, on backgrounding, and on an explicit finish.
 */

export interface CheckoutRecord {
  loan: Loan;
  title: string;
  barcode: string;
  dueDate?: string;
}

interface SessionContextValue {
  patron?: PatronSnapshot;
  checkouts: CheckoutRecord[];
  renewed: CheckoutRecord[];
  /** Seconds left before auto-reset, or undefined when no session is open. */
  secondsRemaining?: number;
  /** True once the countdown enters the warning window. */
  warning: boolean;
  startSession: (patron: PatronSnapshot) => void;
  updatePatron: (patron: PatronSnapshot) => void;
  addCheckout: (record: CheckoutRecord) => void;
  addRenewal: (record: CheckoutRecord) => void;
  /** Reset the idle countdown. Called on every touch and every scan. */
  reportActivity: () => void;
  endSession: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const [patron, setPatron] = useState<PatronSnapshot | undefined>();
  const [checkouts, setCheckouts] = useState<CheckoutRecord[]>([]);
  const [renewed, setRenewed] = useState<CheckoutRecord[]>([]);
  const [secondsRemaining, setSecondsRemaining] = useState<number | undefined>();

  const deadline = useRef<number | undefined>(undefined);
  const timeoutMs = settings.idleTimeoutSeconds * 1000;

  const clearAll = useCallback(() => {
    deadline.current = undefined;
    setPatron(undefined);
    setCheckouts([]);
    setRenewed([]);
    setSecondsRemaining(undefined);
  }, []);

  const reportActivity = useCallback(() => {
    if (deadline.current === undefined) return;
    deadline.current = Date.now() + timeoutMs;
    setSecondsRemaining(settings.idleTimeoutSeconds);
  }, [timeoutMs, settings.idleTimeoutSeconds]);

  const startSession = useCallback(
    (next: PatronSnapshot) => {
      setPatron(next);
      setCheckouts([]);
      setRenewed([]);
      deadline.current = Date.now() + timeoutMs;
      setSecondsRemaining(settings.idleTimeoutSeconds);
    },
    [timeoutMs, settings.idleTimeoutSeconds],
  );

  /**
   * Drive the countdown from a wall-clock deadline rather than by decrementing.
   * A tablet that throttles timers while dimmed would otherwise under-count and
   * leave a patron signed in far longer than configured.
   */
  useEffect(() => {
    if (patron === undefined) return;
    const tick = setInterval(() => {
      if (deadline.current === undefined) return;
      const remaining = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining === 0) clearAll();
    }, 500);
    return () => clearInterval(tick);
  }, [patron, clearAll]);

  /** Backgrounding the app means the patron has left the tablet. */
  useEffect(() => {
    const handler = (state: AppStateStatus) => {
      if (state !== 'active' && deadline.current !== undefined) clearAll();
    };
    const subscription = AppState.addEventListener('change', handler);
    return () => subscription.remove();
  }, [clearAll]);

  const value = useMemo<SessionContextValue>(
    () => ({
      patron,
      checkouts,
      renewed,
      secondsRemaining,
      warning:
        secondsRemaining !== undefined &&
        patron !== undefined &&
        secondsRemaining <= settings.idleWarningSeconds,
      startSession,
      updatePatron: setPatron,
      addCheckout: (record) => setCheckouts((current) => [record, ...current]),
      addRenewal: (record) => setRenewed((current) => [record, ...current]),
      reportActivity,
      endSession: clearAll,
    }),
    [
      patron,
      checkouts,
      renewed,
      secondsRemaining,
      settings.idleWarningSeconds,
      startSession,
      reportActivity,
      clearAll,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside a SessionProvider');
  return context;
}
