import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { IconButton, TouchableRipple } from 'react-native-paper';

import { BigButton } from '@/components/BigButton';
import { Notice } from '@/components/Notice';
import { useSettings } from '@/config/SettingsContext';
import type { RootStackParamList } from '@/navigation/types';
import { useSession } from '@/session/SessionContext';
import { useLayout } from '@/utils/useLayout';
import { HERO_SCRIM, kiosk, palette } from '@/theme';

import { IdGlyph } from './home/IdGlyph';
import { HOME_COPY, ID_HINTS } from './home/copy';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

/**
 * The attract screen.
 *
 * Built to read from across a room and resolve to one obvious action: a branded
 * photographic hero, a single instruction telling the patron what to have
 * ready, then one large button. Everything else is secondary and quieter.
 *
 * This screen renders its own chrome rather than using `Screen`, because the
 * hero is full-bleed to the device edges — `Screen`'s padded header and body
 * exist precisely to prevent that.
 */
export function HomeScreen({ navigation }: Props) {
  const { settings, configured, authLost } = useSettings();
  const { reportActivity } = useSession();
  const { isPortrait, height } = useLayout();

  /**
   * The hero is specified at 456pt for a portrait iPad. Landscape is far
   * shorter overall, so it takes a proportional share instead — the same
   * adapt-don't-hardcode approach the checkout screen already uses.
   */
  const heroHeight = isPortrait
    ? kiosk.heroHeight
    : Math.round(Math.min(kiosk.heroHeight, Math.max(220, height * 0.38)));

  const hint = ID_HINTS[settings.idMethod];
  const institution = settings.institutionName.trim() || HOME_COPY.fallbackInstitution;

  return (
    <View style={styles.root} onStartShouldSetResponderCapture={() => (reportActivity(), false)}>
      <View style={[styles.hero, { height: heroHeight }]}>
        {settings.heroImageUrl.trim() ? (
          <Image
            source={{ uri: settings.heroImageUrl.trim() }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : null}

        {/* Keeps hero text legible whatever photograph a library supplies. */}
        <LinearGradient
          colors={[...HERO_SCRIM.colors]}
          locations={[...HERO_SCRIM.locations]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <SafeAreaView style={styles.heroSafe} edges={['top', 'left', 'right']}>
          <View style={styles.lockup}>
            <View style={styles.logoSlot}>
              {settings.logoUrl.trim() ? (
                <Image
                  source={{ uri: settings.logoUrl.trim() }}
                  style={styles.logo}
                  resizeMode="contain"
                  accessibilityIgnoresInvertColors
                />
              ) : null}
            </View>
            <View style={styles.lockupText}>
              <Text style={styles.institution} numberOfLines={2}>
                {institution}
              </Text>
              {settings.stationName.trim() ? (
                <Text style={styles.station} numberOfLines={1}>
                  {settings.stationName.trim()}
                </Text>
              ) : null}
            </View>
          </View>
        </SafeAreaView>

        <View style={styles.headlineWrap} pointerEvents="none">
          <Text style={styles.headline} accessibilityRole="header">
            {HOME_COPY.headline}
          </Text>
        </View>
      </View>

      <SafeAreaView style={styles.actionSafe} edges={['bottom', 'left', 'right']}>
        <ScrollView
          style={styles.action}
          contentContainerStyle={styles.actionContent}
          keyboardShouldPersistTaps="handled"
        >
          {authLost ? (
            <Notice tone="error" message={HOME_COPY.authLost.message} detail={HOME_COPY.authLost.detail} />
          ) : null}
          {!configured ? (
            <Notice
              tone="warning"
              message={HOME_COPY.unconfigured.message}
              detail={HOME_COPY.unconfigured.detail}
            />
          ) : null}

          <View style={styles.hintRow}>
            <IdGlyph method={settings.idMethod} />
            <Text style={styles.hintText}>
              {hint.lead}
              <Text style={styles.hintNoun}>{hint.noun}</Text>
              {hint.tail}
            </Text>
          </View>

          <BigButton
            label={HOME_COPY.primaryAction}
            display
            disabled={!configured}
            onPress={() => navigation.navigate('PatronSignIn', { next: 'Checkout' })}
          />

          <View style={styles.cardRow}>
            <SecondaryCard
              title={HOME_COPY.account.title}
              subtitle={HOME_COPY.account.subtitle}
              disabled={!configured}
              onPress={() => navigation.navigate('PatronSignIn', { next: 'Account' })}
            />
            {settings.allowSelfRegistration ? (
              <SecondaryCard
                title={HOME_COPY.register.title}
                subtitle={HOME_COPY.register.subtitle}
                disabled={!configured}
                onPress={() => navigation.navigate('Register')}
              />
            ) : null}
          </View>

          <View style={styles.spacer} />

          <View style={styles.footer}>
            <View style={styles.footerText}>
              {settings.helpDeskLocation.trim() ? (
                <Text style={styles.helpTitle} numberOfLines={1}>
                  {settings.helpDeskLocation.trim()}
                </Text>
              ) : null}
              {settings.helpDeskHours.trim() ? (
                <Text style={styles.helpHours} numberOfLines={2}>
                  {settings.helpDeskHours.trim()}
                </Text>
              ) : null}
            </View>
            <IconButton
              icon="cog-outline"
              size={30}
              iconColor={palette.iconIdle}
              onPress={() => navigation.navigate('AdminPin')}
              accessibilityLabel={HOME_COPY.settingsLabel}
              style={styles.gear}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function SecondaryCard({
  title,
  subtitle,
  onPress,
  disabled,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableRipple
      onPress={onPress}
      disabled={disabled}
      style={[styles.card, disabled && styles.cardDisabled]}
      rippleColor={palette.pressedFill}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      accessibilityState={{ disabled: Boolean(disabled) }}
    >
      <View>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.cardSubtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.surface },

  hero: { backgroundColor: palette.navy, flexShrink: 0, overflow: 'hidden' },
  heroSafe: { position: 'absolute', top: 0, left: 0, right: 0 },
  lockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: kiosk.heroTopInset,
    marginHorizontal: kiosk.heroInset,
  },
  logoSlot: {
    width: kiosk.logoSize,
    height: kiosk.logoSize,
    borderRadius: kiosk.radiusSmall,
    backgroundColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
    flexShrink: 0,
  },
  logo: { width: '100%', height: '100%' },
  lockupText: { flex: 1 },
  institution: { fontSize: 26, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.26 },
  station: { fontSize: 19, fontWeight: '500', color: 'rgba(255,255,255,0.82)' },
  headlineWrap: {
    position: 'absolute',
    bottom: kiosk.heroInset,
    left: kiosk.heroInset,
    right: kiosk.heroInset,
  },
  headline: {
    fontSize: 64,
    lineHeight: 65,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1.28,
  },

  actionSafe: { flex: 1 },
  action: { flex: 1 },
  actionContent: {
    flexGrow: 1,
    paddingHorizontal: kiosk.heroInset,
    paddingTop: kiosk.actionPaddingTop,
    gap: 16,
  },

  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingBottom: 6 },
  hintText: { flex: 1, fontSize: 24, lineHeight: 31, fontWeight: '500', color: palette.body },
  hintNoun: { fontWeight: '700', color: palette.navy },

  cardRow: { flexDirection: 'row', gap: 16 },
  card: {
    flex: 1,
    height: kiosk.cardHeight,
    borderRadius: kiosk.radiusLarge,
    borderWidth: 2,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: kiosk.cardPaddingH,
    justifyContent: 'center',
  },
  cardDisabled: { opacity: 0.38 },
  cardTitle: { fontSize: 24, fontWeight: '600', color: palette.navy },
  cardSubtitle: { fontSize: 18, fontWeight: '400', color: palette.textMuted },

  spacer: { flex: 1, minHeight: 8 },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
    borderTopWidth: 1,
    borderTopColor: palette.rule,
    paddingTop: 20,
    paddingBottom: 22,
  },
  footerText: { flex: 1, gap: 2 },
  helpTitle: { fontSize: 20, fontWeight: '600', color: palette.navy },
  helpHours: { fontSize: 19, fontWeight: '400', color: palette.textMuted },
  gear: { margin: 0, width: kiosk.gearSize, height: kiosk.gearSize },
});
