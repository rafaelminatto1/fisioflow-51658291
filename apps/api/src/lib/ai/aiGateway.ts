export function getGatewayUrl(env: any, provider: string): string {
  if (env.AI_GATEWAY_ENABLED !== "true") {
    return "";
  }
  const gatewayUrl = env.FISIOFLOW_AI_GATEWAY_URL || env.AI_GATEWAY_URL;
  if (!gatewayUrl) return "";
  return `${gatewayUrl}/${provider}`;
}
