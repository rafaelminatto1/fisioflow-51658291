/**
 * VideoModal Component
 * Modal player for exercise videos with controls
 */

import { useState, useEffect } from 'react';

import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
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
  const player = useVideoPlayer(videoUri, (videoPlayer) => {
    videoPlayer.loop = false;
    if (autoPlay) {
      videoPlayer.play();
    }
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  useEffect(() => {
    if (visible && autoPlay) {
      playVideo();
    }
    if (!visible) {
      pauseVideo();
      setShowSpeedMenu(false);
    }
  }, [visible, autoPlay]);

  const playVideo = async () => {
    player.play();
    setIsPlaying(true);
  };

  const pauseVideo = async () => {
    player.pause();
    setIsPlaying(false);
  };

  const togglePlayPause = async () => {
    if (isPlaying) {
      await pauseVideo();
    } else {
      await playVideo();
    }
  };

  const replayVideo = async () => {
    player.currentTime = 0;
    player.play();
    setIsPlaying(true);
  };

  const setSpeed = async (speed: number) => {
    player.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  };

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
          <VideoView
            player={player}
            style={styles.video}
            nativeControls={false}
            contentFit="contain"
          />
        </View>

        {/* Video Info */}
        {description && (
          <View style={styles.infoContainer}>
            <Text style={[styles.infoText, { color: '#FFFFFF' }]}>
              {description}
            </Text>
          </View>
        )}

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
              name={isPlaying ? 'pause' : 'play'}
              size={32}
              color="#000000"
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.speedButton} onPress={replayVideo}>
            <Ionicons name="refresh" size={24} color="#FFFFFF" />
          </TouchableOpacity>

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
  infoContainer: {
    padding: 16,
  },
  infoText: {
    fontSize: 15,
    lineHeight: 22,
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
