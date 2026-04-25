import type { Env } from "../types/env";

/**
 * Retorna uma resposta fetch com transformações do Cloudflare Images.
 * Útil para proxies de imagens do R2 ou fontes externas.
 *
 * @param env - Variáveis de ambiente
 * @param key - Chave do objeto no R2 ou URL externa
 * @param options - Opções de redimensionamento
 */
export async function getResizedImage(
  env: Env,
  key: string,
  options: {
    width?: number;
    height?: number;
    fit?: "scale-down" | "contain" | "cover" | "crop" | "pad";
    quality?: number;
  } = {},
) {
  // Constrói a URL base. Se for uma key, assume que aponta para o próprio worker processor
  // Se for uma URL completa, usa ela diretamente.
  const imageURL = key.startsWith("http") ? key : `${env.R2_PUBLIC_URL || ""}/${key}`;

  return fetch(imageURL, {
    cf: {
      image: {
        width: options.width || 800,
        height: options.height || 600,
        fit: options.fit || "cover",
        format: "avif" as RequestInitCfPropertiesImage["format"],
        quality: options.quality || 75,
      },
    } as RequestInitCfProperties,
  });
}
