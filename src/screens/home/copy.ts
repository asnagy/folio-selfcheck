import type { IdMethod } from '@/config/settings';

/**
 * Every fixed string on the home screen.
 *
 * The design brief requires that copy be config-driven or a constant in one
 * place, so a library can reword or retranslate the attract screen without
 * hunting through JSX.
 */

export const HOME_COPY = {
  headline: 'Check Out Here',
  primaryAction: 'Check Out',
  account: { title: 'My account', subtitle: 'Due dates, renewals, fines' },
  register: { title: 'Get a card', subtitle: 'New here? Takes a minute' },
  settingsLabel: 'Staff settings',
  /** Shown when no branding has been configured yet. */
  fallbackInstitution: 'Library Self Check Out',
  unconfigured: {
    message: 'This station is not set up yet.',
    detail: 'A staff member can finish setup from the settings icon below.',
  },
  authLost: {
    message: 'This station has lost its connection to the library system.',
    detail: 'A staff member needs to sign in again from Settings.',
  },
} as const;

/**
 * The identification hint, one variant per station.
 *
 * `lead` and `tail` sit either side of `noun`, which the design renders bold in
 * navy. Splitting the sentence this way keeps the emphasis declarative rather
 * than requiring markup parsing at render time.
 */
export interface IdHintCopy {
  lead: string;
  noun: string;
  tail: string;
}

export const ID_HINTS: Record<IdMethod, IdHintCopy> = {
  barcode: { lead: 'Have your ', noun: 'library card', tail: ' ready.' },
  qr: {
    lead: 'Open the ',
    noun: 'library app',
    tail: ' on your phone — the camera reads your QR code.',
  },
  magstripe: {
    lead: 'Swipe your ',
    noun: 'student ID',
    tail: ' through the reader below the screen.',
  },
};

/** Prompts on the patron sign-in screen, which follows the same method. */
export const SIGN_IN_COPY: Record<IdMethod, { title: string; subtitle: string; field: string }> = {
  barcode: {
    title: 'Scan your library card',
    subtitle: 'Hold the barcode on your card up to the camera, or type the number below',
    field: 'Or type your card number',
  },
  qr: {
    title: 'Show your QR code',
    subtitle: 'Open the library app on your phone and hold the QR code up to the camera',
    field: 'Or type your card number',
  },
  magstripe: {
    title: 'Swipe your student ID',
    subtitle: 'Slide your card through the reader below the screen',
    field: 'Or type your card number',
  },
};
