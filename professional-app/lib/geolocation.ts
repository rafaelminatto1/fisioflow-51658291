import * as Location from 'expo-location';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  timestamp: number;
}

/**
 * Solicita permissão para usar a localização
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
}

/**
 * Obtém a localização atual do dispositivo
 * @param accuracy Nível de precisão desejado
 */
export async function getCurrentLocation(
  accuracy: Location.LocationAccuracy = Location.LocationAccuracy.BestForNavigation
): Promise<LocationData | null> {
  const hasPermission = await requestLocationPermission();

  if (!hasPermission) {
    throw new Error('Permissão de localização não concedida');
  }

  try {
    const location = await Location.getCurrentPositionAsync({ accuracy });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy || 0,
      altitude: location.coords.altitude || null,
      timestamp: location.timestamp,
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    throw new Error('Não foi possível obter a localização');
  }
}

/**
 * Calcula a distância entre duas coordenadas em metros
 * Usa a fórmula de Haversine para cálculo preciso
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Raio da Terra em metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distância em metros
}

/**
 * Verifica se o usuário está dentro de um raio de uma localização
 * @param userLocation Localização do usuário
 * @param targetLocation Localização alvo
 * @param radiusInMeters Raio em metros (padrão: 100m)
 */
export function isWithinRadius(
  userLocation: LocationData,
  targetLocation: { latitude: number; longitude: number },
  radiusInMeters: number = 100
): boolean {
  const distance = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    targetLocation.latitude,
    targetLocation.longitude
  );

  return distance <= radiusInMeters;
}

/**
 * Formata coordenadas para exibição
 */
export function formatCoordinates(location: LocationData): string {
  return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
}

/**
 * Obtém o endereço reverso (requer API de geocoding)
 * @deprecated Use um serviço de geocoding como Google Maps API
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string | null> {
  // Em produção, integrar com Google Maps Geocoding API
  // Por enquanto, retorna as coordenadas formatadas
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}
