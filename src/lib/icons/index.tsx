/**
 * Icons - Native Component (React Native)
 *
 * Wrapper simples para ícones que podem ser usados em componentes nativos
 * Para produção, substituir por biblioteca de ícones como:
 * - @expo/vector-icons (Ionicons)
 * - react-native-vector-icons
 * - lucide-react-native
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface IconProps {
  size?: number;
  className?: string;
  style?: any;
}

// Ícones simples baseados em texto (para desenvolvimento rápido)
export const Check = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>✓</Text>
);

export const X = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>✕</Text>
);

export const ChevronDown = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>▼</Text>
);

export const ChevronRight = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>▶</Text>
);

export const ChevronUp = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>▲</Text>
);

export const ChevronLeft = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>◀</Text>
);

export const AlertTriangle = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>⚠</Text>
);

export const Info = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>ℹ</Text>
);

export const CheckCircle = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>✓</Text>
);

export const XCircle = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>✕</Text>
);

export const Search = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>🔍</Text>
);

export const Plus = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>+</Text>
);

export const Minus = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>−</Text>
);

export const Filter = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>⚙</Text>
);

export const Calendar = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>📅</Text>
);

export const Clock = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>🕐</Text>
);

export const User = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>👤</Text>
);

export const Settings = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>⚙</Text>
);

export const Home = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>🏠</Text>
);

export const Menu = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>☰</Text>
);

export const Bell = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>🔔</Text>
);

export const Heart = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>♥</Text>
);

export const Star = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>★</Text>
);

export const Trash = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>🗑</Text>
);

export const Edit = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>✎</Text>
);

export const Eye = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>👁</Text>
);

export const EyeOff = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>🙈</Text>
);

export const Download = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>⬇</Text>
);

export const Upload = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>⬆</Text>
);

export const Mail = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>✉</Text>
);

export const Phone = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>☎</Text>
);

export const MapPin = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>📍</Text>
);

export const Link = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>🔗</Text>
);

export const ExternalLink = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>↗</Text>
);

export const Copy = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>⧉</Text>
);

export const LogOut = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>⎋</Text>
);

export const Moon = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>🌙</Text>
);

export const Sun = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>☀</Text>
);

export const ZoomIn = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>🔍+</Text>
);

export const ZoomOut = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>🔍-</Text>
);

export const RefreshCw = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>↻</Text>
);

export const MoreVertical = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>⋮</Text>
);

export const MoreHorizontal = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>⋯</Text>
);

export const ArrowUp = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>↑</Text>
);

export const ArrowDown = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>↓</Text>
);

export const ArrowLeft = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>←</Text>
);

export const ArrowRight = ({ size = 16, className = '', style }: IconProps) => (
  <Text style={[{ fontSize: size }, style]} className={className}>→</Text>
);
