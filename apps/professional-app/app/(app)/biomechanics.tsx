import React, { useState, useRef } from "react";
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, SafeAreaView, Alert } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Camera, useCameraDevice, useCameraPermission } from "react-native-vision-camera";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "tamagui";
import { captureRef } from "react-native-view-shot";

const { width, height } = Dimensions.get("window");

export default function BiomechanicsScreen() {
	const theme = useTheme();
	const router = useRouter();
	const device = useCameraDevice("back");
	const { hasPermission, requestPermission } = useCameraPermission();
	const [isRecording, setIsRecording] = useState(false);
	const [showGrid, setShowGrid] = useState(true);
	const camera = useRef<Camera>(null);
	const containerRef = useRef<View>(null);

	if (!hasPermission) {
		return (
			<SafeAreaView style={styles.permissionContainer}>
				<Text style={styles.permissionText}>Precisamos de permissão para usar a câmera.</Text>
				<TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
					<Text style={styles.permissionButtonText}>Conceder Permissão</Text>
				</TouchableOpacity>
			</SafeAreaView>
		);
	}

	if (device == null) {
		return (
			<SafeAreaView style={styles.permissionContainer}>
				<Text style={styles.permissionText}>Câmera não encontrada.</Text>
			</SafeAreaView>
		);
	}

	const toggleRecording = async () => {
		if (!camera.current) return;

		if (isRecording) {
			setIsRecording(false);
			await camera.current.stopRecording();
		} else {
			setIsRecording(true);
			camera.current.startRecording({
				onRecordingFinished: (video) => {
					Alert.alert("Vídeo Salvo", `Vídeo gravado em: ${video.path}`);
				},
				onRecordingError: (error) => {
					console.error("Recording failed", error);
					setIsRecording(false);
				}
			});
		}
	};

	const takeSnapshot = async () => {
		try {
			if (containerRef.current) {
				const uri = await captureRef(containerRef, {
					format: "jpg",
					quality: 0.9,
				});
				Alert.alert("Captura de Tela", `Snapshot salvo em: ${uri}`);
			}
		} catch (error) {
			console.error("Snapshot failed", error);
		}
	};

	return (
		<View style={styles.container} ref={containerRef}>
			<Stack.Screen
				options={{
					headerTitle: "Biomecânica",
					headerTransparent: true,
					headerTintColor: "#fff",
					headerLeft: () => (
						<TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16 }}>
							<Ionicons name="chevron-back" size={28} color="#fff" />
						</TouchableOpacity>
					),
					headerRight: () => (
						<TouchableOpacity onPress={() => setShowGrid(!showGrid)} style={{ marginRight: 16 }}>
							<Ionicons name="grid" size={24} color={showGrid ? "#00e5ff" : "#fff"} />
						</TouchableOpacity>
					)
				}}
			/>

			<Camera
				ref={camera}
				style={StyleSheet.absoluteFill}
				device={device}
				isActive={true}
				video={true}
				audio={false}
				photo={true}
			/>

			{/* Clinical Grid Overlay */}
			{showGrid && (
				<View style={styles.gridOverlay} pointerEvents="none">
					<View style={styles.gridLineHorizontal} />
					<View style={styles.gridLineHorizontal} />
					<View style={styles.gridLineVertical} />
					<View style={styles.gridLineVertical} />
					<View style={styles.plumbLine} />
				</View>
			)}

			{/* safe area warning would be better but keeping it simple for now */}
			<View style={styles.hudTop} pointerEvents="none">
				<View style={styles.badge}>
					<View style={styles.recordingDot} />
					<Text style={styles.badgeText}>POSE AI READY</Text>
				</View>
			</View>

			{/* Controls */}
			<View style={styles.controlsContainer}>
				<TouchableOpacity style={styles.iconButton} onPress={takeSnapshot}>
					<Ionicons name="camera-outline" size={28} color="#fff" />
				</TouchableOpacity>

				<TouchableOpacity
					style={[styles.recordButton, isRecording && styles.recordingActive]}
					onPress={toggleRecording}
				>
					<View style={[styles.recordInner, isRecording && styles.recordInnerActive]} />
				</TouchableOpacity>

				<TouchableOpacity style={styles.iconButton} onPress={() => {/* Switch camera */}}>
					<Ionicons name="camera-reverse-outline" size={28} color="#fff" />
				</TouchableOpacity>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
	},
	permissionContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#000",
	},
	permissionText: {
		color: "#fff",
		fontSize: 16,
		marginBottom: 20,
	},
	permissionButton: {
		backgroundColor: "#007AFF",
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 8,
	},
	permissionButtonText: {
		color: "#fff",
		fontWeight: "bold",
	},
	gridOverlay: {
		...StyleSheet.absoluteFillObject,
		justifyContent: "space-evenly",
		alignItems: "center",
		flexDirection: "row",
	},
	gridLineVertical: {
		width: 1,
		height: "100%",
		backgroundColor: "rgba(255,255,255,0.2)",
	},
	gridLineHorizontal: {
		position: "absolute",
		height: 1,
		width: "100%",
		backgroundColor: "rgba(255,255,255,0.2)",
		top: "33%",
	},
	plumbLine: {
		position: "absolute",
		width: 2,
		height: "100%",
		backgroundColor: "rgba(0, 255, 0, 0.5)",
		left: "50%",
	},
	hudTop: {
		position: "absolute",
		top: 100,
		left: 20,
	},
	badge: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "rgba(0,0,0,0.6)",
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
	},
	recordingDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: "#00ff00",
		marginRight: 6,
	},
	badgeText: {
		color: "#fff",
		fontSize: 12,
		fontWeight: "bold",
	},
	controlsContainer: {
		position: "absolute",
		bottom: 50,
		left: 0,
		right: 0,
		flexDirection: "row",
		justifyContent: "space-around",
		alignItems: "center",
		paddingHorizontal: 30,
	},
	iconButton: {
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: "rgba(0,0,0,0.5)",
		justifyContent: "center",
		alignItems: "center",
	},
	recordButton: {
		width: 80,
		height: 80,
		borderRadius: 40,
		borderWidth: 4,
		borderColor: "#fff",
		justifyContent: "center",
		alignItems: "center",
	},
	recordingActive: {
		borderColor: "rgba(255, 0, 0, 0.5)",
	},
	recordInner: {
		width: 66,
		height: 66,
		borderRadius: 33,
		backgroundColor: "#fff",
	},
	recordInnerActive: {
		width: 40,
		height: 40,
		borderRadius: 8,
		backgroundColor: "red",
	},
});