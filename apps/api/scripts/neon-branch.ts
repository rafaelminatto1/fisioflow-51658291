import { type Env } from "../src/types/env";

/**
 * Neon DB Branch Management Script
 * 
 * Usage:
 *   npx tsx scripts/neon-branch.ts create <branch-name> [parent-id]
 *   npx tsx scripts/neon-branch.ts list
 *   npx tsx scripts/neon-branch.ts delete <branch-id>
 */

const NEON_API_URL = "https://console.neon.tech/api/v2";
const API_KEY = process.env.NEON_API_KEY;
const PROJECT_ID = process.env.NEON_PROJECT_ID; // Can be found in wrangler.toml under NEON_AUTH_URL or similar

if (!API_KEY) {
  console.error("ERRO: NEON_API_KEY não definida no ambiente.");
  process.exit(1);
}

async function neonFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(`${NEON_API_URL}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(`Neon API Error: ${JSON.stringify(error)}`);
  }

  return response.json();
}

async function listBranches() {
  if (!PROJECT_ID) throw new Error("NEON_PROJECT_ID is required");
  const branches = await neonFetch(`/projects/${PROJECT_ID}/branches`);
  console.table(branches.branches.map((b: any) => ({
    id: b.id,
    name: b.name,
    parent: b.parent_id,
    created: b.created_at,
    primary: b.primary ? "✅" : "❌"
  })));
}

async function createBranch(name: string, parentId?: string) {
  if (!PROJECT_ID) throw new Error("NEON_PROJECT_ID is required");
  console.log(`Criando branch "${name}"...`);
  const result = await neonFetch(`/projects/${PROJECT_ID}/branches`, {
    method: "POST",
    body: JSON.stringify({
      branch: {
        name,
        parent_id: parentId,
      }
    }),
  });
  console.log(`Branch criado com sucesso! ID: ${result.branch.id}`);
  console.log(`Connection string sugerida: ${result.connection_uris[0].connection_uri}`);
}

async function deleteBranch(id: string) {
  if (!PROJECT_ID) throw new Error("NEON_PROJECT_ID is required");
  console.log(`Limpando branch ${id}...`);
  await neonFetch(`/projects/${PROJECT_ID}/branches/${id}`, {
    method: "DELETE",
  });
  console.log("Branch removido.");
}

const [,, command, arg1, arg2] = process.argv;

(async () => {
  try {
    switch (command) {
      case "list":
        await listBranches();
        break;
      case "create":
        if (!arg1) throw new Error("Nome do branch é obrigatório.");
        await createBranch(arg1, arg2);
        break;
      case "delete":
        if (!arg1) throw new Error("ID do branch é obrigatório.");
        await deleteBranch(arg1);
        break;
      default:
        console.log("Comandos disponíveis: list, create <name>, delete <id>");
    }
  } catch (err: any) {
    console.error(err.message);
    process.exit(1);
  }
})();
