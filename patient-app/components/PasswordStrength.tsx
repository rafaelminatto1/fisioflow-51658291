/**
 * PasswordStrength Component
 * Visual indicator for password strength
 */

import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import { getPasswordStrength, checkPasswordRequirements } from '@/lib/validation';

interface PasswordStrengthProps {
  password: string;
  show?: boolean;
}

export function PasswordStrength({ password, show = true }: PasswordStrengthProps) {
  const colors = useColors();

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const requirements = useMemo(() => checkPasswordRequirements(password), [password]);

  if (!show || password.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.strengthBar}>
        {[0, 1, 2, 3, 4].map((index) => (
          <View
            key={index}
            style={[
              styles.strengthSegment,
              {
                backgroundColor:
                  index <= strength.score
                    ? strength.color || colors.border
                    : colors.border,
              },
            ]}
          />
        ))}
      </View>

      {strength.label && (
        <Text style={[styles.label, { color: strength.color }]}>
          {strength.label}
        </Text>
      )}

      {password.length > 0 && password.length < 8 && (
        <View style={styles.requirements}>
          {requirements.map((req, index) => (
            <View key={index} style={styles.requirementItem}>
              <View
                style={[
                  styles.requirementDot,
                  { backgroundColor: req.met ? colors.success : colors.border },
                ]}
              />
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                {req.label}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    gap: 8,
  },
  strengthBar: {
    flexDirection: 'row',
    gap: 4,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  requirements: {
    gap: 4,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  requirementDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  requirementText: {
    fontSize: 11,
  },
});
