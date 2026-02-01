/**
 * Math Utilities
 * Common math operations and calculations
 */

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Map a value from one range to another
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * Round to a specified number of decimal places
 */
export function roundTo(value: number, decimals: number = 2): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Check if two numbers are approximately equal (within epsilon)
 */
export function approxEqual(a: number, b: number, epsilon: number = 0.0001): boolean {
  return Math.abs(a - b) < epsilon;
}

/**
 * Generate a random number between min and max (inclusive)
 */
export function random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random ID
 */
export function randomId(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Calculate percentage
 */
export function percentage(part: number, total: number): number {
  if (total === 0) return 0;
  return (part / total) * 100;
}

/**
 * Calculate percentage with optional decimals
 */
export function percentageFormatted(
  part: number,
  total: number,
  decimals: number = 1
): string {
  return percentage(part, total).toFixed(decimals) + '%';
}

/**
 * Calculate average of an array of numbers
 */
export function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

/**
 * Calculate sum of an array of numbers
 */
export function sum(numbers: number[]): number {
  return numbers.reduce((acc, n) => acc + n, 0);
}

/**
 * Find the max value in an array
 */
export function max(numbers: number[]): number | undefined {
  return numbers.length > 0 ? Math.max(...numbers) : undefined;
}

/**
 * Find the min value in an array
 */
export function min(numbers: number[]): number | undefined {
  return numbers.length > 0 ? Math.min(...numbers) : undefined;
}

/**
 * Format a number as currency (BRL)
 */
export function currencyBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Format a number with thousands separator (Brazilian format)
 */
export function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR');
}

/**
 * Convert degrees to radians
 */
export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Calculate BMI (Body Mass Index)
 */
export function calculateBMI(weightKg: number, heightMeters: number): number {
  return weightKg / (heightMeters * heightMeters);
}

/**
 * Get BMI category
 */
export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'Abaixo do peso';
  if (bmi < 25) return 'Peso normal';
  if (bmi < 30) return 'Sobrepeso';
  if (bmi < 35) return 'Obesidade grau I';
  if (bmi < 40) return 'Obesidade grau II';
  return 'Obesidade grau III';
}

/**
 * Calculate ideal weight range based on height (BMI 18.5-24.9)
 */
export function getIdealWeightRange(heightMeters: number): {
  min: number;
  max: number;
} {
  const min = 18.5 * (heightMeters * heightMeters);
  const max = 24.9 * (heightMeters * heightMeters);
  return { min: roundTo(min, 1), max: roundTo(max, 1) };
}

/**
 * Format distance
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${roundTo(meters, 0)}m`;
  }
  const km = meters / 1000;
  return `${roundTo(km, 1)}km`;
}

/**
 * Format weight
 */
export function formatWeight(kg: number): string {
  if (kg < 1000) {
    return `${roundTo(kg, 1)}kg`;
  }
  const tons = kg / 1000;
  return `${roundTo(tons, 2)}t`;
}

/**
 * Format duration in seconds to human readable
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}min ${remainingSeconds}s` : `${minutes}min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes > 0) {
    return `${hours}h ${remainingMinutes}min`;
  }
  return `${hours}h`;
}
