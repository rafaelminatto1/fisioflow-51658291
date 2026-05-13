/**
 * Mensagens engraçadas com temática de fisioterapia para páginas de erro
 */

export const FUNNY_FISIO_MESSAGES = [
  {
    title: "Ops! Deu um mau jeito aqui.",
    description: "Parece que este componente travou igual coluna sem alongamento. Vamos tentar uma manobra de recuperação?",
  },
  {
    title: "Gatilho de dor detectado!",
    description: "Identificamos uma tensão muscular no código. Nossa equipe já está aplicando a liberação miofascial para resolver isso.",
  },
  {
    title: "O sistema precisa de RPG.",
    description: "A postura deste componente não está legal. Que tal recarregar e tentar alinhar as coisas novamente?",
  },
  {
    title: "Cãibra no processamento!",
    description: "O código teve um espasmo inesperado. Respire fundo, tome uma água e tente novamente em alguns instantes.",
  },
  {
    title: "Lesão por esforço repetitivo...",
    description: "Este componente clicou tanto que acabou abrindo o bico. Vamos dar um gelinho nele e tentar de novo?",
  },
  {
    title: "Sessão de fisioterapia interrompida.",
    description: "O sistema perdeu a ADM (Amplitude de Movimento). Precisamos de um fortalecimento extra para continuar.",
  },
];

export function getRandomFisioMessage() {
  return FUNNY_FISIO_MESSAGES[Math.floor(Math.random() * FUNNY_FISIO_MESSAGES.length)];
}
