import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL || "";
const sql = neon(DATABASE_URL);

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || "";
const CF_API_TOKEN = process.env.CF_API_TOKEN || "";

async function generateWithCloudflareAI(exerciseName) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/meta/llama-3-8b-instruct`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${CF_API_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messages: [
        { 
          role: "system", 
          content: "Você é um fisioterapeuta especialista. Retorne EXATAMENTE UM JSON para o exercício solicitado, sem markdown ou explicações. O JSON deve ter as chaves (em inglês, valores em português): 'description' (clínica), 'instructions' (passo a passo numerado 1. 2.), 'tips' (dicas de execução), 'precautions' (segurança/alertas) e 'benefits' (benefícios). Exemplo: {\"description\":\"...\",\"instructions\":\"...\",\"tips\":\"...\",\"precautions\":\"...\",\"benefits\":\"...\"}" 
        },
        { 
          role: "user", 
          content: `Gere as informações clínicas para o exercício: "${exerciseName}"` 
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Cloudflare API erro: ${response.status} ${response.statusText}`);
  }

  const jsonResponse = await response.json();
  if (jsonResponse.success && jsonResponse.result && jsonResponse.result.response) {
    let rawText = jsonResponse.result.response.trim();
    // Limpa eventuais marcadores de markdown como ```json ... ```
    rawText = rawText.replace(/^```(json)?/i, '').replace(/```$/i, '').trim();
    
    try {
      const parsed = JSON.parse(rawText);
      return parsed;
    } catch (e) {
      // Tentar consertar em caso de erro de parse leve
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw new Error("Resposta da IA não é um JSON válido: " + rawText);
    }
  } else {
    throw new Error("Falha ao gerar resposta: " + JSON.stringify(jsonResponse));
  }
}

async function run() {
  console.log("Buscando todos os exercícios no banco para revisão...");
  const exercises = await sql`
    SELECT id, name, description, instructions, tips, precautions, benefits
    FROM exercises
  `;
  
  let updatedCount = 0;

  for (const ex of exercises) {
    let { name, description, instructions, tips, precautions, benefits } = ex;
    
    // Identificar se o exercício precisa de enriquecimento (descrição genérica "Exercício focado em..."
    // ou se faltam dicas, precauções ou benefícios que não foram preenchidos antes).
    const isDescriptionGeneric = !description || description.includes(`Exercício focado em`);
    const areInstructionsGeneric = !instructions || instructions.includes(`Instruções para`) || instructions === 'Nenhuma instrução adicional.';
    
    const needsEnrichment = isDescriptionGeneric || areInstructionsGeneric || !tips || !precautions || !benefits;

    if (needsEnrichment) {
      console.log(`Revisando e enriquecendo com Cloudflare AI: ${name}`);
      try {
        const generatedData = await generateWithCloudflareAI(name);

        description = generatedData.description || description;
        instructions = generatedData.instructions || instructions;
        tips = generatedData.tips || tips;
        precautions = generatedData.precautions || precautions;
        benefits = generatedData.benefits || benefits;

        await sql`
          UPDATE exercises 
          SET 
            description = ${description}, 
            instructions = ${instructions},
            tips = ${tips},
            precautions = ${precautions},
            benefits = ${benefits},
            updated_at = NOW()
          WHERE id = ${ex.id}
        `;
        updatedCount++;
        console.log(`[Sucesso] Atualizado: ${name}`);
        
        // Pequeno delay para evitar Rate Limit
        await new Promise(r => setTimeout(r, 800));
        
      } catch (err) {
        console.error(`Erro ao gerar para ${name}:`, err.message);
      }
    }
  }

  console.log(`Finalizado! Total de exercícios revisados com IA: ${updatedCount}`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
