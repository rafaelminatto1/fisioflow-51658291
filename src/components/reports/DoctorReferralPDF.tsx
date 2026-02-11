import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Register fonts if needed
// Font.register({ ... });

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#334155',
    lineHeight: 1.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#0F172A',
    paddingBottom: 20,
    marginBottom: 20,
  },
  logoSection: {
    flexDirection: 'column',
  },
  clinicName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  clinicSubtitle: {
    fontSize: 8,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  titleSection: {
    textAlign: 'center',
    marginVertical: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: '#F1F5F9',
    padding: 5,
    marginBottom: 8,
    color: '#0F172A',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 100,
    fontWeight: 'bold',
    color: '#475569',
  },
  value: {
    flex: 1,
  },
  summary: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
    fontStyle: 'italic',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 8,
  },
  signature: {
    marginTop: 40,
    textAlign: 'center',
    alignSelf: 'center',
    width: 200,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 5,
  },
  badgeContainer: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 10,
  },
  badge: {
    padding: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    fontSize: 8,
  }
});

interface DoctorReferralPDFProps {
  patient: {
    name: string;
    birthDate: string;
    condition: string;
    lastSession: string;
  };
  clinic: {
    name: string;
    doctorName: string;
    crf: string;
    address: string;
    phone: string;
  };
  analysis: {
    summary: string;
    evolution: string;
    adherence: number;
    level: number;
    streaks: number;
  };
}

export const DoctorReferralPDF = ({ patient, clinic, analysis }: DoctorReferralPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoSection}>
          <Text style={styles.clinicName}>{clinic.name}</Text>
          <Text style={styles.clinicSubtitle}>Centro de Reabilitação Fisioterapêutica</Text>
        </View>
        <View style={{ textAlign: 'right' }}>
          <Text>{format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</Text>
          <Text>ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</Text>
        </View>
      </View>

      {/* Document Title */}
      <View style={styles.titleSection}>
        <Text style={styles.title}>Relatório de Encaminhamento e Evolução</Text>
      </View>

      {/* Patient Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dados do Paciente</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Nome:</Text>
          <Text style={styles.value}>{patient.name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Nasc.:</Text>
          <Text style={styles.value}>{patient.birthDate}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Condição:</Text>
          <Text style={styles.value}>{patient.condition}</Text>
        </View>
      </View>

      {/* Adherence & Gamification (The differentiator) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Adesão ao Tratamento (Digital Health Metrics)</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Adesão:</Text>
          <Text style={styles.value}>{analysis.adherence}% dos exercícios prescritos concluídos</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Engajamento:</Text>
          <Text style={styles.value}>Nível {analysis.level} • {analysis.streaks} dias seguidos de atividade</Text>
        </View>
        <Text style={{ marginTop: 5, color: '#64748B', fontSize: 8 }}>
          * Métricas coletadas via monitoramento remoto FisioFlow AI.
        </Text>
      </View>

      {/* AI Analysis Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Parecer Clínico (IA Assistida)</Text>
        <View style={styles.summary}>
          <Text>{analysis.summary}</Text>
        </View>
      </View>

      {/* Evolution Detail */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Evolução das Últimas Sessões</Text>
        <Text>{analysis.evolution}</Text>
      </View>

      {/* Signature Section */}
      <View style={{ marginTop: 80 }}>
        <View style={styles.signature}>
          <Text style={{ fontWeight: 'bold' }}>Dr(a). {clinic.doctorName}</Text>
          <Text>Fisioterapeuta • CRF: {clinic.crf}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>{clinic.address} • {clinic.phone}</Text>
        <Text>Documento gerado eletronicamente por FisioFlow AI Platform</Text>
      </View>
    </Page>
  </Document>
);
