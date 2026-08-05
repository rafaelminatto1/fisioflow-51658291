/**
 * Núcleo de cinemática biomecânica.
 *
 * Compartilhado de propósito entre `apps/api` (que grava a métrica no laudo) e
 * `apps/professional-app` (que desenha o ângulo sobre o vídeo): os dois números
 * saem da mesma função. Se divergirem, o fisioterapeuta vê uma coisa na tela e
 * assina outra no PDF.
 *
 * Tudo aqui é puro — sem `env`, sem `fetch`, sem `Date.now()`. É o que permite
 * testar contra valores analiticamente conhecidos e rodar igual nos dois lados.
 */

/** Versão do algoritmo, gravada em `biomechanics_metrics.algorithm_version`. */
export const KINEMATICS_VERSION = "ff-kinematics-1.0.0";

/** Schema do bundle de landmarks trocado entre app, Worker e container. */
export const POSE_BUNDLE_SCHEMA = "ff-pose-33-v1";

export * from "./types";
export * from "./math";
export * from "./landmarks";
export * from "./kinematics";
