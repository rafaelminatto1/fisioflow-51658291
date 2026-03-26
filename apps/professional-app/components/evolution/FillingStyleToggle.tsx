import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export type FillingMode = 'SOAP' | 'Notion' | 'Tiptap';

interface FillingStyleToggleProps {
  mode: FillingMode;
  onModeChange: (mode: FillingMode) => void;
  colors: any;
}

export function FillingStyleToggle({ mode, onModeChange, colors }: FillingStyleToggleProps) {
  const modes: FillingMode[] = ['SOAP', 'Notion', 'Tiptap'];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {modes.map((m) => (
        <TouchableOpacity
          key={m}
          style={[
            styles.button,
            mode === m && { backgroundColor: colors.primary },
          ]}
          onPress={() => onModeChange(m)}
        >
          <Text
            style={[
              styles.buttonText,
              { color: mode === m ? '#fff' : colors.textSecondary },
              mode === m && styles.activeButtonText,
            ]}
          >
            {m}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeButtonText: {
    fontWeight: '700',
  },
});
