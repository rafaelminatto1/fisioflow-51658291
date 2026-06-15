import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { NFSe } from "./NFSePage";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10 },
  header: { marginBottom: 20, borderBottom: "1 solid #000", paddingBottom: 10 },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
  },
  subtitle: { fontSize: 8, textAlign: "center", color: "#666" },
  footer: {
    marginTop: 20,
    paddingTop: 10,
    borderTop: "1 solid #000",
    fontSize: 7,
    textAlign: "center",
    color: "#666",
  },
});

export function NFSePDFDocument({ nfse }: { nfse: NFSe }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>NOTA FISCAL DE SERVIÇO ELETRÔNICA - NFSe</Text>
          <Text style={styles.subtitle}>
            Número: {nfse.numero} | Série: {nfse.serie}
          </Text>
        </View>
        <View style={styles.footer}>
          <Text>Documento eletrônico conforme Lei 14.063/2020</Text>
        </View>
      </Page>
    </Document>
  );
}
