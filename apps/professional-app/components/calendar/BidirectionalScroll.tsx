import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withDecay,
  cancelAnimation,
} from 'react-native-reanimated';

interface BidirectionalScrollProps {
  width: number;
  height: number;
  contentWidth: number;
  contentHeight: number;
  children: React.ReactNode;
  renderFixedColumn?: () => React.ReactNode;
  renderFixedHeader?: () => React.ReactNode;
  renderCorner?: () => React.ReactNode;
}

export function BidirectionalScroll({
  width,
  height,
  contentWidth,
  contentHeight,
  children,
  renderFixedColumn,
  renderFixedHeader,
  renderCorner,
}: BidirectionalScrollProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const maxTranslateX = Math.min(0, width - contentWidth);
  const maxTranslateY = Math.min(0, height - contentHeight);

  const context = useSharedValue({ x: 0, y: 0 });

  const gesture = Gesture.Pan()
    .manualActivation(false)
    .onStart(() => {
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      context.value = { x: translateX.value, y: translateY.value };
    })
    .onUpdate((event) => {
      let nextX = context.value.x + event.translationX;
      let nextY = context.value.y + event.translationY;

      // Bound checks
      if (nextX > 0) nextX = 0;
      if (nextX < maxTranslateX) nextX = maxTranslateX;
      if (nextY > 0) nextY = 0;
      if (nextY < maxTranslateY) nextY = maxTranslateY;

      translateX.value = nextX;
      translateY.value = nextY;
    })
    .onEnd((event) => {
      translateX.value = withDecay({
        velocity: event.velocityX,
        clamp: [maxTranslateX, 0],
      });
      translateY.value = withDecay({
        velocity: event.velocityY,
        clamp: [maxTranslateY, 0],
      });
    });

  const animatedContentStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const animatedHeaderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedColumnStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <GestureHandlerRootView style={{ width, height }}>
      <GestureDetector gesture={gesture}>
        <View style={[styles.container, { width, height }]}>
          {/* Main Grid Content */}
          <Animated.View style={[styles.content, animatedContentStyle, { width: contentWidth, height: contentHeight }]}>
            {children}
          </Animated.View>

          {/* Fixed Header (moves only horizontally) */}
          {renderFixedHeader && (
            <View style={[styles.headerContainer, { width, left: 0 }]} pointerEvents="box-none">
              <Animated.View style={[animatedHeaderStyle, { width: contentWidth }]}>
                {renderFixedHeader()}
              </Animated.View>
            </View>
          )}

          {/* Fixed Column (moves only vertically) */}
          {renderFixedColumn && (
            <View style={[styles.columnContainer, { height, top: 0 }]} pointerEvents="box-none">
              <Animated.View style={[animatedColumnStyle, { height: contentHeight }]}>
                {renderFixedColumn()}
              </Animated.View>
            </View>
          )}

          {/* Fixed Corner */}
          {renderCorner && (
            <View style={styles.cornerContainer} pointerEvents="box-none">
              {renderCorner()}
            </View>
          )}
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  content: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  columnContainer: {
    position: 'absolute',
    left: 0,
    overflow: 'hidden',
  },
  cornerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
  },
});
