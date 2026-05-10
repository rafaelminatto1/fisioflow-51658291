import React, { useState, useRef } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ExerciseSelectorModal } from "./ExerciseSelectorModal";
import { ClinicalSelectorModal } from "./ClinicalSelectorModal";
import { TiptapEditor } from "./TiptapEditor";
import { PROCEDURES, CLINICAL_TESTS } from "@/constants/clinicalData";
import type { Exercise } from "@/types";

interface TiptapFormProps {
  content: string;
  onChangeContent: (text: string) => void;
  colors: any;
}

export function TiptapForm({ content, onChangeContent, colors }: TiptapFormProps) {
  const [showExercises, setShowExercises] = useState(false);
  const [showProcedures, setShowProcedures] = useState(false);
  const [showTests, setShowTests] = useState(false);
  const editorRef = useRef<any>(null);

  const tools = [
    { icon: "text", action: "heading", level: 1 },
    { icon: "text-outline", action: "heading", level: 2 },
    { icon: "list", action: "bulletList" },
    { icon: "list-circle", action: "taskList" },
    { icon: "grid-outline", action: "table" },
    { icon: "logo-youtube", action: "youtube" },
    { icon: "text-sharp", action: "bold" },
    { icon: "pencil-outline", action: "italic" },
    { icon: "remove-outline", action: "underline" },
  ];

  const handleAction = (tool: any) => {
    if (tool.action === "youtube") {
      Alert.prompt("Inserir Vídeo", "Insira a URL do YouTube:", (url) => {
        if (url) editorRef.current?.execCommand("youtube", { url });
      });
      return;
    }
    editorRef.current?.execCommand(tool.action, { level: tool.level });
  };

  const handleExerciseSelect = (exercise: Exercise) => {
    const exerciseText = `<li><strong>Exercício: ${exercise.name}</strong>${
      exercise.sets ? ` (${exercise.sets}x${exercise.reps})` : ""
    }</li>`;
    const html = `<ul data-type="taskList">${exerciseText}</ul>`;
    editorRef.current?.execCommand("insertHTML", { html });
    setShowExercises(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Real Tiptap Toolbar */}
      <View
        style={[
          styles.toolbar,
          { borderBottomColor: colors.border },
        ]}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity 
            style={styles.toolButton} 
            onPress={() => setShowExercises(true)}
          >
            <Ionicons name="fitness" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.toolButton} 
            onPress={() => setShowTests(true)}
          >
            <Ionicons name="clipboard-outline" size={20} color={colors.info} />
          </TouchableOpacity>
          {tools.map((tool, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.toolButton}
              onPress={() => handleAction(tool)}
            >
              <Ionicons name={tool.icon as any} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <TiptapEditor
        ref={editorRef}
        content={content}
        onChangeContent={onChangeContent}
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
        onSelect={() => {}}
        title="Procedimentos"
        data={PROCEDURES}
        colors={colors}
      />

      <ClinicalSelectorModal
        isVisible={showTests}
        onClose={() => setShowTests(false)}
        onSelect={() => {}}
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
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "transparent",
  },
  toolbar: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
  },
  toolButton: {
    padding: 8,
    marginRight: 4,
  },
});
