import React, { useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SlashMenu, SlashCommand } from "./SlashMenu";
import { ExerciseSelectorModal } from "./ExerciseSelectorModal";
import { ClinicalSelectorModal } from "./ClinicalSelectorModal";
import { PROCEDURES, CLINICAL_TESTS, ClinicalResource } from "@/constants/clinicalData";
import type { Exercise } from "@/types";
import { useVoiceScribe } from "@/hooks/useVoiceScribe";

interface NotionFormProps {
  content: string;
  onChangeContent: (text: string) => void;
  colors: any;
}

export function NotionForm({ content, onChangeContent, colors }: NotionFormProps) {
  const [showMenu, setShowMenu] = useState(false);
  const { state: voiceState, toggle: toggleVoice } = useVoiceScribe((text) => {
    onChangeContent(content ? content + " " + text : text);
  });
  const [showExercises, setShowExercises] = useState(false);
  const [showProcedures, setShowProcedures] = useState(false);
  const [showTests, setShowTests] = useState(false);

  const handleTextChange = (text: string) => {
    const lastChar = text[text.length - 1];
    if (lastChar === "/") {
      setShowMenu(true);
    }
    onChangeContent(text);
  };

  const handleCommandSelect = (command: SlashCommand) => {
    if (command.id === "exercicios") {
      setShowExercises(true);
      setShowMenu(false);
      return;
    }
    if (command.id === "procedimentos") {
      setShowProcedures(true);
      setShowMenu(false);
      return;
    }
    if (command.id === "testes") {
      setShowTests(true);
      setShowMenu(false);
      return;
    }

    const before = content.slice(0, content.lastIndexOf("/"));
    const after = content.slice(content.lastIndexOf("/") + 1);
    onChangeContent(before + command.content + after);
    setShowMenu(false);
  };

  const handleExerciseSelect = (exercise: Exercise) => {
    const before = content.slice(0, content.lastIndexOf("/"));
    const after = content.slice(content.lastIndexOf("/") + 1);
    const exerciseText = `\n• Exercício: ${exercise.name}${exercise.sets ? ` (${exercise.sets}x${exercise.reps})` : ""}\n  - Obs: `;
    onChangeContent(before + exerciseText + after);
    setShowExercises(false);
  };

  const handleClinicalSelect = (item: ClinicalResource, type: "procedimento" | "teste") => {
    const before = content.slice(0, content.lastIndexOf("/"));
    const after = content.slice(content.lastIndexOf("/") + 1);
    const text = `\n• ${type === "procedimento" ? "Procedimento" : "Teste"}: ${item.name}\n  - Resultado/Obs: `;
    onChangeContent(before + text + after);
    setShowProcedures(false);
    setShowTests(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Evolução Livre</Text>
        <TouchableOpacity
          style={[
            styles.voiceButton,
            {
              backgroundColor: voiceState === "recording" ? colors.primary : colors.primary + "20",
            },
          ]}
          onPress={toggleVoice}
          disabled={voiceState === "transcribing"}
        >
          {voiceState === "transcribing" ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons
              name={voiceState === "recording" ? "stop-circle" : "mic"}
              size={20}
              color={voiceState === "recording" ? "#fff" : colors.primary}
            />
          )}
          <Text
            style={[
              styles.voiceText,
              { color: voiceState === "recording" ? "#fff" : colors.primary },
            ]}
          >
            {voiceState === "recording"
              ? "Parar"
              : voiceState === "transcribing"
                ? "Transcrevendo..."
                : "Ditado"}
          </Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={[styles.input, { color: colors.text }]}
        placeholder="Comece a escrever... digite '/' para comandos"
        placeholderTextColor={colors.textMuted}
        value={content}
        onChangeText={handleTextChange}
        multiline
        autoFocus
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
        onSelect={(item) => handleClinicalSelect(item, "procedimento")}
        title="Procedimentos"
        data={PROCEDURES}
        colors={colors}
      />

      <ClinicalSelectorModal
        isVisible={showTests}
        onClose={() => setShowTests(false)}
        onSelect={(item) => handleClinicalSelect(item, "teste")}
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
    paddingHorizontal: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    marginTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  voiceButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  voiceText: {
    fontSize: 12,
    fontWeight: "600",
  },
  input: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 300,
  },
});
