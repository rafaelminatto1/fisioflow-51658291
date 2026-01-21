/**
 * Avatar - Native Component (React Native)
 *
 * Usa View + Image + NativeWind para styling compatível com Tailwind
 */

import * as React from 'react';
import { View, Image, ImageSourcePropType, ViewStyle } from 'react-native';
import { cn } from '@/lib/utils';

export interface AvatarProps {
  src?: ImageSourcePropType | string | null;
  alt?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  style?: ViewStyle;
}

const sizeStyles = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

const textSizeStyles = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
};

export const Avatar = React.forwardRef<View, AvatarProps>(
  ({
    src,
    alt = '',
    className = '',
    size = 'md',
    fallback,
    style,
  },
  ref
) => {
    const [imageError, setImageError] = React.useState(false);

    const getInitials = (name: string) => {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };

    const displayFallback = fallback || (alt ? getInitials(alt) : '?');

    return (
      <View
        ref={ref}
        className={cn(
          'relative overflow-hidden rounded-full bg-muted items-center justify-center',
          sizeStyles[size],
          className
        )}
        style={style}
      >
        {src && !imageError ? (
          <Image
            source={typeof src === 'string' ? { uri: src } : src}
            className="h-full w-full"
            onError={() => setImageError(true)}
            accessibilityLabel={alt}
          />
        ) : (
          <View
            className={cn(
              'items-center justify-center bg-primary/10',
              sizeStyles[size]
            )}
          >
            <Text
              className={cn(
                'font-semibold text-primary',
                textSizeStyles[size]
              )}
            >
              {displayFallback}
            </Text>
          </View>
        )}
      </View>
    );
  }
);

Avatar.displayName = 'Avatar';

export const AvatarImage = Image;
export const AvatarFallback = View;

export default Avatar;
