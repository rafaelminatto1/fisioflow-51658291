export const COSTS_USD = {
  "gemini-1.5-flash-lite": { input: 0.000075, output: 0.0003 },
  "gemini-1.5-flash": { input: 0.00035, output: 0.00105 },
  "@cf/meta/llama-3-8b-instruct": { input: 0, output: 0.0002 },
  "@cf/baai/bge-base-en-v1.5": { input: 0.00001, output: 0 },
};

export const USD_TO_BRL = 5.50; // Approximated for budget control

export function calculateCost(model: string, inputTokens: number, outputTokens: number) {
  // If model not found, fallback to flash pricing to be safe
  const modelCost = COSTS_USD[model as keyof typeof COSTS_USD] || COSTS_USD["gemini-1.5-flash"];
  
  const estimatedCostUsd = (inputTokens / 1000) * modelCost.input + (outputTokens / 1000) * modelCost.output;
  const estimatedCostBrl = estimatedCostUsd * USD_TO_BRL;
  
  return { estimatedCostUsd, estimatedCostBrl };
}
