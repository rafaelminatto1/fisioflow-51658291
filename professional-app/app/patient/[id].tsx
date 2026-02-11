import { useState, useEffect } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { Card } from '@/components';
import { useHaptics } from '@/hooks/useHaptics';
import { useQuery } from '@tanstack/react-query';
import { getPatientByIdHook } from '@/hooks/usePatients';
import { format } from 'date-fns';
import { usePatientExercises, useEvolutions } from '@/hooks';
import {
  usePatientFinancialRecords,
  usePatientFinancialSummary,
  useCreateFinancialRecord,
  useUpdateFinancialRecord,
  useDeleteFinancialRecord,
  useMarkAsPaid,
} from '@/hooks/usePatientFinancial';
import type { ApiFinancialRecord } from '@/lib/api';

export default function PatientDetailScreen() {
  const params = useLocalSearchParams();
  const { id, patientName, tab, autoCreate, date: initialDateParam } = params;
  const colors = useColors();
  const { light, medium } = useHaptics();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'info' | 'financial' | 'evolutions' | 'exercises'>((tab as any) || 'info');

  const { data: patient, isLoading: isLoadingPatient, refetch } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => id ? getPatientByIdHook(id as string) : null,
    enabled: !!id,
  });

  const { evolutions, isLoading: isLoadingEvolutions, refetch: refetchEvolutions } = useEvolutions(id as string);

  const { data: financialRecords, isLoading: isLoadingFinancial, refetch: refetchFinancial } = usePatientFinancialRecords(id as string);
  const { data: financialSummary, refetch: refetchSummary } = usePatientFinancialSummary(id as string);

  const createFinancialMutation = useCreateFinancialRecord();
  const updateFinancialMutation = useUpdateFinancialRecord();
  const deleteFinancialMutation = useDeleteFinancialRecord();
  const markAsPaidMutation = useMarkAsPaid();

  const [showFinancialModal, setShowFinancialModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ApiFinancialRecord | null>(null);
  const [formData, setFormData] = useState({
    session_date: (initialDateParam as string) || format(new Date(), 'yyyy-MM-dd'),
    session_value: '',
    payment_method: '',
    notes: '',
  });

  useEffect(() => {
    if (autoCreate === 'true' && selectedTab === 'financial') {
      setShowFinancialModal(true);
    }
  }, [autoCreate, selectedTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    light();
    await refetch();
    await refetchEvolutions();
    await refetchFinancial();
    await refetchSummary();
    setRefreshing(false);
  };

  const name = patient?.name || (patientName as string) || 'Paciente';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Patient Header */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: colors.successLight },
              ]}
            >
              <Text style={[styles.statusText, { color: colors.success }]}>
                Ativo
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              medium();
              router.push(`/appointment-form?patientId=${id}&patientName=${name}`);
            }}
          >
            <Ionicons name="calendar" size={20} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Agendar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.success }]}
            onPress={() => {
              medium();
              router.push(`/exercises?patientId=${id}&patientName=${name}`);
            }}
          >
            <Ionicons name="fitness" size={20} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Exercicios</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.info }]}
            onPress={() => {
              medium();
              router.push(`/patient/${id}/evolution?id=${id}&patientName=${name}`);
            }}
          >
            <Ionicons name="document-text" size={20} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Evolucao</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Selector */}
        <View style={[styles.tabContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {(['info', 'financial', 'evolutions'] as const).map((tabKey) => (
            <TouchableOpacity
              key={tabKey}
              style={[
                styles.tab,
                selectedTab === tabKey && { backgroundColor: colors.primary },
              ]}
              onPress={() => {
                medium();
                setSelectedTab(tabKey);
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: selectedTab === tabKey ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {tabKey === 'info' ? 'Informações' : tabKey === 'financial' ? 'Financeiro' : 'Evoluções'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {selectedTab === 'info' && (
          <>
            <View style={styles.infoSection}>
                {/* Personal Information */}
                <Card style={styles.infoCard}>
                    <View style={styles.infoCardHeader}>
                        <Ionicons name="person-circle-outline" size={20} color={colors.primary} />
                        <Text style={[styles.infoSectionTitle, { color: colors.text }]}>Informações Pessoais</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Nome:</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>{patient?.name || 'N/A'}</Text>
                    </View>
                    {patient?.birthDate && (
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Nascimento:</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>
                        {format(new Date(patient.birthDate), 'dd/MM/yyyy')}
                        </Text>
                    </View>
                    )}
                </Card>

                {/* Contact Information */}
                <Card style={styles.infoCard}>
                    <View style={styles.infoCardHeader}>
                        <Ionicons name="call-outline" size={20} color={colors.primary} />
                        <Text style={[styles.infoSectionTitle, { color: colors.text }]}>Contato</Text>
                    </View>
                    {patient?.email && (
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email:</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>{patient.email}</Text>
                    </View>
                    )}
                    {patient?.phone && (
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Telefone:</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>{patient.phone}</Text>
                    </View>
                    )}
                </Card>

                {/* Clinical Data */}
                <Card style={styles.infoCard}>
                    <View style={styles.infoCardHeader}>
                        <Ionicons name="pulse-outline" size={20} color={colors.primary} />
                        <Text style={[styles.infoSectionTitle, { color: colors.text }]}>Dados Clínicos</Text>
                    </View>
                    {patient?.condition && (
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Condição:</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>{patient.condition}</Text>
                    </View>
                    )}
                    {patient?.diagnosis && (
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Diagnóstico:</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>{patient.diagnosis}</Text>
                    </View>
                    )}
                </Card>

                {/* Observations */}
                {patient?.notes && (
                    <Card style={styles.infoCard}>
                        <View style={styles.infoCardHeader}>
                            <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                            <Text style={[styles.infoSectionTitle, { color: colors.text }]}>Observações</Text>
                        </View>
                        <Text style={[styles.notesText, { color: colors.text }]}>
                            {patient.notes}
                        </Text>
                    </Card>
                )}
            </View>

            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                light();
                router.push(`/patient-form?id=${id}` as any);
              }}
            >
              <Ionicons name="create-outline" size={18} color="#FFFFFF" />
              <Text style={styles.editButtonText}>Editar Perfil</Text>
            </TouchableOpacity>
          </>
        )}

        {selectedTab === 'evolutions' && (
          <View style={styles.evolutionsContainer}>
            <TouchableOpacity
              style={[styles.addEvolutionBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                medium();
                router.push(`/patient/${id}/evolution?id=${id}&patientName=${name}`);
              }}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
              <Text style={styles.addEvolutionBtnText}>Nova Evolução SOAP</Text>
            </TouchableOpacity>

            {isLoadingEvolutions ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
            ) : evolutions.length > 0 ? (
              evolutions.map((evolution) => (
                <TouchableOpacity
                  key={evolution.id}
                  onPress={() => {
                    medium();
                    router.push(`/patient/${id}/evolution?id=${id}&evolutionId=${evolution.id}&patientName=${name}`);
                  }}
                >
                  <Card style={styles.evolutionCard}>
                    <View style={styles.evolutionHeader}>
                      <Text style={[styles.evolutionDate, { color: colors.text }]}>
                        {format(new Date(evolution.date!), 'dd/MM/yyyy HH:mm')}
                      </Text>
                      {evolution.painLevel !== undefined && (
                        <View style={[styles.painBadge, { backgroundColor: evolution.painLevel > 5 ? colors.errorLight : colors.successLight }]}>
                          <Text style={[styles.painText, { color: evolution.painLevel > 5 ? colors.error : colors.success }]}>
                            Dor: {evolution.painLevel}
                          </Text>
                        </View>
                      )}
                       {evolution.attachments && evolution.attachments.length > 0 && (
                        <View style={[styles.attachmentsBadge, { backgroundColor: colors.infoLight }]}>
                            <Ionicons name="attach" size={14} color={colors.info} />
                            <Text style={[styles.attachmentsText, { color: colors.info }]}>{evolution.attachments.length}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.soapPreview}>
                      {evolution.subjective && (
                        <Text style={[styles.soapItem, { color: colors.text }]} numberOfLines={1}>
                          <Text style={{ fontWeight: 'bold' }}>S: </Text>{evolution.subjective}
                        </Text>
                      )}
                      {evolution.objective && (
                        <Text style={[styles.soapItem, { color: colors.text }]} numberOfLines={1}>
                          <Text style={{ fontWeight: 'bold' }}>O: </Text>{evolution.objective}
                        </Text>
                      )}
                       {evolution.assessment && (
                        <Text style={[styles.soapItem, { color: colors.text }]} numberOfLines={1}>
                          <Text style={{ fontWeight: 'bold' }}>A: </Text>{evolution.assessment}
                        </Text>
                      )}
                       {evolution.plan && (
                        <Text style={[styles.soapItem, { color: colors.text }]} numberOfLines={1}>
                          <Text style={{ fontWeight: 'bold' }}>P: </Text>{evolution.plan}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} style={styles.evolutionArrow} />
                  </Card>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyEvolution}>
                <Ionicons name="document-text-outline" size={64} color={colors.textMuted} />
                <Text style={[styles.emptyEvolutionTitle, { color: colors.text }]}>
                  Nenhuma evolução registrada
                </Text>
                <Text style={[styles.emptyEvolutionText, { color: colors.textSecondary }]}>
                  Registre a primeira evolução deste paciente
                </Text>
              </View>
            )}
          </View>
        )}

        {selectedTab === 'financial' && (
          <View style={styles.financialContainer}>
            {/* Summary Card */}
            {financialSummary && (
              <Card style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Pago</Text>
                    <Text style={[styles.summaryValue, { color: colors.success }]}>
                      R$ {financialSummary.total_paid.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Pendente</Text>
                    <Text style={[styles.summaryValue, { color: colors.warning }]}>
                      R$ {financialSummary.total_pending.toFixed(2)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Sessões</Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>
                      {financialSummary.paid_sessions}/{financialSummary.total_sessions}
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Média/Sessão</Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>
                      R$ {financialSummary.average_session_value.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            {/* Add Financial Record Button */}
            <TouchableOpacity
              style={[styles.addFinancialBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                medium();
                setEditingRecord(null);
                setFormData({
                  session_date: format(new Date(), 'yyyy-MM-DD'),
                  session_value: '',
                  payment_method: '',
                  notes: '',
                });
                setShowFinancialModal(true);
              }}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
              <Text style={styles.addFinancialBtnText}>Adicionar Pagamento</Text>
            </TouchableOpacity>

            {/* Financial Records List */}
            {isLoadingFinancial ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Carregando registros financeiros...
                </Text>
              </View>
            ) : financialRecords && financialRecords.length > 0 ? (
              <View style={styles.recordsList}>
                {financialRecords.map((record) => (
                  <Card key={record.id} style={styles.recordCard}>
                    <View style={styles.recordHeader}>
                      <View style={styles.recordDateContainer}>
                        <Text style={[styles.recordDate, { color: colors.text }]}>
                          {format(new Date(record.session_date), 'dd/MM/yyyy')}
                        </Text>
                        {(record as any).partnership && (
                          <View style={[styles.partnershipBadge, { backgroundColor: colors.infoLight }]}>
                            <Ionicons name="pricetag" size={12} color={colors.info} />
                            <Text style={[styles.partnershipBadgeText, { color: colors.info }]}>
                              {(record as any).partnership.name}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              record.payment_status === 'paid'
                                ? colors.successLight
                                : record.payment_status === 'partial'
                                ? colors.warningLight
                                : colors.errorLight,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            {
                              color:
                                record.payment_status === 'paid'
                                  ? colors.success
                                  : record.payment_status === 'partial'
                                  ? colors.warning
                                  : colors.error,
                            },
                          ]}
                        >
                          {record.payment_status === 'paid' ? 'Pago' : record.payment_status === 'partial' ? 'Parcial' : 'Pendente'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.recordValues}>
                      {record.discount_value > 0 && (
                        <View style={styles.valueRow}>
                          <Text style={[styles.valueLabel, { color: colors.textSecondary }]}>Valor da sessão:</Text>
                          <Text style={[styles.valueOriginal, { color: colors.textMuted }]}>
                            R$ {record.session_value.toFixed(2)}
                          </Text>
                        </View>
                      )}
                      {record.discount_value > 0 && (
                        <View style={styles.valueRow}>
                          <Text style={[styles.valueLabel, { color: colors.textSecondary }]}>Desconto:</Text>
                          <Text style={[styles.valueDiscount, { color: colors.success }]}>
                            - R$ {record.discount_value.toFixed(2)}
                          </Text>
                        </View>
                      )}
                      <View style={styles.valueRow}>
                        <Text style={[styles.valueLabel, { color: colors.textSecondary }]}>Valor final:</Text>
                        <Text style={[styles.valueFinal, { color: colors.text, fontWeight: 'bold' }]}>
                          R$ {record.final_value.toFixed(2)}
                        </Text>
                      </View>
                      {record.payment_status === 'paid' && record.paid_date && (
                        <View style={styles.valueRow}>
                          <Text style={[styles.valueLabel, { color: colors.textSecondary }]}>Pago em:</Text>
                          <Text style={[styles.valuePaid, { color: colors.success }]}>
                            {format(new Date(record.paid_date), 'dd/MM/yyyy')}
                          </Text>
                        </View>
                      )}
                    </View>

                    {record.payment_method && (
                      <View style={styles.paymentMethodContainer}>
                        <Ionicons name="card" size={14} color={colors.textSecondary} />
                        <Text style={[styles.paymentMethodText, { color: colors.textSecondary }]}>
                          {record.payment_method === 'cash' ? 'Dinheiro' :
                           record.payment_method === 'credit_card' ? 'Cartão de Crédito' :
                           record.payment_method === 'debit_card' ? 'Cartão de Débito' :
                           record.payment_method === 'pix' ? 'PIX' :
                           record.payment_method === 'transfer' ? 'Transferência' :
                           record.payment_method === 'barter' ? 'Permuta' : record.payment_method}
                        </Text>
                      </View>
                    )}

                    {record.notes && (
                      <Text style={[styles.recordNotes, { color: colors.textSecondary }]}>{record.notes}</Text>
                    )}

                    <View style={styles.recordActions}>
                      {record.payment_status !== 'paid' && (
                        <TouchableOpacity
                          style={[styles.markPaidBtn, { backgroundColor: colors.success }]}
                          onPress={() => {
                            medium();
                            Alert.alert(
                              'Marcar como Pago',
                              'Deseja marcar este registro como pago?',
                              [
                                { text: 'Cancelar', style: 'cancel' },
                                {
                                  text: 'Confirmar',
                                  onPress: () => {
                                    markAsPaidMutation.mutate(
                                      { recordId: record.id, paymentMethod: 'cash' },
                                      {
                                        onSuccess: () => {
                                          Alert.alert('Sucesso', 'Registro marcado como pago!');
                                        },
                                        onError: (error: any) => {
                                          Alert.alert('Erro', error.message || 'Não foi possível marcar como pago.');
                                        },
                                      }
                                    );
                                  },
                                },
                              ]
                            );
                          }}
                        >
                          <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                          <Text style={styles.markPaidBtnText}>Marcar Pago</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.editRecordBtn, { borderColor: colors.border }]}
                        onPress={() => {
                          medium();
                          setEditingRecord(record);
                          setFormData({
                            session_date: record.session_date.split('T')[0],
                            session_value: record.session_value.toString(),
                            payment_method: record.payment_method || '',
                            notes: record.notes || '',
                          });
                          setShowFinancialModal(true);
                        }}
                      >
                        <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.deleteRecordBtn, { borderColor: colors.error }]}
                        onPress={() => {
                          medium();
                          Alert.alert(
                            'Excluir Registro',
                            'Deseja excluir este registro financeiro?',
                            [
                              { text: 'Cancelar', style: 'cancel' },
                              {
                                text: 'Excluir',
                                style: 'destructive',
                                onPress: () => {
                                  deleteFinancialMutation.mutate(record.id, {
                                    onSuccess: () => {
                                      Alert.alert('Sucesso', 'Registro excluído!');
                                    },
                                    onError: (error: any) => {
                                      Alert.alert('Erro', error.message || 'Não foi possível excluir o registro.');
                                    },
                                  });
                                },
                              },
                            ]
                          );
                        }}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))}
              </View>
            ) : (
              <View style={styles.emptyFinancial}>
                <Ionicons name="cash-outline" size={64} color={colors.textMuted} />
                <Text style={[styles.emptyFinancialTitle, { color: colors.text }]}>
                  Nenhum registro financeiro
                </Text>
                <Text style={[styles.emptyFinancialText, { color: colors.textSecondary }]}>
                  Adicione pagamentos de sessões deste paciente
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Financial Record Modal */}
        <Modal
          visible={showFinancialModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowFinancialModal(false)}
        >
          <SafeAreaView style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {editingRecord ? 'Editar Registro' : 'Novo Registro'}
                </Text>
                <TouchableOpacity onPress={() => setShowFinancialModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Data da Sessão *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    value={formData.session_date}
                    onChangeText={(text) => setFormData({ ...formData, session_date: text })}
                    placeholder="AAAA-MM-DD"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Valor da Sessão (R$) *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    value={formData.session_value}
                    onChangeText={(text) => setFormData({ ...formData, session_value: text })}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Método de Pagamento</Text>
                  <View style={styles.paymentMethodsContainer}>
                    {['cash', 'pix', 'credit_card', 'debit_card', 'transfer'].map((method) => (
                      <TouchableOpacity
                        key={method}
                        style={[
                          styles.paymentMethodOption,
                          {
                            backgroundColor: formData.payment_method === method ? colors.primary : colors.background,
                            borderColor: formData.payment_method === method ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setFormData({ ...formData, payment_method: method })}
                      >
                        <Text
                          style={[
                            styles.paymentMethodOptionText,
                            { color: formData.payment_method === method ? '#FFFFFF' : colors.text },
                          ]}
                        >
                          {method === 'cash' ? 'Dinheiro' :
                           method === 'pix' ? 'PIX' :
                           method === 'credit_card' ? 'Crédito' :
                           method === 'debit_card' ? 'Débito' : 'Transferência'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Observações</Text>
                  <TextInput
                    style={[styles.formInput, styles.formTextarea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    value={formData.notes}
                    onChangeText={(text) => setFormData({ ...formData, notes: text })}
                    placeholder="Observações sobre o pagamento..."
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel, { borderColor: colors.border }]}
                  onPress={() => setShowFinancialModal(false)}
                >
                  <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnConfirm, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    const sessionValue = parseFloat(formData.session_value);
                    if (!sessionValue || sessionValue <= 0) {
                      Alert.alert('Erro', 'Valor da sessão deve ser maior que zero.');
                      return;
                    }

                    const data = {
                      patient_id: id as string,
                      session_date: formData.session_date,
                      session_value: sessionValue,
                      payment_method: formData.payment_method || undefined,
                      notes: formData.notes || undefined,
                    };

                    if (editingRecord) {
                      updateFinancialMutation.mutate(
                        { recordId: editingRecord.id, data },
                        {
                          onSuccess: () => {
                            setShowFinancialModal(false);
                            Alert.alert('Sucesso', 'Registro atualizado!');
                          },
                          onError: (error: any) => {
                            Alert.alert('Erro', error.message || 'Não foi possível atualizar o registro.');
                          },
                        }
                      );
                    } else {
                      createFinancialMutation.mutate(data as any, {
                        onSuccess: () => {
                          setShowFinancialModal(false);
                          Alert.alert('Sucesso', 'Registro criado!');
                        },
                        onError: (error: any) => {
                          Alert.alert('Erro', error.message || 'Não foi possível criar o registro.');
                        },
                      });
                    }
                  }}
                >
                  <Text style={styles.modalBtnConfirmText}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  contentCard: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    width: 80,
  },
  infoValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  notesSection: {
    marginTop: 4,
  },
  notesLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 15,
    lineHeight: 22,
  },
  evolutionsContainer: {
    gap: 16,
  },
  addEvolutionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 8,
  },
  addEvolutionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  evolutionCard: {
    padding: 16,
    position: 'relative',
  },
  evolutionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  evolutionDate: {
    fontSize: 14,
    fontWeight: '600',
  },
  painBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  painText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  attachmentsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
    marginLeft: 8,
  },
  attachmentsText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  soapPreview: {
    gap: 4,
    paddingRight: 24,
  },
  soapItem: {
    fontSize: 14,
  },
  evolutionArrow: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -10,
  },
  emptyEvolution: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEvolutionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyEvolutionText: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  financialContainer: {
    gap: 16,
  },
  summaryCard: {
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  addFinancialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addFinancialBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  recordsList: {
    gap: 12,
  },
  recordCard: {
    padding: 16,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recordDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordDate: {
    fontSize: 16,
    fontWeight: '600',
  },
  partnershipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  partnershipBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  recordValues: {
    gap: 4,
    marginBottom: 12,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valueLabel: {
    fontSize: 13,
  },
  valueOriginal: {
    fontSize: 13,
    textDecorationLine: 'line-through',
  },
  valueDiscount: {
    fontSize: 13,
    fontWeight: '500',
  },
  valueFinal: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  valuePaid: {
    fontSize: 13,
    fontWeight: '500',
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  paymentMethodText: {
    fontSize: 13,
  },
  recordNotes: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  recordActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  markPaidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  markPaidBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  editRecordBtn: {
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  deleteRecordBtn: {
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalScroll: {
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  formTextarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  paymentMethodsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentMethodOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  paymentMethodOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnCancel: {
    borderWidth: 1,
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalBtnConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
  },
  infoSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
});
