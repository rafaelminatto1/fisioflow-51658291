import axios from "axios";

async function emitNota() {
  const PROD_URL = "https://fisioflow-api.rafalegollas.workers.dev/api/nfse";
  const TOKEN = "eyJhbGciOiJFZERTQSIsImtpZCI6IjM1NDViNjdiLWJiMzItNDMzYi1hNDNkLTBhY2E5ODZkMDQ4YyJ9.eyJpYXQiOjE3Nzc2ODcyOTAsIm5hbWUiOiJEci4gVGVzdGUgQXR1YWxpemFkbyIsImVtYWlsIjoicmFmYWVsLm1pbmF0dG9AeWFob28uY29tLmJyIiwiZW1haWxWZXJpZmllZCI6dHJ1ZSwiY3JlYXRlZEF0IjoiMjAyNi0wNC0xNFQyMDo0NzoxNC4zMzFaIiwidXBkYXRlZEF0IjoiMjAyNi0wNC0xOVQwMTowMjozNi44NjlaIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJiYW5uZWQiOmZhbHNlLCJiYW5SZWFzb24iOm51bGwsImJhbkV4cGlyZXMiOm51bGwsImlkIjoiNGEzODM3NjktZDg1Yi00NjEzLWJhY2UtYjFkNDUzMGJhYzAzIiwic3ViIjoiNGEzODM3NjktZDg1Yi00NjEzLWJhY2UtYjFkNDUzMGJhYzAzIiwiZXhwIjoxNzc3Njg4MTkwLCJpc3MiOiJodHRwczovL2VwLXdhbmRlcmluZy1ib251cy1hY2o0end2by5uZW9uYXV0aC5zYS1lYXN0LTEuYXdzLm5lb24udGVjaCIsImF1ZCI6Imh0dHBzOi8vZXAtd2FuZGVyaW5nLWJvbnVzLWFjajR6d3ZvLm5lb25hdXRoLnNhLWVhc3QtMS5hd3MubmVvbi50ZWNoIn0.QKHX22pOFUaJG80ZW4uBnH7hnXWfohih_XOvpHKTWbez0egb0LNq2RzKezNKJ2SxQ8VPpc4CofbIudQcQaKKBQ";

  try {
    console.log("Generating RPS draft...");
    const genRes = await axios.post(`${PROD_URL}/generate`, {
      valor_servico: 170.00,
      discriminacao: "Paciente Rafael Minatto De Martino, CPF 420.847.898-50, realizou 1 sessão de fisioterapia musculoesquelética (Código TUSS 20103115) no dia 30/04/2026. E efetuou o pagamento no valor de R$170,00 para a empresa Mooca Fisioterapia RA Ltda, CNPJ: 54.836.577/0001-67.\n- Conforme Lei 12.741/2012, o percentual total de impostos incidentes neste serviço prestado é de aproximadamente 8,98%",
      tomador_nome: "Rafael Minatto De Martino",
      tomador_cpf_cnpj: "42084789850",
      tomador_email: "rafael.minatto@yahoo.com.br"
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