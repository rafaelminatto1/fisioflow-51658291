import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, GestureResponderEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

export interface SignatureCanvasProps {
  penColor?: string;
  strokeWidth?: number;
  onSignatureEnd?: (signature: string) => void;
  containerStyle?: any;
}

interface Point {
  x: number;
  y: number;
}

export const SignatureCanvas = React.forwardRef<any, SignatureCanvasProps>(
  ({ penColor = '#000', strokeWidth = 2, onSignatureEnd, containerStyle }, ref) => {
    const [paths, setPaths] = React.useState<string[]>([]);
    const [currentPath, setCurrentPath] = React.useState<string>('');
    const pointsRef = useRef<Point[]>([]);
    const signatureRef = useRef<string[]>([]);

    React.useImperativeHandle(ref, () => ({
      clearSignature,
      getSignature: () => signatureRef.current.join(';'),
      isEmpty: () => signatureRef.current.length === 0,
    }));

    const clearSignature = () => {
      setPaths([]);
      setCurrentPath('');
      pointsRef.current = [];
      signatureRef.current = [];
    };

    const gesture = Gesture.Pan()
      .onStart((event) => {
        pointsRef.current = [{ x: event.x, y: event.y }];
        setCurrentPath(`M ${event.x} ${event.y}`);
      })
      .onUpdate((event) => {
        pointsRef.current.push({ x: event.x, y: event.y });
        const path = pointsRef.current
          .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
          .join(' ');
        setCurrentPath(path);
      })
      .onEnd(() => {
        if (currentPath) {
          const newPaths = [...paths, currentPath];
          setPaths(newPaths);
          signatureRef.current = newPaths;
          setCurrentPath('');
          pointsRef.current = [];
          onSignatureEnd?.(newPaths.join(';'));
        }
      });

    return (
      <View style={[styles.container, containerStyle]}>
        <View style={[styles.canvas, { borderColor: '#e2e8f0' }]}>
          <Svg style={styles.svg} height={150} width="100%">
            {paths.map((path, index) => (
              <Path
                key={index}
                d={path}
                stroke={penColor}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {currentPath ? (
              <Path
                d={currentPath}
                stroke={penColor}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
          </Svg>
          <GestureDetector gesture={gesture}>
            <View style={styles.gestureArea} />
          </GestureDetector>
        </View>
      </View>
    );
  }
);

SignatureCanvas.displayName = 'SignatureCanvas';

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  canvas: {
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  svg: {
    backgroundColor: 'transparent',
  },
  gestureArea: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
});
