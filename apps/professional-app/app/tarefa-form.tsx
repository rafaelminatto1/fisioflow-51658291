import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import { useTarefas } from '@/hooks/useTarefas';
import { useColors } from '@/hooks/useColorScheme';
import { isTarefaStatus } from '@/lib/tarefas';
import type { TarefaStatus, TarefaPrioridade, TarefaTipo } from '@/lib/api';

const STATUS_OPTIONS: { label: string; value: TarefaStatus }[] = [
  { label: 'Backlog',       value: 'BACKLOG' },
  { label: 'A Fazer',       value: 'A_FAZER' },
  { label: 'Em Progresso',  value: 'EM_PROGRESSO' },
  { label: 'Revisão',       value: 'REVISAO' },
  { label: 'Concluído',     value: 'CONCLUIDO' },
];

const PRIORIDADE_OPTIONS: { label: string; value: TarefaPrioridade }[] = [
  { label: 'Baixa',   value: 'BAIXA' },
  { label: 'Média',   value: 'MEDIA' },
  { label: 'Alta',    value: 'ALTA' },
  { label: 'Urgente', value: 'URGENTE' },
];

const TIPO_OPTIONS: { label: string; value: TarefaTipo }[] = [
  { label: 'Tarefa',       value: 'TAREFA' },
  { label: 'Reunião',      value: 'REUNIAO' },
  { label: 'Melhoria',     value: 'MELHORIA' },
  { label: 'Documentação', value: 'DOCUMENTACAO' },
  { label: 'Feature',      value: 'FEATURE' },
  { label: 'Bug',          value: 'BUG' },
];

// ── Segmented picker reutilizável ────────────────────────────────────────────
function SegmentedPicker<T extends string>({
  options,
  value,
  onChange,
  primaryColor,
  textMuted,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  primaryColor: string;
  textMuted: string;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={pickerStyles.row}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[pickerStyles.pill, active && { backgroundColor: primaryColor }]}
              onPress={() => onChange(opt.value)}
            >
              <Text style={[pickerStyles.text, { color: active ? '#fff' : textMuted }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const pickerStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  pill: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 999, backgroundColor: '#f1f5f9',
  },
  text: { fontSize: 13, fontWeight: '500' },
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function parseDate(str?: string): Date | undefined {
  if (!str) return undefined;
  const d = new Date(str + 'T00:00:00');
  return isNaN(d.getTime()) ? undefined : d;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TarefaFormScreen() {
  const colors = useColors();
  const { id, status: rawStatus } = useLocalSearchParams<{ id?: string; status?: string }>();
  const { data: allData, createAsync, updateAsync, isCreating, isUpdating } = useTarefas();

  const existing = id ? allData.find((t) => t.id === id) : undefined;
  const initialStatus: TarefaStatus = isTarefaStatus(rawStatus) ? rawStatus : 'A_FAZER';

  // ── Form state ─────────────────────────────────────────────────────────────
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [status, setStatus] = useState<TarefaStatus>(initialStatus);
  const [prioridade, setPrioridade] = useState<TarefaPrioridade>('MEDIA');
  const [tipo, setTipo] = useState<TarefaTipo>('TAREFA');
  const [progress, setProgress] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [dataVencimento, setDataVencimento] = useState<Date | undefined>();
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [showVencPicker, setShowVencPicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Popula o formulário quando `existing` fica disponível (edição)
  useEffect(() => {
    if (existing) {
      setTitulo(existing.titulo);
      setDescricao(existing.descricao ?? '');
      setStatus(existing.status);
      setPrioridade(existing.prioridade);
      setTipo(existing.tipo ?? 'TAREFA');
      setProgress(existing.progress ?? 0);
      setTags(existing.tags ?? []);
      setDataVencimento(parseDate(existing.data_vencimento ?? undefined));
      setStartDate(parseDate(existing.start_date ?? undefined));
    }
  }, [existing?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // ^ reage à mudança de id, não ao objeto inteiro (evita loop)

  // ── Tag management ─────────────────────────────────────────────────────────
  function addTag() {
    const trimmed = tagInput.trim().replace(/,+/g, '').trim();
    if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
      setTags([...tags, trimmed]);
    }
    setTagInput('');
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  function validate(): string | null {
    if (!titulo.trim()) return 'Informe o título da tarefa.';
    if (startDate && dataVencimento && startDate > dataVencimento)
      return 'A data de início não pode ser posterior ao vencimento.';
    return null;
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    setFormError(null);
    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }

    const payload = {
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      status,
      prioridade,
      tipo,
      progress: Math.round(progress),
      tags: tags.length ? tags : undefined,
      data_vencimento: dataVencimento ? toDateStr(dataVencimento) : undefined,
      start_date: startDate ? toDateStr(startDate) : undefined,
    };

    try {
      if (existing) {
        await updateAsync({ id: existing.id, data: payload });
      } else {
        await createAsync(payload);
      }
      router.back();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não foi possível salvar a tarefa.';
      Alert.alert('Erro ao salvar', msg);
    }
  }

  const isBusy = isCreating || isUpdating;

  // ── Date picker helper ─────────────────────────────────────────────────────
  function DateField({
    label,
    value,
    showPicker,
    onOpen,
    onClose,
    onChange,
  }: {
    label: string;
    value: Date | undefined;
    showPicker: boolean;
    onOpen: () => void;
    onClose: () => void;
    onChange: (d: Date) => void;
  }) {
    return (
      <View style={styles.flex1}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        <TouchableOpacity
          style={[styles.dateBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={onOpen}
        >
          <Ionicons name="calendar-outline" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
          <Text style={{ color: value ? colors.text : colors.textMuted, fontSize: 14 }}>
            {value ? value.toLocaleDateString('pt-BR') : 'Selecionar'}
          </Text>
        </TouchableOpacity>
        {showPicker && (
          <DateTimePicker
            value={value ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_e, date) => {
              onClose();
              if (date) onChange(date);
            }}
          />
        )}
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: existing ? 'Editar Tarefa' : 'Nova Tarefa',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '600' },
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Erro inline */}
        {formError && (
          <View style={styles.inlineError}>
            <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
            <Text style={styles.inlineErrorText}>{formError}</Text>
          </View>
        )}

        {/* Título */}
        <Text style={[styles.label, { color: colors.text }]}>Título *</Text>
        <TextInput
          style={[styles.input, {
            borderColor: !titulo.trim() && formError ? '#dc2626' : colors.border,
            color: colors.text,
            backgroundColor: colors.surface,
          }]}
          value={titulo}
          onChangeText={(v) => { setTitulo(v); setFormError(null); }}
          placeholder="Nome da tarefa"
          placeholderTextColor={colors.textMuted}
          maxLength={200}
          returnKeyType="next"
        />

        {/* Descrição */}
        <Text style={[styles.label, { color: colors.text }]}>Descrição</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline, {
            borderColor: colors.border, color: colors.text, backgroundColor: colors.surface,
          }]}
          value={descricao}
          onChangeText={setDescricao}
          placeholder="Descreva a tarefa…"
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />

        {/* Status */}
        <Text style={[styles.label, { color: colors.text }]}>Status</Text>
        <SegmentedPicker
          options={STATUS_OPTIONS}
          value={status}
          onChange={setStatus}
          primaryColor={colors.primary}
          textMuted={colors.textMuted}
        />

        {/* Prioridade */}
        <Text style={[styles.label, { color: colors.text }]}>Prioridade</Text>
        <SegmentedPicker
          options={PRIORIDADE_OPTIONS}
          value={prioridade}
          onChange={setPrioridade}
          primaryColor={colors.primary}
          textMuted={colors.textMuted}
        />

        {/* Tipo */}
        <Text style={[styles.label, { color: colors.text }]}>Tipo</Text>
        <SegmentedPicker
          options={TIPO_OPTIONS}
          value={tipo}
          onChange={setTipo}
          primaryColor={colors.primary}
          textMuted={colors.textMuted}
        />

        {/* Datas */}
        <View style={styles.row}>
          <DateField
            label="Data de início"
            value={startDate}
            showPicker={showStartPicker}
            onOpen={() => { setShowVencPicker(false); setShowStartPicker(true); }}
            onClose={() => setShowStartPicker(false)}
            onChange={setStartDate}
          />
          <DateField
            label="Vencimento"
            value={dataVencimento}
            showPicker={showVencPicker}
            onOpen={() => { setShowStartPicker(false); setShowVencPicker(true); }}
            onClose={() => setShowVencPicker(false)}
            onChange={setDataVencimento}
          />
        </View>

        {/* Progresso */}
        <Text style={[styles.label, { color: colors.text }]}>
          Progresso: <Text style={{ color: colors.primary }}>{Math.round(progress)}%</Text>
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={100}
          step={5}
          value={progress}
          onValueChange={setProgress}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primary}
        />

        {/* Tags */}
        <Text style={[styles.label, { color: colors.text }]}>Tags</Text>
        <View style={[styles.tagInputRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <TextInput
            style={[styles.tagInput, { color: colors.text }]}
            value={tagInput}
            onChangeText={setTagInput}
            placeholder="Adicionar tag (Enter para confirmar)…"
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={addTag}
            returnKeyType="done"
            blurOnSubmit={false}
            maxLength={30}
          />
          {tagInput.trim().length > 0 && (
            <TouchableOpacity
              style={[styles.tagAddBtn, { backgroundColor: colors.primary }]}
              onPress={addTag}
            >
              <Text style={styles.tagAddBtnText}>+</Text>
            </TouchableOpacity>
          )}
        </View>
        {tags.length > 0 && (
          <View style={styles.tagsWrap}>
            {tags.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[styles.tagChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => removeTag(tag)}
                accessibilityLabel={`Remover tag ${tag}`}
              >
                <Text style={[styles.tagChipText, { color: colors.textMuted }]}>{tag}</Text>
                <Ionicons name="close" size={11} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Botões */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.border }]}
            onPress={() => router.back()}
            disabled={isBusy}
          >
            <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }, isBusy && styles.btnDisabled]}
            onPress={handleSave}
            disabled={isBusy}
          >
            {isBusy ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>{existing ? 'Salvar alterações' : 'Criar tarefa'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

// workaround: importar Ionicons dentro do arquivo (também usado no DateField)
import { Ionicons } from '@expo/vector-icons';

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 56, gap: 4 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 6, letterSpacing: 0.1 },
  input: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15,
  },
  inputMultiline: { minHeight: 100, paddingTop: 10 },
  row: { flexDirection: 'row', gap: 12, marginTop: 8 },
  flex1: { flex: 1 },
  dateBtn: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center',
  },
  slider: { width: '100%', height: 36, marginVertical: 4 },
  tagInputRow: {
    flexDirection: 'row', borderWidth: 1, borderRadius: 8, overflow: 'hidden',
  },
  tagInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  tagAddBtn: { paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  tagAddBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tagChip: {
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
    flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1,
  },
  tagChipText: { fontSize: 12 },
  inlineError: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff5f5', borderRadius: 8, padding: 10, marginBottom: 4,
  },
  inlineErrorText: { fontSize: 13, color: '#dc2626', flex: 1 },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 28 },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderRadius: 10,
    paddingVertical: 14, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 2, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.55 },
});
