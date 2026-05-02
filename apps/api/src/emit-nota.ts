import axios from "axios";

async function emitNota() {
  const PROD_URL = "https://fisioflow-api.rafalegollas.workers.dev/api/nfse";
  const TOKEN = process.env.FISIOFLOW_AUTH_TOKEN;

  if (!TOKEN) {
    throw new Error("FISIOFLOW_AUTH_TOKEN is required");
  }

  try {
    console.log("Generating RPS draft...");
    const genRes = await axios.post(`${PROD_URL}/generate`, {
      valor_servico: 170.00,
      discriminacao:
        "Sessao de fisioterapia musculoesqueletica - teste manual de emissao.",
      tomador_nome: "Paciente Teste",
      tomador_cpf_cnpj: "11144477735",
      tomador_email: "teste@example.com"
    }, {
      headers: {
        Authorization: `Bearer ${TOKEN}`
      }
    });

    const nfseId = genRes.data.data.id;
    console.log("Draft created with ID:", nfseId);

    console.log("Sending to PMSP...");
    const sendRes = await axios.post(`${PROD_URL}/send/${nfseId}`, {}, {
      headers: {
        Authorization: `Bearer ${TOKEN}`
      }
    });

    console.log("Result:");
    console.dir(sendRes.data, { depth: null });

  } catch (err: any) {
    if (err.response) {
      console.error(err.response.status, err.response.data);
    } else {
      console.error(err.message);
    }
  }
}
emitNota();
