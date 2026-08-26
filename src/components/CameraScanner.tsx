import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { ActivityIndicator, Text } from 'react-native-paper';

import { BigButton } from './BigButton';
import { palette, spacing } from '@/theme';

/**
 * Live camera barcode capture.
 *
 * Two behaviours matter at a kiosk. A camera pointed at a shelf will re-read the
 * same barcode dozens of times per second, so reads are debounced per value.
 * And library barcodes are overwhelmingly Codabar and Code 39 — restricting the
 * symbologies cuts false reads from surrounding packaging and QR posters.
 */

/** Symbologies in real use on library cards and item labels. */
const LIBRARY_SYMBOLOGIES = [
  'codabar',
  'code39',
  'code128',
  'code93',
  'ean13',
  'ean8',
  'itf14',
  'upc_a',
  'upc_e',
] as const;

/** Ignore repeats of the same value inside this window. */
const DUPLICATE_WINDOW_MS = 2500;

interface CameraScannerProps {
  onScan: (barcode: string) => void;
  /** Pauses reads while a checkout request is in flight. */
  paused?: boolean;
  label?: string;
  /**
   * `qr` narrows decoding to QR alone and frames a square, which is both what a
   * patron expects to aim at and a guard against the camera picking a stray
   * barcode off nearby packaging.
   */
  mode?: 'barcode' | 'qr';
}

export function CameraScanner({ onScan, paused = false, label, mode = 'barcode' }: CameraScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const lastScan = useRef<{ value: string; at: number } | undefined>(undefined);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const handleScan = useCallback(
    (result: BarcodeScanningResult) => {
      const value = result.data?.trim();
      if (!value || paused) return;

      const previous = lastScan.current;
      const now = Date.now();
      if (previous && previous.value === value && now - previous.at < DUPLICATE_WINDOW_MS) {
        return;
      }
      lastScan.current = { value, at: now };
      onScan(value);
    },
    [onScan, paused],
  );

  if (!permission) {
    return (
      <View style={styles.placeholder} accessibilityRole="progressbar">
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.placeholder}>
        <Text variant="titleMedium" style={styles.placeholderText}>
          {permission.canAskAgain
            ? 'Camera access is needed to scan barcodes.'
            : 'Camera access is blocked. A staff member can enable it in device settings.'}
        </Text>
        {permission.canAskAgain ? (
          <BigButton
            label="Allow camera"
            onPress={() => void requestPermission()}
            style={styles.permissionButton}
          />
        ) : null}
        <Text variant="bodyMedium" style={styles.placeholderHint}>
          You can still type the barcode below.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.frame}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: mode === 'qr' ? ['qr'] : [...LIBRARY_SYMBOLOGIES],
        }}
        onBarcodeScanned={paused ? undefined : handleScan}
      />

      {/* Aiming guide. Purely decorative, so it is hidden from screen readers. */}
      <View style={styles.reticle} pointerEvents="none" accessibilityElementsHidden>
        <View style={mode === 'qr' ? styles.reticleSquare : styles.reticleInner} />
      </View>

      {label ? (
        <View style={styles.labelBar} pointerEvents="none">
          <Text style={styles.labelText}>{label}</Text>
        </View>
      ) : null}

      <View style={styles.torchBar}>
        <BigButton
          label={torch ? 'Light off' : 'Light on'}
          tone="neutral"
          variant="filled"
          onPress={() => setTorch((on) => !on)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    minHeight: 260,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0B1620',
  },
  placeholder: {
    flex: 1,
    minHeight: 260,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primaryContainer,
    gap: spacing.md,
  },
  placeholderText: { textAlign: 'center', color: palette.text },
  placeholderHint: { textAlign: 'center', color: palette.textMuted },
  permissionButton: { maxWidth: 340 },
  reticle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleInner: {
    width: '72%',
    height: '46%',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
  },
  /** A QR code is square, so the guide is too. */
  reticleSquare: {
    aspectRatio: 1,
    height: '72%',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
  },
  labelBar: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(11,22,32,0.72)',
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  labelText: { color: '#FFFFFF', fontSize: 20, fontWeight: '600', textAlign: 'center' },
  torchBar: { position: 'absolute', bottom: spacing.md, right: spacing.md, width: 180 },
});
