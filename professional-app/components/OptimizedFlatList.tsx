/**
 * OptimizedFlatList Component
 *
 * Componente FlatList otimizado com melhorias de performance para renderização
 * eficiente de longas listas no React Native.
 *
 * Melhorias implementadas:
 * - getItemLayout para melhorar scroll performance (quando a altura dos itens é conhecida)
 * - initialNumToRender otimizado
 * - maxToRenderPerBatch configurado
 * - windowSize ajustado
 * - removeClippedSubviews habilitado
 * - memoização do renderItem
 */

import React, { memo, useMemo } from 'react';
import {
  FlatList as RNFlatList,
  FlatListProps as RNFlatListProps,
  ViewabilityConfig,
  ViewToken,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ListRenderItemInfo,
} from 'react-native';
import { useColors } from '@/hooks/useColorScheme';

export interface OptimizedFlatListProps<T> extends Omit<RNFlatListProps<T>, 'getItemLayout'> {
  /**
   * Altura fixa dos itens (para getItemLayout)
   * Se não fornecida, getItemLayout não será usado
   */
  itemHeight?: number;

  /**
   * Margem entre itens (para getItemLayout)
   */
  itemMargin?: number;

  /**
   * Quantidade inicial de itens a renderizar
   * Padrão: 10
   */
  initialNumToRender?: number;

  /**
   * Número máximo de itens renderizados por batch
   * Padrão: 5
   */
  maxToRenderPerBatch?: number;

  /**
   * Número de itens renderizados fora da tela (em cada lado)
   * Padrão: 5
   */
  windowSize?: number;

  /**
   * Remove elementos que estão fora da tela da hierarquia nativa
   * Padrão: true
   */
  removeClippedSubviews?: boolean;

  /**
   * HabilitagetItemLayout (requer itemHeight)
   * Padrão: true se itemHeight fornecido
   */
  enableGetItemLayout?: boolean;
}

/**
 * Configuração padrão de visibilidade para detectar quando itens entram/saem da tela
 */
export const DEFAULT_VIEWABILITY_CONFIG: ViewabilityConfig = {
  minimumViewTime: 300,
  viewAreaCoveragePercentThreshold: 10,
  itemVisiblePercentThreshold: 50,
};

/**
 * Componente renderItem memoizado
 */
function createMemoizedRenderItem<T>(
  renderItem: RNFlatListProps<T>['renderItem']
): RNFlatListProps<T>['renderItem'] {
  if (!renderItem) return undefined;

  const MemoizedRenderItem = memo(({ item, index, separators }: ListRenderItemInfo<T>) => {
    return renderItem?.({ item, index, separators }) ?? null;
  });

  return MemoizedRenderItem;
}

/**
 * Função para criar getItemLayout
 */
export function createGetItemLayout<T>(
  itemHeight: number,
  itemMargin: number = 0
) {
  return (data: T[] | null | undefined, index: number) => ({
    length: itemHeight,
    offset: (itemHeight + itemMargin) * index,
    index,
  });
}

/**
 * FlatList otimizado com configurações de performance
 */
function OptimizedFlatListInner<T>({
  itemHeight,
  itemMargin = 0,
  initialNumToRender = 10,
  maxToRenderPerBatch = 5,
  windowSize = 5,
  removeClippedSubviews = true,
  enableGetItemLayout,
  renderItem,
  data,
  keyExtractor,
  ...props
}: OptimizedFlatListProps<T>) {
  const colors = useColors();

  // Memoiza o renderItem para evitar re-renderizações desnecessárias
  const memoizedRenderItem = useMemo(
    () => createMemoizedRenderItem(renderItem),
    [renderItem]
  );

  // Cria getItemLayout se possível
  const getItemLayout = useMemo(() => {
    if (!enableGetItemLayout && !itemHeight) return undefined;
    return createGetItemLayout<T>(itemHeight!, itemMargin);
  }, [itemHeight, itemMargin, enableGetItemLayout]);

  // Memoiza keyExtractor
  const memoizedKeyExtractor = useMemo(() => {
    return keyExtractor
      ? (item: T, index: number) => keyExtractor(item, index)
      : undefined;
  }, [keyExtractor]);

  return (
    <RNFlatList<T>
      {...props}
      data={data}
      renderItem={memoizedRenderItem}
      keyExtractor={memoizedKeyExtractor}
      getItemLayout={getItemLayout}
      initialNumToRender={initialNumToRender}
      maxToRenderPerBatch={maxToRenderPerBatch}
      updateCellsBatchingPeriod={50}
      windowSize={windowSize}
      removeClippedSubviews={removeClippedSubviews}
      legacyImplementation={false}
      viewabilityConfig={props.viewabilityConfig || DEFAULT_VIEWABILITY_CONFIG}
      // Melhoria de scroll
      scrollEventThrottle={16}
      // Performance de inicialização
      onEndReachedThreshold={props.onEndReachedThreshold || 0.5}
    />
  );
}

/**
 * Exporta como componente memoizado
 */
export const OptimizedFlatList = memo(OptimizedFlatListInner) as <T>(
  props: OptimizedFlatListProps<T>
) => ReturnType<typeof OptimizedFlatListInner<T>>;

/**
 * Hook para criar getItemLayout dinâmico
 */
export function useItemLayout(height: number, margin: number = 0) {
  return useMemo(
    () => createGetItemLayout(height, margin),
    [height, margin]
  );
}

/**
 * Hook para detectar quando itens são visíveis
 */
export function useViewabilityCallback(
  callback: (info: { changed: ViewToken[]; viewableItems: ViewToken[] }) => void,
  config?: ViewabilityConfig
) {
  return useMemo(
    () => ({
      viewableItems: [],
      changed: [],
      onViewableItemsChanged: callback,
      viewabilityConfig: config || DEFAULT_VIEWABILITY_CONFIG,
    }),
    [callback, config]
  );
}

/**
 * Componente para Skeleton Loading em listas
 */
interface ListSkeletonProps {
  count?: number;
  height?: number;
  margin?: number;
}

export function ListSkeleton({
  count = 5,
  height = 80,
  margin = 12,
}: ListSkeletonProps) {
  const colors = useColors();

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={`skeleton-${index}`}
          style={[
            {
              height,
              marginBottom: index < count - 1 ? margin : 0,
              backgroundColor: colors.surface,
              borderRadius: 12,
              overflow: 'hidden',
            },
          ]}
        >
          <View style={{ padding: 16, gap: 8 }}>
            <View
              style={{
                width: '60%',
                height: 16,
                borderRadius: 8,
                backgroundColor: colors.border,
              }}
            />
            <View
              style={{
                width: '40%',
                height: 12,
                borderRadius: 6,
                backgroundColor: colors.border,
                opacity: 0.5,
              }}
            />
          </View>
        </View>
      ))}
    </>
  );
}
