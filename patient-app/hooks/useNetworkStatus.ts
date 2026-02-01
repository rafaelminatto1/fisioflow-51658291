/**
 * useNetworkStatus Hook
 * Monitors network connection status
 */

import {useState, useEffect} from 'react';
import NetInfo from '@react-native-community/netinfo';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
  isWifi: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown',
    isWifi: false,
  });

  useEffect(() => {
    // Subscribe to network status updates
    const unsubscribe = NetInfo.addEventListener(state => {
      setStatus({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
        type: state.type || 'unknown',
        isWifi: state.type === 'wifi',
      });
    });

    // Get initial status
    NetInfo.fetch().then(state => {
      setStatus({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
        type: state.type || 'unknown',
        isWifi: state.type === 'wifi',
      });
    });

    return () => unsubscribe();
  }, []);

  return status;
}
