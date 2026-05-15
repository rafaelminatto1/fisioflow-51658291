import { useState, useCallback, useRef } from "react";
import { Alert } from "react-native";
import { usePatients } from "./usePatients";
import { useHaptics } from "./useHaptics";
import {
  AnalysisMode,
  AnalysisType,
  AnalysisResult,
  REFERENCE_ANGLES,
} from "../types/biomechanics";
import { calculateAngle, getAngleStatus } from "../utils/pose-utils";
import * as ImagePicker from "expo-image-picker";

export const useBiomechanicsAnalysis = () => {
  const [currentStep, setCurrentStep] = useState<"home" | "capture" | "analysis" | "report">(
    "home",
  );
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("live");
  const [analysisType, setAnalysisType] = useState<AnalysisType | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [capturedMedia, setCapturedMedia] = useState<string | null>(null);
  const [ghostMedia, setGhostMedia] = useState<string | null>(null); // Mídia de referência para sobreposição
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(null);

  const haptics = useHaptics();
  const { patients } = usePatients();

  // Ref para frames e poses (otimização de performance)
  const currentPose = useRef<any>(null);
  const sessionPoses = useRef<any[]>([]); // Armazena as poses durante a gravação

  const startAnalysis = useCallback(
    (type: AnalysisType, mode: AnalysisMode = "live") => {
      if (!selectedPatient) {
        Alert.alert("Atenção", "Selecione um paciente antes de iniciar a análise.");
        return;
      }
      setAnalysisType(type);
      setAnalysisMode(mode);

      if (mode === "live") {
        setCurrentStep("capture");
      } else {
        handleMediaSelection(mode);
      }
    },
    [selectedPatient],
  );

  const handleMediaSelection = async (mode: AnalysisMode) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permissão necessária",
        "Precisamos de acesso à sua galeria para analisar vídeos/fotos.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        mode === "video"
          ? ImagePicker.MediaTypeOptions.Videos
          : ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedMedia(result.assets[0].uri);
      setCurrentStep("analysis");
    }
  };

  const setAsGhost = useCallback(
    (uri: string | null) => {
      setGhostMedia(uri);
      haptics.impact("light");
    },
    [haptics],
  );

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      haptics.notification("success");
      setIsRecording(false);
      processRecordingResults();
    } else {
      haptics.impact("medium");
      setIsRecording(true);
      sessionPoses.current = [];
    }
  }, [isRecording, haptics]);

  const processRecordingResults = () => {
    if (sessionPoses.current.length === 0) {
      setCurrentStep("home");
      return;
    }

    const jointConfigs = [
      { id: "joelho_flex", joints: ["Hip", "Knee", "Ankle"], sides: ["left", "right"] },
      { id: "quadril_abd", joints: ["Shoulder", "Hip", "Knee"], sides: ["left", "right"] },
    ];

    const results: any[] = [];
    const symmetries: any[] = [];

    jointConfigs.forEach((config) => {
      let leftAngle = 0;
      let rightAngle = 0;

      config.sides.forEach((side) => {
        const p1Key = `${side}${config.joints[0]}`;
        const p2Key = `${side}${config.joints[1]}`;
        const p3Key = `${side}${config.joints[2]}`;

        let maxAngle = 0;

        sessionPoses.current.forEach((pose) => {
          const p1 = pose[p1Key];
          const p2 = pose[p2Key];
          const p3 = pose[p3Key];

          if (p1?.score > 0.5 && p2?.score > 0.5 && p3?.score > 0.5) {
            const angle = calculateAngle(p1, p2, p3);
            if (angle > maxAngle) maxAngle = angle;
          }
        });

        if (maxAngle > 0) {
          if (side === "left") leftAngle = maxAngle;
          else rightAngle = maxAngle;

          const ref = REFERENCE_ANGLES[config.id];
          results.push({
            joint: `${ref.label} (${side === "left" ? "E" : "D"})`,
            angle: maxAngle,
            reference: ref.reference,
            status: getAngleStatus(maxAngle, ref.reference, ref.tolerance),
          });
        }
      });

      if (leftAngle > 0 && rightAngle > 0) {
        const diff = Math.abs(leftAngle - rightAngle);
        const avg = (leftAngle + rightAngle) / 2;
        const percentage = (diff / avg) * 100;
        const ref = REFERENCE_ANGLES[config.id];

        symmetries.push({
          joint: ref.label,
          diff: Number(diff.toFixed(1)),
          percentage: Number(percentage.toFixed(1)),
        });
      }
    });

    // Gerar trajetórias para o relatório
    const trajectories: Record<string, { x: number; y: number }[]> = {};
    const jointsToTrack = [
      "leftAnkle",
      "rightAnkle",
      "leftKnee",
      "rightKnee",
      "leftHip",
      "rightHip",
    ];

    jointsToTrack.forEach((joint) => {
      trajectories[joint] = sessionPoses.current
        .map((pose) => ({
          x: pose[`${joint}`]?.x,
          y: pose[`${joint}`]?.y,
          score: pose[`${joint}`]?.score,
        }))
        .filter((p) => p.score > 0.5)
        .map((p) => ({ x: p.x, y: p.y }));
    });

    setAnalysisResults({
      type: analysisType || "articulacao",
      angles: results,
      observations: "",
      timestamp: new Date().toISOString(),
      patientId: selectedPatient?.id,
      patientName: selectedPatient?.name,
      trajectories,
      symmetries,
    });
    setCurrentStep("report");
  };

  const saveReferencePose = useCallback(
    (pose: any) => {
      currentPose.current = pose;
      if (isRecording) {
        sessionPoses.current.push(pose);
      }
      haptics.selection();
    },
    [haptics, isRecording],
  );

  const resetAnalysis = useCallback(() => {
    setCurrentStep("home");
    setAnalysisType(null);
    setCapturedMedia(null);
    setAnalysisResults(null);
    setIsRecording(false);
    sessionFrames.current = [];
  }, []);

  return {
    currentStep,
    setCurrentStep,
    analysisMode,
    analysisType,
    selectedPatient,
    setSelectedPatient,
    isRecording,
    capturedMedia,
    analysisResults,
    setAnalysisResults,
    startAnalysis,
    toggleRecording,
    saveReferencePose,
    resetAnalysis,
    ghostMedia,
    setAsGhost,
    patients,
  };
};
