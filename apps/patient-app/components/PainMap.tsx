/**
 * PainMap Component
 *
 * Componente interativo de mapa de dor que permite aos pacientes
 * selecionar áreas do corpo onde sentem dor e indicar o nível.
 *
 * @module components/PainMap
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { Card } from './Card';

/**
 * Regiões do corpo humano para seleção de dor
 */
export type BodyRegion =
  // Cabeça
  | 'head' | 'neck'
  // Tronco superior
  | 'leftShoulder' | 'rightShoulder' | 'chest' | 'upperBack'
  // Braços
  | 'leftArm' | 'rightArm' | 'leftForearm' | 'rightForearm'
  // Mãos
  | 'leftHand' | 'rightHand'
  // Tronco meio
  | 'abdomen' | 'lowerBack' | 'buttocks'
  // Pernas
  | 'leftThigh' | 'rightThigh' | 'leftCalf' | 'rightCalf'
  // Pés
  | 'leftFoot' | 'rightFoot';

/**
 * Entrada de dor para uma região específica
 */
export interface PainEntry {
  region: BodyRegion;
  level: number; // 0-10
  type?: 'sharp' | 'dull' | 'aching' | 'burning' | 'throbbing' | 'other';
}

/**
 * Props do componente PainMap
 */
export interface PainMapProps {
  value?: PainEntry[];
  onChange?: (painEntries: PainEntry[]) => void;
  readOnly?: boolean;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Cores baseadas no nível de dor (EVA - Escala Visual Analógica)
 */
function getPainColor(level: number, colors: any): string {
  if (level === 0) return colors.border || '#e5e7eb';
  if (level <= 3) return colors.success || '#22c55e'; // Dor leve
  if (level <= 6) return colors.warning || '#f59e0b'; // Dor moderada
  return colors.error || '#ef4444'; // Dor intensa
}

/**
 * Componente principal do mapa de dor
 */
export function PainMap({
  value = [],
  onChange,
  readOnly = false,
  size = 'medium',
}: PainMapProps) {
  const colors = useColors();
  const [selectedRegion, setSelectedRegion] = useState<BodyRegion | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const painMap = new Map<BodyRegion, PainEntry>();
  value.forEach((entry) => painMap.set(entry.region, entry));

  const screenWidth = Dimensions.get('window').width;
  const scaleFactor = size === 'small' ? 0.7 : size === 'large' ? 1.2 : 1;
  const mapWidth = Math.min(screenWidth - 32, 300) * scaleFactor;
  const mapHeight = mapWidth * 1.8;

  const handleRegionPress = (region: BodyRegion) => {
    if (readOnly) return;

    setSelectedRegion(region);
    setShowDetailModal(true);
  };

  const handlePainLevelSelect = (level: number, type?: PainEntry['type']) => {
    if (!selectedRegion) return;

    const newEntry: PainEntry = { region: selectedRegion, level, type };
    const existingIndex = value.findIndex((e) => e.region === selectedRegion);

    let newValue: PainEntry[];
    if (level === 0) {
      // Remove se nível for 0 (sem dor)
      newValue = value.filter((e) => e.region !== selectedRegion);
    } else if (existingIndex >= 0) {
      newValue = [...value];
      newValue[existingIndex] = newEntry;
    } else {
      newValue = [...value, newEntry];
    }

    onChange?.(newValue);
    setShowDetailModal(false);
    setSelectedRegion(null);
  };

  const getRegionColor = (region: BodyRegion): string => {
    const entry = painMap.get(region);
    return getPainColor(entry?.level || 0, colors);
  };

  return (
    <>
      <View style={[styles.container, { width: mapWidth }]}>
        {/* Body silhouette with interactive regions */}
        <View style={[styles.bodyContainer, { height: mapHeight }]}>
          {/* Head */}
          <TouchableOpacity
            style={[styles.region, styles.head]}
            onPress={() => handleRegionPress('head')}
            activeOpacity={0.7}
            disabled={readOnly}
          >
            <View style={[styles.regionShape, { backgroundColor: getRegionColor('head') }]} />
          </TouchableOpacity>

          {/* Neck */}
          <TouchableOpacity
            style={[styles.region, styles.neck]}
            onPress={() => handleRegionPress('neck')}
            activeOpacity={0.7}
            disabled={readOnly}
          >
            <View style={[styles.regionShape, { backgroundColor: getRegionColor('neck') }]} />
          </TouchableOpacity>

          {/* Shoulders */}
          <TouchableOpacity
            style={[styles.region, styles.leftShoulder]}
            onPress={() => handleRegionPress('leftShoulder')}
            activeOpacity={0.7}
            disabled={readOnly}
          >
            <View style={[styles.regionShape, { backgroundColor: getRegionColor('leftShoulder') }]} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.region, styles.rightShoulder]}
            onPress={() => handleRegionPress('rightShoulder')}
            activeOpacity={0.7}
            disabled={readOnly}
          >
            <View style={[styles.regionShape, { backgroundColor: getRegionColor('rightShoulder') }]} />
          </TouchableOpacity>

          {/* Chest and Upper Back */}
          <TouchableOpacity
            style={[styles.region, styles.chest]}
            onPress={() => handleRegionPress('chest')}
            activeOpacity={0.7}
            disabled={readOnly}
          >
            <View style={[styles.regionShape, { backgroundColor: getRegionColor('chest') }]} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.region, styles.upperBack]}
            onPress={() => handleRegionPress('upperBack')}
            activeOpacity={0.7}
            disabled={readOnly}
          >
            <View style={[styles.regionShape, { backgroundColor: getRegionColor('upperBack') }]} />
          </TouchableOpacity>

          {/* Arms */}
          <TouchableOpacity
            style={[styles.region, styles.leftArm]}
            onPress={() => handleRegionPress('leftArm')}
            activeOpacity={0.7}
            disabled={readOnly}
          >
            <View style={[styles.regionShape, { backgroundColor: getRegionColor('leftArm') }]} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.region, styles.rightArm]}
            onPress={() => handleRegionPress('rightArm')}
            activeOpacity={0.7}
            disabled={readOnly}
          >
            <View style={[styles.regionShape, { backgroundColor: getRegionColor('rightArm') }]} />
          </TouchableOpacity>

          {/* Forearms */}
          <TouchableOpacity
            style={[styles.region, styles.leftForearm]}
            onPress={() => handleRegionPress('leftForearm')}
            activeOpacity={0.7}
            disabled={readOnly}
          >
            <View style={[styles.regionShape, { backgroundColor: getRegionColor('leftForearm') }]} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.region, styles.rightForearm]}
            onPress={() => handleRegionPress('rightForearm')}
            activeOpacity={0.7}
            disabled={readOnly}
          >
            <View style={[styles.regionShape, { backgroundColor: getRegionColor('rightForearm') }]} />
          </TouchableOpacity>

          {/* Hands */}
          <TouchableOpacity
            style={[styles.region, styles.leftHand]}
            onPress={() => handleRegionPress('leftHand')}
            activeOpacity={0.7}
            disabled={readOnly}
          >
            <View style={[styles.regionShape, { backgroundColor: getRegionColor('leftHand') }]} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.region, styles.rightHand]}
            onPress={() => handleRegionPress('rightHand')}
            activeOpacity={0.7}
            disabled={readOnly}
          >
            <View style={[styles.regionShape, { backgroundColor: getRegionColor('rightHand') }]} />
          </TouchableOpacity>

          {/* Abdomen */}
          <TouchableOpacity
            style={[styles.region, styles.abdomen]}
            onPress={() => handleRegionPress('abdomen')}
            activeOpacity={0.7}
            disabled={readOnly}
          >
            <View style={[styles.regionShape, { backgroundColor: getRegionColor('abdomen') }]} />
          </TouchableOpacity>

          {/* Lower Back */}
          <TouchableOpacity
            style={[styles.region, styles.lowerBack]}
            onPress={() => handleRegionPress('lowerBack')}
            activeOpacity={0.7}
            disabled={readOnly}
          >
            <View style={[styles.regionShape, { backgroundColor: getRegionColor('lowerBack') }]} />
          </TouchableOpacity>

          {/* Buttocks */}
          <TouchableOpacity
            style={[styles.region, styles.buttocks]}
            onPress={() => handleRegionPress('buttocks')}
            activeOpacity={0.7}
            disabled={readOnly}
          >
            <View style={[styles.regionShape, { backgroundColor: getRegionColor('buttocks') }]} />
          </TouchableOpacity>

          {/* Thighs */}
          <TouchableOpacity
            style={[styles.region, styles.leftThigh]}
            onPress={() => handleRegionPress('leftThigh')}
            activeOpacity={0.7}
            disabled={readOnly}
          >
            <View style={[styles.regionShape, { backgroundColor: getRegionColor('leftThigh') }]} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.region, styles.rightThigh]}
            onPress={() => handleRegionPress('rightThigh')}
            activeOpacity={0.7}
            disabled={readOnly}
          >
            <View style={[styles.regionShape, { backgroundColor: getRegionColor('rightThigh') }]} />
          </TouchableOpacity>

          {/* Calves */}
          <TouchableOpacity
            style={[styles.region, styles.leftCalf]}
            onPress={() => handleRegionPress('leftCalf')}
            activeOpacity={0.7}
            disabled={readOnly}
          >
            <View style={[styles.regionShape, { backgroundColor: getRegionColor('leftCalf') }]} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.region, styles.rightCalf]}
            onPress={() => handleRegionPress('rightCalf')}
            activeOpacity={0.7}
            disabled={readOnly}
          >
            <View style={[styles.regionShape, { backgroundColor: getRegionColor('rightCalf') }]} />
          </TouchableOpacity>

          {/* Feet */}
          <TouchableOpacity
            style={[styles.region, styles.leftFoot]}
            onPress={() => handleRegionPress('leftFoot')}
            activeOpacity={0.7}
            disabled={readOnly}
          >
            <View style={[styles.regionShape, { backgroundColor: getRegionColor('leftFoot') }]} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.region, styles.rightFoot]}
            onPress={() => handleRegionPress('rightFoot')}
            activeOpacity={0.7}
            disabled={readOnly}
          >
            <View style={[styles.regionShape, { backgroundColor: getRegionColor('rightFoot') }]} />
          </TouchableOpacity>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: colors.border }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Sem dor</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: colors.success }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Leve</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: colors.warning }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Moderada</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: colors.error }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Intensa</Text>
          </View>
        </View>
      </View>

      {/* Pain Level Selection Modal */}
      <PainLevelModal
        visible={showDetailModal}
        region={selectedRegion}
    onClose={() => setShowDetailModal(false)}
        onSelect={handlePainLevelSelect}
        currentValue={painMap.get(selectedRegion || ('head' as BodyRegion))}
      />
    </>
  );
}

/**
 * Modal para seleção do nível de dor
 */
interface PainLevelModalProps {
  visible: boolean;
  region: BodyRegion | null;
  onClose: () => void;
  onSelect: (level: number, type?: PainEntry['type']) => void;
  currentValue?: PainEntry;
}

function PainLevelModal({ visible, region, onClose, onSelect, currentValue }: PainLevelModalProps) {
  const colors = useColors();
  const [selectedType, setSelectedType] = useState<PainEntry['type']>(currentValue?.type);

  const regionNames: Record<BodyRegion, string> = {
    head: 'Cabeça',
    neck: 'Pescoço',
    leftShoulder: 'Ombro Esquerdo',
    rightShoulder: 'Ombro Direito',
    chest: 'Peito',
    upperBack: 'Costas Superiores',
    leftArm: 'Braço Esquerdo',
    rightArm: 'Braço Direito',
    leftForearm: 'Antebraço Esquerdo',
    rightForearm: 'Antebraço Direito',
    leftHand: 'Mão Esquerda',
    rightHand: 'Mão Direita',
    abdomen: 'Abdômen',
    lowerBack: 'Lombar',
    buttocks: 'Glúteos',
    leftThigh: 'Coxa Esquerda',
    rightThigh: 'Coxa Direita',
    leftCalf: 'Panturrilha Esquerda',
    rightCalf: 'Panturrilha Direita',
    leftFoot: 'Pé Esquerdo',
    rightFoot: 'Pé Direito',
  };

  const painTypes: Array<{ value: PainEntry['type']; label: string }> = [
    { value: 'sharp', label: 'Aguda' },
    { value: 'dull', label: 'Surda' },
    { value: 'aching', label: 'Dormente' },
    { value: 'burning', label: 'Queimação' },
    { value: 'throbbing', label: 'Pulsátil' },
  ];

  const handleLevelSelect = (level: number) => {
    onSelect(level, selectedType);
    setSelectedType(undefined);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Card style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {region ? regionNames[region] : ''}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
            Qual o nível de dor? (0-10)
          </Text>

          {/* Pain Level Slider */}
          <View style={styles.painLevelsContainer}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.painLevelButton,
                  { backgroundColor: getPainColor(level, colors) },
                  level === currentValue?.level && styles.painLevelButtonSelected,
                ]}
                onPress={() => handleLevelSelect(level)}
              >
                <Text
                  style={[
                    styles.painLevelText,
                    { color: level <= 3 ? '#FFFFFF' : level <= 6 ? '#FFFFFF' : '#FFFFFF' },
                  ]}
                >
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Pain Type Selection */}
          {currentValue?.level && currentValue.level > 0 && (
            <>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }, { marginTop: 20 }]}>
                Tipo de dor (opcional)
              </Text>
              <View style={styles.painTypesContainer}>
                {painTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.painTypeButton,
                      {
                        backgroundColor: selectedType === type.value ? colors.primary + '20' : colors.surface,
                        borderColor: selectedType === type.value ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedType(type.value)}
                  >
                    <Text
                      style={[
                        styles.painTypeText,
                        { color: selectedType === type.value ? colors.primary : colors.text },
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </Card>
      </View>
    </Modal>
  );
}

/**
 * Componente compacto para visualização rápida do mapa de dor
 */
export interface PainMapSummaryProps {
  painEntries: PainEntry[];
  onPress?: () => void;
}

export function PainMapSummary({ painEntries, onPress }: PainMapSummaryProps) {
  const colors = useColors();
  const maxPainLevel = Math.max(...painEntries.map((e) => e.level), 0);
  const regionCount = painEntries.length;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} disabled={!onPress}>
      <Card style={styles.summaryCard}>
        <View style={styles.summaryContent}>
          <View style={styles.summaryIconContainer}>
            <Ionicons name="body" size={32} color={getPainColor(maxPainLevel, colors)} />
          </View>
          <View style={styles.summaryText}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>Mapa de Dor</Text>
            <Text style={[styles.summarySubtitle, { color: colors.textSecondary }]}>
              {regionCount} região{regionCount !== 1 ? 's' : ''} afetada{regionCount !== 1 ? 's' : ''}
            </Text>
          </View>
          {maxPainLevel > 0 && (
            <View style={[styles.summaryBadge, { backgroundColor: getPainColor(maxPainLevel, colors) }]}>
              <Text style={styles.summaryBadgeText}>{maxPainLevel}/10</Text>
            </View>
          )}
          {onPress && (
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  bodyContainer: {
    width: '100%',
    position: 'relative',
    marginBottom: 16,
  },
  region: {
    position: 'absolute',
  },
  regionShape: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  // Positioning for body regions (percentages)
  head: {
    top: '0%',
    left: '35%',
    width: '30%',
    height: '10%',
  },
  neck: {
    top: '10%',
    left: '42%',
    width: '16%',
    height: '5%',
  },
  leftShoulder: {
    top: '13%',
    left: '20%',
    width: '18%',
    height: '8%',
  },
  rightShoulder: {
    top: '13%',
    right: '20%',
    width: '18%',
    height: '8%',
  },
  chest: {
    top: '15%',
    left: '35%',
    width: '30%',
    height: '12%',
  },
  upperBack: {
    top: '15%',
    left: '38%',
    width: '24%',
    height: '12%',
    zIndex: 1,
  },
  leftArm: {
    top: '18%',
    left: '5%',
    width: '15%',
    height: '18%',
  },
  rightArm: {
    top: '18%',
    right: '5%',
    width: '15%',
    height: '18%',
  },
  leftForearm: {
    top: '36%',
    left: '8%',
    width: '12%',
    height: '15%',
  },
  rightForearm: {
    top: '36%',
    right: '8%',
    width: '12%',
    height: '15%',
  },
  leftHand: {
    top: '51%',
    left: '10%',
    width: '10%',
    height: '6%',
  },
  rightHand: {
    top: '51%',
    right: '10%',
    width: '10%',
    height: '6%',
  },
  abdomen: {
    top: '27%',
    left: '35%',
    width: '30%',
    height: '10%',
  },
  lowerBack: {
    top: '27%',
    left: '38%',
    width: '24%',
    height: '10%',
    zIndex: 1,
  },
  buttocks: {
    top: '37%',
    left: '35%',
    width: '30%',
    height: '8%',
  },
  leftThigh: {
    top: '45%',
    left: '32%',
    width: '14%',
    height: '20%',
  },
  rightThigh: {
    top: '45%',
    right: '32%',
    width: '14%',
    height: '20%',
  },
  leftCalf: {
    top: '65%',
    left: '33%',
    width: '12%',
    height: '18%',
  },
  rightCalf: {
    top: '65%',
    right: '33%',
    width: '12%',
    height: '18%',
  },
  leftFoot: {
    top: '83%',
    left: '32%',
    width: '14%',
    height: '6%',
  },
  rightFoot: {
    top: '83%',
    right: '32%',
    width: '14%',
    height: '6%',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  painLevelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  painLevelButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  painLevelButtonSelected: {
    borderWidth: 3,
    borderColor: '#000',
    transform: [{ scale: 1.1 }],
  },
  painLevelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  painTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  painTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  painTypeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  summaryCard: {
    padding: 16,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginRight: 12,
  },
  summaryText: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  summarySubtitle: {
    fontSize: 13,
  },
  summaryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  summaryBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default PainMap;
