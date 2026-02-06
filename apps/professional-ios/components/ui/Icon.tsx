
// Icon name type - export all available icon names

import React from 'react';
import { ViewStyle } from 'react-native';
import { LucideIcons } from '@/types/icons';

export type IconName = keyof typeof LucideIcons;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

// Map icon names to Lucide icon components
const iconMap = LucideIcons;

export function Icon({ name, size = 24, color = '#000', style }: IconProps) {
  const IconComponent = iconMap[name];

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  // Lucide icons expect width, height for size
  // strokeWidth can be added as a prop if needed
  return (
    <IconComponent
      width={size}
      height={size}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    />
  );
}

// Re-export for convenience
export { Icon as default };
