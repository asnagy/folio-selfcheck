import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { FolioClient } from '@/folio/client';
import type { AuthTokens } from '@/folio/types';

import {
  DEFAULT_SETTINGS,
  type KioskSettings,
  clearTokens,
  isConfigured,
  loadSettings,
  loadTokens,
  saveSettings,
  saveTokens,
} from './settings';

interface SettingsContextValue {
  settings: KioskSettings;
  ready: boolean;
  configured: boolean;
  /** Undefined until a tenant is configured and tokens exist. */
  client?: FolioClient;
  /** True when tokens went stale and staff must sign in again. */
  authLost: boolean;
  update: (patch: Partial<KioskSettings>) => Promise<void>;
  /** Replace the FOLIO session after a successful settings sign-in. */
  adoptSession: (settings: KioskSettings, tokens: AuthTokens) => Promise<void>;
  signOut: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<KioskSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [authLost, setAuthLost] = useState(false);
  /**
   * The tokens a client is *seeded* with, as opposed to the rotated tokens it
   * goes on to hold internally. Only a genuinely new session — first load, a
   * staff sign-in, a sign-out — changes this, so routine token rotation never
   * rebuilds the client and never drops its in-flight refresh guard.
   */
  const [seedTokens, setSeedTokens] = useState<AuthTokens | undefined>();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [storedSettings, storedTokens] = await Promise.all([loadSettings(), loadTokens()]);
      if (cancelled) return;
      setSettings(storedSettings);
      setSeedTokens(storedTokens);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback(async (patch: Partial<KioskSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      void saveSettings(next);
      return next;
    });
  }, []);

  const adoptSession = useCallback(async (next: KioskSettings, nextTokens: AuthTokens) => {
    await Promise.all([saveSettings(next), saveTokens(nextTokens)]);
    setSettings(next);
    setSeedTokens(nextTokens);
    setAuthLost(false);
  }, []);

  const signOut = useCallback(async () => {
    await clearTokens();
    setSeedTokens(undefined);
    setAuthLost(false);
  }, []);

  /**
   * One client instance per tenant/session. Recreating it on every render would
   * drop the in-flight refresh guard and let two scans spend the same rotating
   * refresh token.
   */
  const hasTokens = seedTokens !== undefined;
  const client = useMemo(() => {
    if (!seedTokens || !isConfigured(settings)) return undefined;
    return new FolioClient({
      connection: { baseUrl: settings.baseUrl, tenant: settings.tenant },
      tokens: seedTokens,
      // Rotated tokens are persisted but deliberately not fed back into state:
      // the client already holds them, and re-seeding would rebuild it.
      onTokensChanged: saveTokens,
      onAuthLost: () => setAuthLost(true),
    });
  }, [settings, seedTokens]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      ready,
      configured: isConfigured(settings) && hasTokens,
      client,
      authLost,
      update,
      adoptSession,
      signOut,
    }),
    [settings, ready, hasTokens, client, authLost, update, adoptSession, signOut],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used inside a SettingsProvider');
  return context;
}
