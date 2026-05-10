import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  Dimensions,
  PanResponder,
  Platform,
  Modal,
  TextInput,
} from "react-native";
import ViewShot from "react-native-view-shot";
import Svg, { Path, G, Line, Text as SvgText, Defs, Marker, Polygon } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImageManipulator from "expo-image-manipulator";

interface Point {
  x: number;
  y: number;
}

interface DrawingPath {
  points: Point[];
  color: string;
  width: number;
  type: "path" | "arrow" | "text";
  text?: string;
  opacity?: number;
}

interface ImageEditorProps {
  uri: string;
  onSave: (uri: string) => void;
  onCancel: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CANVAS_SIZE = SCREEN_WIDTH - 32;

export function ImageEditor({ uri, onSave, onCancel }: ImageEditorProps) {
  const colors = useColors();
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [color, setColor] = useState("#ff0000");
  const [tool, setTool] = useState<"pen" | "arrow" | "text" | "marker" | "crop">("pen");
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [currentUri, setCurrentUri] = useState(uri);
  
  // Crop state
  const [cropRect, setCropRect] = useState({ x: 50, y: 50, width: 200, height: 200 });
  const [isCropping, setIsCropping] = useState(false);
  
  // Estados para o Modal de Texto
  const [isTextModalVisible, setIsTextModalVisible] = useState(false);
  const [tempText, setTempText] = useState("");
  const [textPosition, setTextPosition] = useState<Point | null>(null);

  const viewShotRef = useRef<ViewShot>(null);

  useEffect(() => {
    Image.getSize(currentUri, (w, h) => {
      const ratio = Math.min(CANVAS_SIZE / w, CANVAS_SIZE / h);
      setImageSize({ width: w * ratio, height: h * ratio });
    });
  }, [currentUri]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (tool === "text") {
          setTextPosition({ x: locationX, y: locationY });
          setIsTextModalVisible(true);
          return;
        }
        if (tool === "crop") {
          setCropRect({ x: locationX, y: locationY, width: 100, height: 100 });
          return;
        }
        setCurrentPath([{ x: locationX, y: locationY }]);
      },
      onPanResponderMove: (evt) => {
        if (tool === "text") return;
        const { locationX, locationY } = evt.nativeEvent;
        if (tool === "crop") {
          setCropRect(prev => ({
            ...prev,
            width: Math.max(50, locationX - prev.x),
            height: Math.max(50, locationY - prev.y)
          }));
          return;
        }
        setCurrentPath((prev) => [...prev, { x: locationX, y: locationY }]);
      },
      onPanResponderRelease: (evt) => {
        if (tool === "text" || tool === "crop") return;

        if (currentPath.length > 0) {
          setPaths((prev) => [
            ...prev,
            { 
              points: currentPath, 
              color, 
              width: tool === "marker" ? 15 : 3, 
              type: tool === "arrow" ? "arrow" : "path",
              opacity: tool === "marker" ? 0.4 : 1
            },
          ]);
          setCurrentPath([]);
        }
      },
    })
  ).current;

  const handleAddText = () => {
    if (tempText.trim() && textPosition) {
      setPaths((prev) => [
        ...prev,
        { 
          points: [textPosition], 
          color, 
          width: 20, 
          type: "text", 
          text: tempText 
        },
      ]);
    }
    setTempText("");
    setIsTextModalVisible(false);
    setTextPosition(null);
  };

  const undo = () => {
    setPaths((prev) => prev.slice(0, -1));
  };

  const rotateImage = async () => {
    const result = await ImageManipulator.manipulateAsync(
      currentUri,
      [{ rotate: 90 }],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );
    setCurrentUri(result.uri);
  };

  const confirmCrop = async () => {
    try {
      // Obter dimensões reais da imagem para o mapeamento
      const { width: realW, height: realH } = await new Promise<{width: number, height: number}>(resolve => {
        Image.getSize(currentUri, (w, h) => resolve({width: w, height: h}));
      });

      const scaleX = realW / imageSize.width;
      const scaleY = realH / imageSize.height;

      const cropActions = [{
        crop: {
          originX: cropRect.x * scaleX,
          originY: cropRect.y * scaleY,
          width: cropRect.width * scaleX,
          height: cropRect.height * scaleY,
        }
      }];

      const result = await ImageManipulator.manipulateAsync(
        currentUri,
        cropActions,
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );

      setCurrentUri(result.uri);
      setTool("pen"); // Voltar para a caneta após o crop
    } catch (error) {
      console.error("Erro ao realizar crop:", error);
    }
  };

  const handleSave = async () => {
    try {
      if (viewShotRef.current?.capture) {
        const resultUri = await viewShotRef.current.capture();
        onSave(resultUri);
      }
    } catch (error) {
      console.error("Erro ao salvar edição:", error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#000" }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.headerBtn}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Foto</Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerBtn}>
          <Text style={styles.saveText}>Pronto</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.canvasContainer}>
        <ViewShot
          ref={viewShotRef}
          options={{ format: "jpg", quality: 0.9 }}
          style={[
            styles.imageWrapper,
            { width: imageSize.width, height: imageSize.height },
          ]}
          {...panResponder.panHandlers}
        >
          <Image
            source={{ uri: currentUri }}
            style={{ width: imageSize.width, height: imageSize.height }}
            resizeMode="contain"
          />
          <Svg style={StyleSheet.absoluteFill}>
            <Defs>
              <Marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="0"
                refY="3.5"
                orient="auto"
              >
                <Polygon points="0 0, 10 3.5, 0 7" fill={color} />
              </Marker>
            </Defs>
            {paths.map((p, i) => {
              if (p.type === "path") {
                return (
                  <Path
                    key={i}
                    d={`M ${p.points.map((pt) => `${pt.x} ${pt.y}`).join(" L ")}`}
                    stroke={p.color}
                    strokeWidth={p.width}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={p.opacity || 1}
                  />
                );
              } else if (p.type === "arrow") {
                const start = p.points[0];
                const end = p.points[p.points.length - 1];
                return (
                  <Line
                    key={i}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke={p.color}
                    strokeWidth={p.width}
                    markerEnd="url(#arrowhead)"
                  />
                );
              } else if (p.type === "text") {
                const pos = p.points[0];
                return (
                  <SvgText
                    key={i}
                    x={pos.x}
                    y={pos.y}
                    fill={p.color}
                    fontSize={24}
                    fontWeight="bold"
                  >
                    {p.text}
                  </SvgText>
                );
              }
              return null;
            })}
            {currentPath.length > 1 && (tool === "pen" || tool === "marker") && (
              <Path
                d={`M ${currentPath.map((pt) => `${pt.x} ${pt.y}`).join(" L ")}`}
                stroke={color}
                strokeWidth={tool === "marker" ? 15 : 3}
                fill="none"
                opacity={tool === "marker" ? 0.4 : 1}
              />
            )}
            {currentPath.length > 1 && tool === "arrow" && (
              <Line
                x1={currentPath[0].x}
                y1={currentPath[0].y}
                x2={currentPath[currentPath.length - 1].x}
                y2={currentPath[currentPath.length - 1].y}
                stroke={color}
                strokeWidth={3}
              />
            )}
            {tool === "crop" && (
              <Rect
                x={cropRect.x}
                y={cropRect.y}
                width={cropRect.width}
                height={cropRect.height}
                stroke="#fff"
                strokeWidth="2"
                strokeDasharray="5 5"
                fill="rgba(255,255,255,0.2)"
              />
            )}
          </Svg>
          {tool === "crop" && (
            <View style={styles.cropConfirmOverlay}>
              <TouchableOpacity onPress={confirmCrop} style={styles.confirmCropBtn}>
                <Ionicons name="checkmark" size={32} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </ViewShot>
      </View>

      <Modal
        visible={isTextModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsTextModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: "#fff" }]}>
            <Text style={[styles.modalTitle, { color: "#000" }]}>Adicionar Texto</Text>
            <TextInput
              style={[styles.textInput, { color: "#000", borderColor: "#ccc" }]}
              value={tempText}
              onChangeText={setTempText}
              placeholder="Digite aqui..."
              placeholderTextColor="#999"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                onPress={() => setIsTextModalVisible(false)}
                style={styles.modalBtn}
              >
                <Text style={{ color: "#666" }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleAddText}
                style={[styles.modalBtn, { backgroundColor: "#6366f1" }]}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.footer}>
        <View style={styles.toolbar}>
          <TouchableOpacity
            onPress={() => setTool("pen")}
            style={[styles.toolBtn, tool === "pen" && styles.activeTool]}
          >
            <Ionicons name="pencil" size={24} color={tool === "pen" ? colors.primary : "#fff"} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTool("marker")}
            style={[styles.toolBtn, tool === "marker" && styles.activeTool]}
          >
            <Ionicons name="brush" size={24} color={tool === "marker" ? colors.primary : "#fff"} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTool("arrow")}
            style={[styles.toolBtn, tool === "arrow" && styles.activeTool]}
          >
            <Ionicons name="arrow-forward" size={24} color={tool === "arrow" ? colors.primary : "#fff"} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTool("text")}
            style={[styles.toolBtn, tool === "text" && styles.activeTool]}
          >
            <Ionicons name="text" size={24} color={tool === "text" ? colors.primary : "#fff"} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTool("crop")}
            style={[styles.toolBtn, tool === "crop" && styles.activeTool]}
          >
            <Ionicons name="crop" size={24} color={tool === "crop" ? colors.primary : "#fff"} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={rotateImage}
            style={styles.toolBtn}
          >
            <Ionicons name="refresh" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={undo} style={styles.toolBtn}>
            <Ionicons name="arrow-undo" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.colorPicker}>
          {["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ffffff"].map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setColor(c)}
              style={[
                styles.colorCircle,
                { backgroundColor: c },
                color === c && styles.activeColor,
              ]}
            />
          ))}
        </View>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  headerBtn: {
    padding: 8,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  saveText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  canvasContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  imageWrapper: {
    backgroundColor: "#111",
    overflow: "hidden",
  },
  footer: {
    padding: 24,
    gap: 20,
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 32,
  },
  toolBtn: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  activeTool: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  colorPicker: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  activeColor: {
    borderColor: "#fff",
    transform: [{ scale: 1.2 }],
  },
  saveButton: {
    backgroundColor: "#6366f1",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  cropConfirmOverlay: {
    position: "absolute",
    bottom: 20,
    right: 20,
  },
  confirmCropBtn: {
    backgroundColor: "#10b981",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});
