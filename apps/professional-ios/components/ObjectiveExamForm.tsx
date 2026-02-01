import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable } from 'react-native';
import { Card } from './Card';
import { Icon } from './Icon';
import { Button } from './Button';
import { useTheme } from '@/hooks/useTheme';
import { HapticFeedback } from '@/lib/haptics';

export interface ObjectiveExamFormProps {
  inspection: string;
  onInspectionChange: (value: string) => void;
  palpation: string;
  onPalpationChange: (value: string) => void;
  postureAnalysis: string;
  onPostureAnalysisChange: (value: string) => void;
  movementTests: Record<string, string>;
  onMovementTestsChange: (tests: Record<string, string>) => void;
  specialTests: Record<string, boolean>;
  onSpecialTestsChange: (tests: Record<string, boolean>) => void;
  colors: any;
}

export function ObjectiveExamForm({
  inspection,
  onInspectionChange,
  palpation,
  onPalpationChange,
  postureAnalysis,
  onPostureAnalysisChange,
  movementTests,
  onMovementTestsChange,
  specialTests,
  onSpecialTestsChange,
  colors,
}: ObjectiveExamFormProps) {
  const [showMovementTests, setShowMovementTests] = useState(false);
  const [showSpecialTests, setShowSpecialTests] = useState(false);

  const addMovementTest = () => {
    const key = `test_${Object.keys(movementTests).length + 1}`;
    onMovementTestsChange({ ...movementTests, [key]: '' });
    HapticFeedback.light();
  };

  const updateMovementTest = (key: string, value: string) => {
    onMovementTestsChange({ ...movementTests, [key]: value });
  };

  const removeMovementTest = (key: string) => {
    const newTests = { ...movementTests };
    delete newTests[key];
    onMovementTestsChange(newTests);
    HapticFeedback.light();
  };

  const toggleSpecialTest = (test: string) => {
    HapticFeedback.selection();
    onSpecialTestsChange({ ...specialTests, [test]: !specialTests[test] });
  };

  const commonSpecialTests = [
    'Lasegue',
    'Slump',
    'Ober',
    'Thomas',
    'Yergason',
    'Speed',
    'FABERE',
    'Appley',
    'Schober',
    'Neer',
    'Hawkins',
    'Yocum',
    'Crank',
    'Empty Can',
    'Drop Arm',
  ];

  return (
    <>
      {/* Inspection & Palpation */}
      <Card style={styles.card}>
        <ExamField
          label="Inspeção Visual"
          placeholder="Postura, assimetrias, cicatrizes, edema..."
          value={inspection}
          onChangeText={onInspectionChange}
          colors={colors}
        />
        <ExamField
          label="Palpação"
          placeholder="Pontos dolorosos, tônus muscular, temperatura..."
          value={palpation}
          onChangeText={onPalpationChange}
          colors={colors}
        />
      </Card>

      {/* Posture Analysis */}
      <Card style={styles.card}>
        <ExamField
          label="Análise Postural"
          placeholder="Avaliação global da postura em estática..."
          value={postureAnalysis}
          onChangeText={onPostureAnalysisChange}
          colors={colors}
        />
      </Card>

      {/* Movement Tests */}
      <Card style={styles.card}>
        <Pressable
          onPress={() => setShowMovementTests(!showMovementTests)}
          style={styles.collapsibleHeader}
        >
          <Icon name="move" size={20} color={colors.primary} />
          <Text style={[styles.collapsibleTitle, { color: colors.text }]}>
            Testes de Movimento
          </Text>
          <Icon
            name={showMovementTests ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textSecondary}
          />
        </Pressable>

        {showMovementTests && (
          <View style={styles.movementTestsContent}>
            {Object.entries(movementTests).map(([key, value]) => (
              <View key={key} style={styles.movementTestRow}>
                <TextInput
                  style={[styles.movementTestInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="Ex: Flexão de coluna lombar"
                  placeholderTextColor={colors.textSecondary}
                  value={value}
                  onChangeText={(newValue) => updateMovementTest(key, newValue)}
                />
                <Pressable onPress={() => removeMovementTest(key)} style={styles.removeButton}>
                  <Icon name="x" size={20} color={colors.error} />
                </Pressable>
              </View>
            ))}

            <Button
              variant="outline"
              size="sm"
              onPress={addMovementTest}
              leftIcon={<Icon name="plus" size={16} color={colors.primary} />}
              style={styles.addButton}
            >
              Adicionar Teste
            </Button>
          </View>
        )}
      </Card>

      {/* Special Tests */}
      <Card style={styles.card}>
        <Pressable
          onPress={() => setShowSpecialTests(!showSpecialTests)}
          style={styles.collapsibleHeader}
        >
          <Icon name="activity" size={20} color={colors.primary} />
          <Text style={[styles.collapsibleTitle, { color: colors.text }]}>
            Testes Especiais
          </Text>
          <Icon
            name={showSpecialTests ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textSecondary}
          />
        </Pressable>

        {showSpecialTests && (
          <View style={styles.specialTestsGrid}>
            {commonSpecialTests.map((test) => (
              <Pressable
                key={test}
                onPress={() => toggleSpecialTest(test)}
                style={[
                  styles.specialTestChip,
                  {
                    backgroundColor: specialTests[test]
                      ? `${colors.primary}20`
                      : colors.card,
                    borderColor: specialTests[test]
                      ? colors.primary
                      : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.specialTestText,
                    { color: specialTests[test] ? colors.primary : colors.text },
                  ]}
                >
                  {test}
                </Text>
                {specialTests[test] && (
                  <Icon name="check" size={14} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </View>
        )}
      </Card>
    </>
  );
}

function ExamField({
  label,
  placeholder,
  value,
  onChangeText,
  colors,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  colors: any;
}) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 12,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '500',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 60,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  collapsibleTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  movementTestsContent: {
    marginTop: 12,
    gap: 8,
  },
  movementTestRow: {
    flexDirection: 'row',
    gap: 8,
  },
  movementTestInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    marginTop: 4,
  },
  specialTestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  specialTestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  specialTestText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
