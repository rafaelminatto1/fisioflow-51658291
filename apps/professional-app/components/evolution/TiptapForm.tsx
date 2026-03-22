import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SlashMenu, SlashCommand } from './SlashMenu';
import { ExerciseSelectorModal } from './ExerciseSelectorModal';
import { ClinicalSelectorModal } from './ClinicalSelectorModal';
import { PROCEDURES, CLINICAL_TESTS, ClinicalResource } from '@/constants/clinicalData';
import type { Exercise } from '@/types';

interface TiptapFormProps {
  content: string;
  onChangeContent: (text: string) => void;
  colors: any;
}

export function TiptapForm({ content, onChangeContent, colors }: TiptapFormProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showExercises, setShowExercises] = useState(false);
  const [showProcedures, setShowProcedures] = useState(false);
  const [showTests, setShowTests] = useState(false);

  const tools = [
    { icon: 'text', action: 'heading' },
    { icon: 'list', action: 'bullet' },
    { icon: 'list-circle', action: 'number' },
    { icon: 'code', action: 'code' },
    { icon: 'link', action: 'link' },
    { icon: 'image', action: 'image' },
  ];

  const handleTextChange = (text: string) => {
    if (text[text.length - 1] === '/') {
      setShowMenu(true);
    }
    onChangeContent(text);
  };

  const handleCommandSelect = (command: SlashCommand) => {
    if (command.id === 'exercicios') {
      setShowExercises(true);
      setShowMenu(false);
      return;
    }
    if (command.id === 'procedimentos') {
      setShowProcedures(true);
      setShowMenu(false);
      return;
    }
    if (command.id === 'testes') {
      setShowTests(true);
      setShowMenu(false);
      return;
    }

    const before = content.slice(0, content.lastIndexOf('/'));
    const after = content.slice(content.lastIndexOf('/') + 1);
    onChangeContent(before + command.content + after);
    setShowMenu(false);
  };

  const handleExerciseSelect = (exercise: Exercise) => {
    const before = content.slice(0, content.lastIndexOf('/'));
    const after = content.slice(content.lastIndexOf('/') + 1);
    const exerciseText = `\n• Exercício: ${exercise.name}${exercise.sets ? ` (${exercise.sets}x${exercise.reps})` : ''}\n  - Obs: `;
    onChangeContent(before + exerciseText + after);
    setShowExercises(false);
  };

  const handleClinicalSelect = (item: ClinicalResource, type: 'procedimento' | 'teste') => {
    const before = content.slice(0, content.lastIndexOf('/'));
    const after = content.slice(content.lastIndexOf('/') + 1);
    const text = `\n• ${type === 'procedimento' ? 'Procedimento' : 'Teste'}: ${item.name}\n  - Resultado/Obs: `;
    onChangeContent(before + text + after);
    setShowProcedures(false);
    setShowTests(false);
  };

  return (
    <View style={styles.container}>
      {/* Fake Tiptap Toolbar */}
      <View style={[styles.toolbar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tools.map((tool, index) => (
            <TouchableOpacity key={index} style={styles.toolButton}>
              <Ionicons name={tool.icon as any} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      <TextInput
        style={[styles.input, { color: colors.text }]}
        placeholder="Use a barra acima ou '/' para comandos..."
        placeholderTextColor={colors.textMuted}
        value={content}
        onChangeText={handleTextChange}
        multiline
        textAlignVertical="top"
      />

      <SlashMenu
        isVisible={showMenu}
        onClose={() => setShowMenu(false)}
        onSelect={handleCommandSelect}
        colors={colors}
      />

      <ExerciseSelectorModal
        isVisible={showExercises}
        onClose={() => setShowExercises(false)}
        onSelect={handleExerciseSelect}
        colors={colors}
      />

      <ClinicalSelectorModal
        isVisible={showProcedures}
        onClose={() => setShowProcedures(false)}
        onSelect={(item) => handleClinicalSelect(item, 'procedimento')}
        title="Procedimentos"
        data={PROCEDURES}
        colors={colors}
      />

      <ClinicalSelectorModal
        isVisible={showTests}
        onClose={() => setShowTests(false)}
        onSelect={(item) => handleClinicalSelect(item, 'teste')}
        title="Testes Clínicos"
        data={CLINICAL_TESTS}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  toolbar: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
  },
  toolButton: {
    padding: 8,
    marginRight: 4,
  },
  input: {
    padding: 16,
    fontSize: 16,
    minHeight: 250,
  },
});
