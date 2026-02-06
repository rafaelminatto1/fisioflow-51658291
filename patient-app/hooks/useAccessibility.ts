/**
 * useAccessibility Hook
 * React hook for accessibility features
 */

import { useState, useEffect } from 'react';

import {
  isScreenReaderEnabled,
  isReduceMotionEnabled,
  isBoldTextEnabled,
  announceForAccessibility,
} from '@/lib/accessibility';

export interface AccessibilitySettings {
  screenReaderEnabled: boolean;
  reduceMotionEnabled: boolean;
  boldTextEnabled: boolean;
}

export function useAccessibility(): AccessibilitySettings & {
  announce: (message: string) => void;
} {
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const [boldTextEnabled, setBoldTextEnabled] = useState(false);

  useEffect(() => {
    // Check initial accessibility settings
    const checkAccessibilitySettings = async () => {
      const [sr, motion, bold] = await Promise.all([
        isScreenReaderEnabled(),
        isReduceMotionEnabled(),
        isBoldTextEnabled(),
      ]);

      setScreenReaderEnabled(sr);
      setReduceMotionEnabled(motion);
      setBoldTextEnabled(bold);
    };

    checkAccessibilitySettings();

    // Listen for changes in accessibility settings
    const screenReaderSubscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (enabled) => setScreenReaderEnabled(enabled)
    );

    const reduceMotionSubscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => setReduceMotionEnabled(enabled)
    );

    const boldTextSubscription = AccessibilityInfo.addEventListener(
      'boldTextChanged',
      (enabled) => setBoldTextEnabled(enabled)
    );

    return () => {
      screenReaderSubscription.remove();
      reduceMotionSubscription.remove();
      boldTextSubscription.remove();
    };
  }, []);

  return {
    screenReaderEnabled,
    reduceMotionEnabled,
    boldTextEnabled,
    announce: announceForAccessibility,
  };
}

/**
 * Hook to get animation duration based on reduce motion preference
 */
export function useAnimationDuration(defaultDuration: number = 300): number {
  const { reduceMotionEnabled } = useAccessibility();

  return reduceMotionEnabled ? 0 : defaultDuration;
}

/**
 * Hook to announce screen changes to screen readers
 */
export function useScreenAnnouncement() {
  const { screenReaderEnabled, announce } = useAccessibility();

  const announceScreenChange = (screenName: string) => {
    if (screenReaderEnabled) {
      announce(`Tela ${screenName}`);
    }
  };

  const announceAction = (action: string) => {
    if (screenReaderEnabled) {
      announce(action);
    }
  };

  return { announceScreenChange, announceAction };
}

import { AccessibilityInfo } from 'react-native';
