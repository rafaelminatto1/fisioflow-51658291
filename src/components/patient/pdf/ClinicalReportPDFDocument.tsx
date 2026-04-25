import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { ClinicalReportInput } from "@/services/ai/geminiAiService";

// Fonts could be registered here for better visuals if needed.
// For standard usage, Helvetica is available by default.

const styles = StyleSheet.create({
  page: {
    paddingTop: 35,
    paddingBottom: 65,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 10,
  },
  headerTextContainer: {
    flexDirection: "column",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
  },
  subtitle: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 4,
  },
  clinicInfo: {
    fontSize: 9,
    color: "#475569",
    textAlign: "right",
  },
  patientInfoBox: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  patientInfoRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  patientInfoLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#475569",
    width: 80,
  },
  patientInfoValue: {
    fontSize: 10,
    color: "#0f172a",
    flex: 1,
  },
  painChartContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  painBarWrapper: {
    flex: 1,
    height: 8,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    marginHorizontal: 10,
    position: "relative",
    overflow: "hidden",
  },
  painBarInitial: {
    position: "absolute",
    height: "100%",
    backgroundColor: "#ef4444",
  },
  painBarFinal: {
    position: "absolute",
    height: "100%",
    backgroundColor: "#22c55e",
  },
  painLabel: {
    fontSize: 9,
    color: "#475569",
  },
  contentContainer: {
    flex: 1,
  },
  markdownParagraph: {
    fontSize: 10,
    color: "#334155",
    lineHeight: 1.5,
    marginBottom: 8,
    textAlign: "justify",
  },
  markdownH2: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
    marginTop: 12,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 2,
  },
  markdownH3: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1e293b",
    marginTop: 10,
    marginBottom: 4,
  },
  markdownListItem: {
    flexDirection: "row",
    marginBottom: 4,
    paddingLeft: 10,
  },
  markdownListBullet: {
    width: 10,
    fontSize: 10,
    color: "#334155",
  },
  markdownListText: {
    flex: 1,
    fontSize: 10,
    color: "#334155",
    lineHeight: 1.5,
  },
  textBold: {
    fontWeight: "bold",
  },
  romChartContainer: {
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  romTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 8,
  },
  romItem: {
    marginBottom: 10,
  },
  romLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  romName: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#334155",
  },
  romImprovement: {
    fontSize: 9,
    color: "#16a34a",
    fontWeight: "bold",
  },
  romBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  romBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: "#f1f5f9",
    borderRadius: 3,
    overflow: "hidden",
    position: "relative",
  },
  romBarInitial: {
    position: "absolute",
    height: "100%",
    backgroundColor: "#94a3b8",
    opacity: 0.5,
  },
  romBarCurrent: {
    position: "absolute",
    height: "100%",
    backgroundColor: "#0d9488",
  },
  romValueLabel: {
    fontSize: 8,
    color: "#64748b",
    width: 60,
  },
  footer: {
    position: "absolute",
    fontSize: 9,
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    color: "#94a3b8",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
  },
  pageNumber: {
    position: "absolute",
    fontSize: 9,
    bottom: 30,
    right: 40,
    color: "#94a3b8",
  },
});

interface Props {
  reportText: string;
  reportInput: ClinicalReportInput;
}

// Basic markdown parser for react-pdf Text
const MarkdownRenderer = ({ text }: { text: string }) => {
  const lines = text.split("\n");

  return (
    <View style={styles.contentContainer}>
      {lines.map((line, index) => {
        if (line.trim() === "") {
          return null;
        }

        // Headers
        if (line.startsWith("## ")) {
          return (
            <Text key={index} style={styles.markdownH2}>
              {line.replace("## ", "")}
            </Text>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <Text key={index} style={styles.markdownH3}>
              {line.replace("### ", "")}
            </Text>
          );
        }
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <View key={index} style={styles.markdownListItem}>
              <Text style={styles.markdownListBullet}>•</Text>
              <Text style={styles.markdownListText}>{line.substring(2)}</Text>
            </View>
          );
        }

        // Bold text naive parsing (only handles simple wrapping)
        const parts = line.split(/(\*\*.*?\*\*)/g);

        return (
          <Text key={index} style={styles.markdownParagraph}>
            {parts.map((part, i) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return (
                  <Text key={i} style={styles.textBold}>
                    {part.slice(2, -2)}
                  </Text>
                );
              }
              return part;
            })}
          </Text>
        );
      })}
    </View>
  );
};

export const ClinicalReportPDFDocument: React.FC<Props> = ({ reportText, reportInput }) => {
  const { patientInfo, sessions, measurementEvolution = [] } = reportInput;
  const initialPain = sessions.length > 0 ? sessions[0].painLevel : undefined;
  const finalPain = sessions.length > 0 ? sessions[sessions.length - 1].painLevel : undefined;

  // Filter for ROM measurements
  const romMovements = measurementEvolution.filter(
    (m) => m.type === "Amplitude de Movimento" || m.type === "Goniometria",
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header} fixed>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Relatório Fisioterapêutico</Text>
            <Text style={styles.subtitle}>Evolução Clínica Assistida por IA</Text>
          </View>
          <View>
            <Text style={styles.clinicInfo}>FisioFlow - Gestão Clínica</Text>
            <Text style={styles.clinicInfo}>www.fisioflow.com.br</Text>
          </View>
        </View>

        {/* Patient Info */}
        <View style={styles.patientInfoBox}>
          <View style={styles.patientInfoRow}>
            <Text style={styles.patientInfoLabel}>Paciente:</Text>
            <Text style={styles.patientInfoValue}>{patientInfo.name}</Text>
          </View>
          <View style={styles.patientInfoRow}>
            <Text style={styles.patientInfoLabel}>Diagnóstico Cínico:</Text>
            <Text style={styles.patientInfoValue}>{patientInfo.condition || "Não informado"}</Text>
          </View>
          <View style={styles.patientInfoRow}>
            <Text style={styles.patientInfoLabel}>Sessões Realizadas:</Text>
            <Text style={styles.patientInfoValue}>{sessions.length} sessões registradas</Text>
          </View>
          <View style={styles.patientInfoRow}>
            <Text style={styles.patientInfoLabel}>Data de Emissão:</Text>
            <Text style={styles.patientInfoValue}>{new Date().toLocaleDateString("pt-BR")}</Text>
          </View>

          {/* Graphical Element: Pain Progression */}
          {initialPain !== undefined && finalPain !== undefined && (
            <View style={styles.painChartContainer}>
              <Text style={styles.patientInfoLabel}>Evolução da Dor:</Text>
              <Text style={styles.painLabel}>Inicial ({initialPain}/10)</Text>
              <View style={styles.painBarWrapper}>
                <View style={[styles.painBarInitial, { width: `${initialPain * 10}%` }]} />
                <View
                  style={[
                    styles.painBarFinal,
                    {
                      width: `${finalPain * 10}%`,
                      zIndex: 1,
                      backgroundColor: finalPain <= initialPain ? "#22c55e" : "#ef4444",
                    },
                  ]}
                />
              </View>
              <Text style={styles.painLabel}>Atual ({finalPain}/10)</Text>
            </View>
          )}

          {/* Graphical Element: ROM Evolution */}
          {romMovements.length > 0 && (
            <View style={styles.romChartContainer}>
              <Text style={styles.romTitle}>Evolução de Amplitude de Movimento (ADM):</Text>
              {romMovements.map((rom, idx) => {
                const initVal = parseFloat(String(rom.initial.value)) || 0;
                const currVal = parseFloat(String(rom.current.value)) || 0;
                const maxVal = Math.max(initVal, currVal, 180); // Base normalization on 180 degrees or max found

                return (
                  <View key={idx} style={styles.romItem}>
                    <View style={styles.romLabelRow}>
                      <Text style={styles.romName}>{rom.name}</Text>
                      <Text
                        style={[
                          styles.romImprovement,
                          { color: currVal >= initVal ? "#16a34a" : "#dc2626" },
                        ]}
                      >
                        {currVal >= initVal ? "↑" : "↓"} {rom.improvement}%
                      </Text>
                    </View>
                    <View style={styles.romBarContainer}>
                      <Text style={styles.romValueLabel}>
                        Inicial: {rom.initial.value}
                        {rom.initial.unit}
                      </Text>
                      <View style={styles.romBarBackground}>
                        <View
                          style={[styles.romBarInitial, { width: `${(initVal / maxVal) * 100}%` }]}
                        />
                        <View
                          style={[styles.romBarCurrent, { width: `${(currVal / maxVal) * 100}%` }]}
                        />
                      </View>
                      <Text style={styles.romValueLabel}>
                        Atual: {rom.current.value}
                        {rom.current.unit}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Report Content from AI */}
        <MarkdownRenderer text={reportText} />

        {/* Footer */}
        <Text style={styles.footer} fixed>
          Este relatório foi gerado com base nos registros clínicos do prontuário digital e
          assistido por Inteligência Artificial.
        </Text>
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
};
