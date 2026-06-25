/**
 * SessionEvolutionPage — alias para PatientEvolution.
 *
 * A rota legada `/session-evolution/:appointmentId` redirecionava para
 * o `SessionEvolutionContainer` (formulário SOAP). Após a migração para
 * o modelo único de observação livre, ela passa a renderizar a mesma
 * página `PatientEvolution` (com o editor `LiveTextEvolution`).
 *
 * O `SessionEvolutionContainer` original ainda existe no repositório
 * apenas para back-compat de imports diretos; novos consumidores devem
 * ir direto em `/patient-evolution/:appointmentId`.
 */
import "@/styles/bundles/evolution.css";
import React from "react";
import PatientEvolution from "@/pages/PatientEvolution";

const SessionEvolutionPage: React.FC = () => <PatientEvolution />;

export default SessionEvolutionPage;
