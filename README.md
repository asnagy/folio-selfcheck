# FOLIO Self Check Out

A tablet kiosk that lets library patrons borrow items themselves, backed by
[FOLIO LSP](https://folio.org). Built with Expo and React Native, designed for a
wall-mounted or stand-mounted tablet in a public area.

Patrons scan their library card with the device camera, scan the items they want,
and leave. Staff configure the station behind a PIN.

## What it does

- **Camera barcode scanning** for both library cards and items, restricted to the
  symbologies libraries actually use (Codabar, Code 39/93/128, EAN, UPC, ITF-14).
- **Hardware scanner support** — a USB or Bluetooth wedge scanner types into the
  manual entry field and its Enter key submits. The field is not auto-focused,
  because the soft keyboard would cover the camera viewfinder, so a wedge-only
  deployment needs one tap on the field to begin.
- **Optional patron PIN** via `mod-patron-pin`, with a large on-screen keypad.
- **Account view** showing loans, due dates, overdue items, fees and blocks.
- **One-tap renewals** through `/circulation/renew-by-barcode`.
- **Self-registration** producing an active, group-assigned, barcoded card.
- **Idle timeout** that clears the patron's session automatically, with a warning
  dialog first.
- **Staff settings** behind a PIN gate, with connection verification.

## Requirements

- FOLIO on **Eureka (Kong + Keycloak)** or classic Okapi. The app detects which
  auth flow the tenant supports at configuration time and uses the right one.
- A FOLIO service account (see permissions below).
- A service point representing the kiosk's location.
- iPadOS 15+ or Android 8+, landscape, with a rear camera.

## Setting up FOLIO

### 1. Create a service point

Settings → Tenant → Service points. Create one for the kiosk, e.g.
"Self Check — First Floor". Note the UUID from the URL:

```
https://your-folio/settings/tenant-settings/servicePoints/<SERVICE_POINT_ID>
```

You need the **ID**, not the name or code.

### 2. Create a service account

Create a dedicated FOLIO user for the kiosk. Do not reuse a staff account — this
credential lives on a tablet in a public space, and a dedicated account can be
revoked without disrupting anyone.

Assign only these permissions:

| Capability | Permission | Needed for |
|---|---|---|
| Look up patrons | `users.collection.get` | Finding a card by barcode |
| Read loans | `circulation.loans.collection.get` | Account screen |
| Check out | `circulation.check-out-by-barcode.post` | Borrowing |
| End session | `circulation.end-patron-action-session.post` | Triggering the receipt notice |
| Read service points | `inventory-storage.service-points.item.get` | Verifying configuration |

Optional, depending on which features you enable:

| Capability | Permission | Feature |
|---|---|---|
| Renew | `circulation.renew-by-barcode.post` | Renewals |
| Read fees | `accounts.collection.get` | Fees and fines display |
| Read blocks | `automated-patron-blocks.collection.get`, `manualblocks.collection.get` | Block messages |
| Verify PIN | `patron-pin.verify.post` | Patron PIN |
| Create users | `users.item.post` | Self-registration |
| Read groups | `usergroups.collection.get` | Self-registration |

The app degrades gracefully when an optional permission is missing: fees and
blocks fall back to empty rather than blocking a checkout.

### 3. Configure the station

On first launch, tap the gear icon. Because no staff PIN exists yet, it opens
directly. Enter:

- **Gateway URL** — Kong's URL on Eureka, Okapi's on classic. No trailing slash.
- **Tenant** — your tenant ID.
- **Service point ID** — the UUID from step 1.
- **Service account username and password.**

Tap **Connect and verify**. This signs in, confirms the service point exists, and
loads patron groups. Then set a **staff PIN** before leaving the station, or
anyone can reopen these settings.

## Security model

This is a credentialed device in a public space, so the design is deliberate:

- **The service account password is never stored.** It is exchanged once for
  tokens and discarded. Only tokens reach the keystore, and they can be revoked
  in FOLIO without touching the password. A test asserts no stored value
  contains a password.
- **Tokens live in `expo-secure-store`** — iOS Keychain, Android Keystore — not
  in app-readable storage.
- **Access tokens refresh automatically** ahead of expiry, with rotated refresh
  tokens persisted atomically and concurrent refreshes collapsed onto one
  request so a rotating token is never spent twice.
- **The staff PIN is stored as a salted SHA-256 hash**, with a lockout after
  five wrong attempts.
- **Patron barcodes are escaped before entering CQL**, so a card barcode
  containing `*` or `"` cannot widen a query.
- **Patron identity lives only in session state**, never in navigation params,
  so clearing the session genuinely removes it.
- **FOLIO's error text never reaches the screen verbatim.** Every failure is
  classified into a patron-facing instruction; raw text is kept for diagnostics.

The residual risk is a physically stolen or rooted tablet, which yields a
revocable refresh token. Enable device encryption and remote wipe through your
MDM, and give each kiosk its own service account so one can be revoked alone.

## Deploying to tablets

```bash
npm install
npx expo prebuild            # generate native projects
npx expo run:ios             # or run:android, on a connected device
```

For distribution, build with [EAS](https://docs.expo.dev/build/introduction/):

```bash
npx eas build --platform ios --profile production
```

Set `extra.eas.projectId` in `app.json` to your own EAS project first.

### Locking the tablet down

The app keeps the screen awake and locks to landscape, but the OS must stop
patrons leaving it:

- **iPadOS** — Guided Access (Settings → Accessibility) for a single device, or
  Single App Mode via an MDM such as Jamf or Mosyle for a fleet.
- **Android** — screen pinning for a single device, or a device-owner kiosk
  policy via an EMM for a fleet.

Also disable auto-lock, disable notifications, and set the device to charge
continuously.

## Running in a browser

The app also builds for the web, which is the quickest way to click through the
screens and test against a real FOLIO tenant without touching a tablet.

```bash
git clone https://github.com/asnagy/folio-selfcheck
cd folio-selfcheck
git checkout claude/library-checkout-kiosk-qqyu5o
npm install
npm run web
```

Then open <http://localhost:8081>. No Xcode, Android Studio or device needed —
just Node 20+.

**Use Chrome or Edge.** Camera barcode scanning on the web goes through the
browser's [Barcode Detection API](https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API),
which Safari and Firefox do not implement. In those browsers the camera panel
still appears but never reads a code; type barcodes into the manual field
instead, which exercises the same code path.

On first launch the station is unconfigured, so the checkout buttons are
disabled. Tap the gear icon — with no staff PIN set yet it opens Settings
directly — and fill in your gateway URL, tenant, service point ID and service
account. `localhost` counts as a secure origin, so the browser will grant camera
access without HTTPS.

### The web build is for development only

> On native, secrets live in the iOS Keychain or Android Keystore. There is no
> equivalent in a browser, so the web build falls back to `localStorage`, which
> any script on the origin can read and anyone can inspect through developer
> tools. That is the exact weakness that made the original web prototype
> unsuitable for a public kiosk.
>
> Use the web build for development, review and demos. Ship the native build to
> tablets that patrons actually touch.

Two other differences on web: the orientation lock and the wake lock are
best-effort, because browsers refuse both outside fullscreen. Neither prevents
the app from starting.

## Development

```bash
npm start          # Expo dev server, choose a platform
npm run web        # browser only
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm test           # jest
npm run check      # all three
```

On an iOS simulator or Android emulator there is no camera; use the manual
barcode field, which follows the same code path as a scan.

## Project layout

```
src/
  folio/       FOLIO integration: auth, HTTP client, circulation API, error mapping
  config/      Kiosk settings and secure storage
  session/     Patron session state and the idle timeout
  components/  Shared touch-first UI (scanner, keypad, buttons, notices)
  screens/     One file per screen
  navigation/  Stack navigator and route types
  utils/       Date, currency and name formatting
```

The FOLIO layer has no React dependency, so it can be tested directly and
repointed at a proxy later without touching any screen.

## Accessibility

Buttons are at least 72pt tall — above both the 44pt iOS and 48dp Android
guidance — because patrons use these standing up, sometimes without their
reading glasses. Body text starts at 18pt and headings at 26pt. Colours hold a
4.5:1 contrast ratio against their backgrounds. Status messages are announced to
screen readers via live regions, and decorative elements are hidden from them.

## Licence

See [LICENSE](LICENSE).
