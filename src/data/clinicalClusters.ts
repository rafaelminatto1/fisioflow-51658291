/**
 * Catálogo de Clusters Diagnósticos e Grupos de Testes Clínicos
 * Baseado na literatura de Prática Baseada em Evidências (EBP).
 */

export interface ClinicalDiagnosticCluster {
  id: string;
  name: string;
  target_joint: string;
  condition: string;
  description: string;
  tests: string[]; // IDs dos testes (builtin-...)
  interpretation: string;
  logic?: "any" | "all" | "min_count";
  min_count_required?: number;
}

export const diagnosticClusters: ClinicalDiagnosticCluster[] = [
  {
    id: "cluster-subacromial-impingement",
    name: "Cluster de Impacto Subacromial (Park et al.)",
    target_joint: "Ombro",
    condition: "Síndrome do Impacto Subacromial",
    description: "Combinação de testes para aumentar a probabilidade pós-teste de impacto.",
    tests: [
      "builtin-hawkins-kennedy",
      "builtin-neer-sign",
      "builtin-painful-arc",
      "builtin-empty-can-jobe",
      "builtin-external-rotation-resistance",
    ],
    interpretation:
      "A presença de 3 ou mais testes positivos aumenta significativamente a probabilidade de impacto subacromial.",
    logic: "min_count",
    min_count_required: 3,
  },
  {
    id: "cluster-rotator-cuff-tear",
    name: "Cluster de Ruptura de Manguito Rotador",
    target_joint: "Ombro",
    condition: "Ruptura do Manguito Rotador (Supra/Infra)",
    description: "Foco em fraqueza e perda de controle motor.",
    tests: ["builtin-drop-arm-test", "builtin-external-rotation-lag-sign", "builtin-painful-arc"],
    interpretation:
      "A combinação de arco doloroso, queda do braço e lag de rotação externa é altamente preditiva de ruptura.",
    logic: "min_count",
    min_count_required: 2,
  },
  {
    id: "cluster-acl-instability",
    name: "Cluster de Estabilidade Anterior do Joelho",
    target_joint: "Joelho",
    condition: "Lesão do Ligamento Cruzado Anterior (LCA)",
    description: "Testes de translação e pivot.",
    tests: ["builtin-lachman-test", "builtin-anterior-drawer-test", "builtin-pivot-shift-test"],
    interpretation: "Lachman é o mais sensível, Pivot Shift é o mais específico.",
    logic: "any",
  },
  {
    id: "cluster-meniscal-tear",
    name: "Cluster de Composite Examination para Menisco",
    target_joint: "Joelho",
    condition: "Lesão Meniscal",
    description: "Cluster de Lowery et al.",
    tests: ["builtin-mcmurray-test", "builtin-joint-line-tenderness", "builtin-thessaly-test"],
    interpretation: "História de travamento associada a interlinha dolorosa e McMurray positivo.",
    logic: "min_count",
    min_count_required: 2,
  },
];
