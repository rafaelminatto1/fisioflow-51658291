import { useState, useEffect, useCallback } from 'react';

export interface InclinometerData {
  angle: number;
  isSupported: boolean;
  permissionGranted: boolean;
  requestPermission: () => Promise<void>;
}

export const useDeviceInclinometer = (): InclinometerData => {
  const [angle, setAngle] = useState(0);
  const [isSupported, setIsSupported] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
      setIsSupported(true);
    }
  }, []);

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    // Math to get screen angle relative to gravity.
    // beta: front-to-back tilt in degrees, where front is positive (-180 to 180)
    // gamma: left-to-right tilt in degrees, where right is positive (-90 to 90)
    let degrees = 0;
    
    if (event.beta != null && event.gamma != null) {
      // Simplistic approach for portrait mode tilting:
      // If we hold the phone in portrait and tilt forward/backward, beta changes.
      // If we hold portrait and tilt left/right, gamma changes.
      // For a physical inclinometer, usually you place the side of the phone on the limb.
      // E.g., placing the long edge of the phone on a leg means tilt is primarily the phone's pitch/roll.
      // Let's use the absolute pitch/roll combination or just beta if upright.
      
      // Let's assume the user places the back of the phone or the side of the phone.
      // The most common physical inclinometer phone usage: edge on the patient.
      const y = event.beta; 
      const x = event.gamma; 
      // We can take the dominant tilt as the angle, or a vector magnitude.
      // For a true inclinometer of the screen plane against gravity:
      degrees = Math.abs(x) > Math.abs(y) ? x : y; 
    }
    
    setAngle(Math.round(degrees));
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      // iOS 13+ requires permission for DeviceOrientation
      if (
        typeof (DeviceOrientationEvent as any).requestPermission === 'function'
      ) {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        if (permissionState === 'granted') {
          setPermissionGranted(true);
          window.addEventListener('deviceorientation', handleOrientation);
        } else {
          console.warn('Permission to access device orientation was denied.');
        }
      } else {
        // Non-iOS 13+ devices
        setPermissionGranted(true);
        window.addEventListener('deviceorientation', handleOrientation);
      }
    } catch (error) {
      console.error('Error requesting orientation permission:', error);
      // Fallback: try listening anyway
      setPermissionGranted(true);
      window.addEventListener('deviceorientation', handleOrientation);
    }
  }, [handleOrientation]);

  useEffect(() => {
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [handleOrientation]);

  return {
    angle,
    isSupported,
    permissionGranted,
    requestPermission
  };
};
