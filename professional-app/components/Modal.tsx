import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  hideCloseButton?: boolean;
}

export function Modal({ visible, onClose, title, children, hideCloseButton }: Props) {
  const colors = useColors();
  const [modalHeight, setModalHeight] = useState(SCREEN_HEIGHT * 0.7);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]} edges={[]}>
        <View style={styles.container}>
          <View
            style={[styles.content, { backgroundColor: colors.background }]}
            onLayout={(event) => {
              const height = event.nativeEvent.layout.height;
              if (height > 0) setModalHeight(height);
            }}
          >
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              {title && (
                <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              )}
              {!hideCloseButton && (
                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: colors.surface }]}
                  onPress={onClose}
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              )}
            </View>

            {/* Content */}
            <View style={styles.body}>{children}</View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  content: {
    borderRadius: 20,
    paddingBottom: 20,
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});
