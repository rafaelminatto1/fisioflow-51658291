import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { AIAnalysisResult } from '@/services/ai/clinicalAnalysisService';

// Register fonts if needed (using default Helvetica for now to ensure compatibility)
// Font.register({ family: 'Roboto', src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf' });

const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#333',
        backgroundColor: '#ffffff'
    },
    header: {
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    title: {
        fontSize: 18,
        fontFamily: 'Helvetica-Bold',
        color: '#1e40af' // Blue-800
    },
    subtitle: {
        fontSize: 10,
        color: '#666'
    },
    section: {
        marginBottom: 15,
        padding: 10,
        backgroundColor: '#f8fafc', // Slate-50
        borderRadius: 4
    },
    sectionTitle: {
        fontSize: 12,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 6,
        color: '#0f172a', // Slate-900
        borderBottomWidth: 1,
        borderBottomColor: '#cbd5e1',
        paddingBottom: 2
    },
    row: {
        flexDirection: 'row',
        marginBottom: 4
    },
    col: {
        flex: 1
    },
    label: {
        fontFamily: 'Helvetica-Bold',
        fontSize: 9,
        color: '#475569'
    },
    value: {
        fontSize: 9,
        color: '#1e293b'
    },
    table: {
        display: 'flex',
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        borderColor: '#e2e8f0',
        marginTop: 10
    },
    tableRow: {
        margin: 'auto',
        flexDirection: 'row'
    },
    tableCol: {
        width: '20%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderColor: '#e2e8f0'
    },
    tableCell: {
        margin: 5,
        fontSize: 8
    },
    headerCell: {
        margin: 5,
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        backgroundColor: '#f1f5f9'
    },
    badge: {
        padding: '2 6',
        borderRadius: 8,
        backgroundColor: '#dbeafe',
        color: '#1e40af',
        fontSize: 8,
        alignSelf: 'flex-start',
        marginBottom: 4
    },
    disclaimer: {
        marginTop: 30,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 10,
        fontSize: 8,
        color: '#94a3b8',
        fontStyle: 'italic'
    },
    footer: {
        position: 'absolute',
        bottom: 20,
        left: 30,
        right: 30,
        fontSize: 8,
        color: '#cbd5e1',
        textAlign: 'center'
    }
});

interface ClinicalReportPDFProps {
    report: AIAnalysisResult;
    patientName: string;
    professionalName: string;
    date: string;
    logoUrl?: string; // Optional logo
}

const ClinicalReportPDF: React.FC<ClinicalReportPDFProps> = ({ report, patientName, professionalName, date }) => {

    // Parse markdown table minimally if needed, or just use structured data. 
    // Ideally we should pass structured metrics to the PDF, but for now we might rely on the AI structured output if available.
    // However, the AI report has separate `key_findings`, `improvements` etc. The table is a markdown string.
    // Parsing markdown in PDF is hard. We will skip the markdown table for now and prioritize the structured fields.
    // Or we can try to parse simple markdown table rows.

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Relatório de Análise Clínica</Text>
                        <Text style={styles.subtitle}>Avaliação Biomecânica Assistida por IA</Text>
                    </View>
                    <View>
                        <Text style={{ fontSize: 9, textAlign: 'right' }}>{date}</Text>
                        <Text style={{ fontSize: 9, textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>{professionalName}</Text>
                    </View>
                </View>

                {/* Patient Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Identificação</Text>
                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.label}>Paciente:</Text>
                            <Text style={styles.value}>{patientName}</Text>
                        </View>
                        {/* More identifying info could actally go here */}
                    </View>
                </View>

                {/* Summary */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Resumo Executivo</Text>
                    <Text style={{ fontSize: 9, lineHeight: 1.4, marginBottom: 8 }}>{report.summary}</Text>

                    <Text style={[styles.sectionTitle, { fontSize: 10, marginTop: 8 }]}>Resumo para Paciente</Text>
                    <Text style={{ fontSize: 9, lineHeight: 1.4, color: '#15803d' }}>{report.patient_summary}</Text>
                </View>

                {/* Technical Analysis */}
                <View style={[styles.section, { backgroundColor: '#fff' }]}>
                    <Text style={styles.sectionTitle}>Análise Técnica</Text>
                    <Text style={{ fontSize: 9, lineHeight: 1.4, textAlign: 'justify' }}>{report.technical_analysis}</Text>
                </View>

                {/* Key Findings */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Principais Achados Biomecânicos</Text>
                    {report.key_findings.map((finding, index) => (
                        <View key={index} style={{ flexDirection: 'row', marginBottom: 4, alignItems: 'center' }}>
                            <Text style={{ width: 10, fontSize: 10 }}>•</Text>
                            <Text style={{ fontSize: 9, flex: 1 }}>{finding.text}</Text>
                            <View style={[styles.badge, {
                                backgroundColor: finding.confidence === 'HIGH' ? '#dcfce7' : '#fef3c7',
                                color: finding.confidence === 'HIGH' ? '#166534' : '#92400e'
                            }]}>
                                <Text>{finding.confidence === 'HIGH' ? 'Alta Confiança' : 'Média Confiança'}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Action Plan */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={[styles.section, { flex: 1 }]}>
                        <Text style={[styles.sectionTitle, { color: '#166534' }]}>Melhorias Observadas</Text>
                        {report.improvements.map((imp, i) => (
                            <Text key={i} style={{ fontSize: 9, marginBottom: 2 }}>• {imp}</Text>
                        ))}
                    </View>
                    <View style={[styles.section, { flex: 1 }]}>
                        <Text style={[styles.sectionTitle, { color: '#b45309' }]}>Foco de Correção</Text>
                        {report.still_to_improve.map((imp, i) => (
                            <Text key={i} style={{ fontSize: 9, marginBottom: 2 }}>• {imp}</Text>
                        ))}
                    </View>
                </View>

                {/* Suggested Exercises */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Conduta Sugerida / Exercícios</Text>
                    {report.suggested_exercises.map((ex, i) => (
                        <View key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottomWidth: i === report.suggested_exercises.length - 1 ? 0 : 1, borderBottomColor: '#eee' }}>
                            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9 }}>{ex.name}</Text>
                            <Text style={{ fontSize: 8, color: '#666' }}>Meta: {ex.goal}</Text>
                            <View style={{ flexDirection: 'row', marginTop: 2, gap: 10 }}>
                                <Text style={{ fontSize: 8 }}>Dose: {ex.sets} x {ex.reps}</Text>
                                <Text style={{ fontSize: 8, color: '#166534' }}>Prog: {ex.progression}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Red Flags & Disclaimer */}
                {report.red_flags_generic.length > 0 && (
                    <View style={[styles.section, { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1 }]}>
                        <Text style={[styles.sectionTitle, { color: '#991b1b', borderBottomColor: '#fecaca' }]}>Red Flags / Atenção</Text>
                        {report.red_flags_generic.map((flag, i) => (
                            <Text key={i} style={{ fontSize: 9, color: '#991b1b' }}>! {flag}</Text>
                        ))}
                    </View>
                )}

                <Text style={styles.disclaimer}>
                    AVISO LEGAL: {report.disclaimer} Este relatório foi gerado automaticamente por inteligência artificial ("PhysioScience Master AI") e revisado eletronicamente. Não substitui o laudo médico oficial ou a avaliação física presencial.
                </Text>

                <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
                    `${pageNumber} / ${totalPages} - Gerado via FisioFlow`
                )} fixed />
            </Page>
        </Document>
    );
};

export default ClinicalReportPDF;
