/**
 * VideoModal Component
 * Modal player for exercise videos with controls
 */

import { useState, useRef, useEffect } from 'react';

  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColorScheme';

interface VideoModalProps {
  visible: boolean;
  onClose: () => void;
  videoUri: string;
  title?: string;
  description?: string;
  autoPlay?: boolean;
}

export function VideoModal({
  visible,
  onClose,
  videoUri,
  title,
  description,
  autoPlay = true,
}: VideoModalProps) {
  const colors = useColors();
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  useEffect(() => {
    if (visible && autoPlay && videoRef.current) {
      playVideo();
    }
  }, [visible, autoPlay]);

  const playVideo = async () => {
    if (videoRef.current) {
      await videoRef.current.playAsync();
      setIsPlaying(true);
    }
  };

  const pauseVideo = async () => {
    if (videoRef.current) {
      await videoRef.current.pauseAsync();
      setIsPlaying(false);
    }
  };

  const togglePlayPause = async () => {
    if (isPlaying) {
      await pauseVideo();
    } else {
      await playVideo();
    }
  };

  const replayVideo = async () => {
    if (videoRef.current) {
      await videoRef.current.replayAsync();
      setIsPlaying(true);
      setIsCompleted(false);
    }
  };

  const setSpeed = async (speed: number) => {
    if (videoRef.current) {
      await videoRef.current.setRateAsync(speed, true);
      setPlaybackSpeed(speed);
      setShowSpeedMenu(false);
    }
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    setStatus(status);
    setIsPlaying(status.isPlaying);
    setIsLoading(status.isBuffering);

    // Check if video is completed
    if (status.didJustFinish && !isCompleted) {
      setIsCompleted(true);
      setIsPlaying(false);
    }
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const position = status?.positionMillis || 0;
  const duration = status?.durationMillis || 0;
  const progress = duration > 0 ? position / duration : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title || 'Exercício'}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Video Player */}
        <View style={styles.videoContainer}>
          <Video
            ref={videoRef}
            source={{ uri: videoUri }}
            style={styles.video}
            useNativeControls={false}
            resizeMode={ResizeMode.CONTAIN}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            isLooping={false}
          />

          {/* Loading Overlay */}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          )}

          {/* Completed Overlay */}
          {isCompleted && (
            <Pressable style={styles.completedOverlay} onPress={replayVideo}>
              <Ionicons name="play-circle" size={64} color="#FFFFFF" />
              <Text style={styles.completedText}>Toque para repetir</Text>
            </Pressable>
          )}
        </View>

        {/* Video Info */}
        {description && (
          <View style={styles.infoContainer}>
            <Text style={[styles.infoText, { color: '#FFFFFF' }]}>
              {description}
            </Text>
          </View>
        )}

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.timeText}>
            {formatTime(position)} / {formatTime(duration)}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {/* Speed Control */}
          <TouchableOpacity
            style={styles.speedButton}
            onPress={() => setShowSpeedMenu(!showSpeedMenu)}
          >
            <Text style={styles.speedButtonText}>{playbackSpeed}x</Text>
          </TouchableOpacity>

          {showSpeedMenu && (
            <View style={styles.speedMenu}>
              {speeds.map((speed) => (
                <TouchableOpacity
                  key={speed}
                  style={[
                    styles.speedMenuItem,
                    playbackSpeed === speed && styles.speedMenuItemActive,
                  ]}
                  onPress={() => setSpeed(speed)}
                >
                  <Text
                    style={[
                      styles.speedMenuItemText,
                      { color: playbackSpeed === speed ? colors.primary : '#FFFFFF' },
                    ]}
                  >
                    {speed}x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Play/Pause Button */}
          <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
            <Ionicons
              name={isPlaying ? 'pause' : isCompleted ? 'refresh' : 'play'}
              size={32}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {/* Spacer for balance */}
          <View style={styles.controlsSpacer} />
        </View>

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <View style={styles.tip}>
            <Ionicons name="information-circle" size={16} color="#FFFFFF" />
            <Text style={styles.tipText}>
              Mantenha a postura correta durante o exercício
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  videoContainer: {
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  completedOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  completedText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  infoContainer: {
    padding: 16,
  },
  infoText: {
    fontSize: 15,
    lineHeight: 22,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 13,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 24,
  },
  speedButton: {
    padding: 8,
  },
  speedButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  speedMenu: {
    position: 'absolute',
    left: 16,
    backgroundColor: 'rgba(40, 40, 40, 0.95)',
    borderRadius: 8,
    padding: 4,
  },
  speedMenuItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  speedMenuItemActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
  },
  speedMenuItemText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsSpacer: {
    width: 52,
  },
  tipsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  tipText: {
    color: '#FFFFFF',
    fontSize: 13,
    flex: 1,
  },
});
