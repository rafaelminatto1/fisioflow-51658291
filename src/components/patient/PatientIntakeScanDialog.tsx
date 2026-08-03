import { useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, FileText, Info, Loader2, ShieldAlert, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  campoEhAplicavel,
  useApplyIntakeFields,
  useScanIntakeSheet,
  type ApplyIntakeInput,
  type IntakeCandidate,
  type IntakeField,
  type IntakeScanResponse,
} from "@/hooks/clinical/usePatientIntakeScan";

/**
 * Digitalização da ficha física do paciente.
 *
 * A tela é de CONFERÊNCIA, não de importação: a recepção está com o papel na
 * mão enquanto revisa. Por isso cada candidato mostra o trecho do OCR que o
 * originou, o valor é editável antes de aplicar, e a confiança vem traduzida em
 * consequência ("sem DDD não dá para enviar mensagem") em vez de um percentual
 * seco que ninguém sabe interpretar.
 *
 * Layout: o `DialogContent` do projeto já é `flex-col` com um único container
 * `overflow-y-auto`. Nada aqui cria um segundo scroll — scroll aninhado corta
 * modais altos.
 */

export interface PatientIntakeScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName?: string;
  /** Chamado quando pelo menos um campo foi gravado no cadastro. */
  onApplied?: (aplicados: string[]) => void;
}

const ROTULO_CAMPO: Record<IntakeField, string> = {
  telefone: "Telefone",
  telefone_secundario: "Telefone secundário",
  cpf: "CPF",
  data_nascimento: "Data de nascimento",
  cep: "CEP",
  email: "E-mail",
};

/** Nome do campo em `aplicados`/`ignorados` do endpoint (camelCase). */
const CHAVE_APPLY: Record<string, string> = {
  telefone: "Telefone",
  telefoneSecundario: "Telefone secundário",
  cpf: "CPF",
  dataNascimento: "Data de nascimento",
  email: "E-mail",
};

type Nivel = "alta" | "media" | "baixa";

interface LeituraConfianca {
  nivel: Nivel;
  rotulo: string;
  /** Por que essa confiança, e o que ela significa para quem confere. */
  explicacao: string;
}

const apenasDigitos = (v: string) => v.replace(/\D/g, "");

/** Telefone brasileiro utilizável para envio precisa de DDD + 8 ou 9 dígitos. */
function telefoneSemDdd(valor: string): boolean {
  return apenasDigitos(valor).length < 10;
}

/**
 * Traduz a confiança em consequência prática.
 *
 * "42%" não diz nada a quem confere. O que importa é: CPF tem dígito verificador
 * e foi validado; telefone não tem verificação nenhuma, e sem DDD sequer serve
 * para enviar mensagem — que é justamente o motivo de existir esta tela.
 */
export function lerConfianca(field: IntakeField, valor: string, confidence: number): LeituraConfianca {
  if (field === "telefone" || field === "telefone_secundario") {
    if (telefoneSemDdd(valor)) {
      return {
        nivel: "baixa",
        rotulo: "Incompleto — falta o DDD",
        explicacao:
          "O OCR não achou o DDD na ficha. Do jeito que está, o número não serve para enviar mensagem nem lembrete: complete o DDD antes de aplicar.",
      };
    }
    if (confidence >= 0.7) {
      return {
        nivel: "media",
        rotulo: "Média — telefone não tem como ser verificado",
        explicacao:
          "O número veio logo depois de um rótulo de telefone na ficha. Ainda assim, telefone não tem dígito verificador: um dígito trocado continua parecendo um número válido. Confira dígito a dígito com o papel.",
      };
    }
    return {
      nivel: "baixa",
      rotulo: "Baixa — número solto na ficha",
      explicacao:
        "O número apareceu sem rótulo de telefone por perto. Pode ser telefone de recado, do convênio ou de outra pessoa. Só aplique se o trecho da ficha confirmar de quem é.",
    };
  }

  if (field === "cpf") {
    return {
      nivel: "alta",
      rotulo: "Alta — dígito verificador confere",
      explicacao:
        "O CPF passou na validação do dígito verificador. Um erro de leitura dificilmente sobreviveria a essa checagem, mas o CPF pode ser de um acompanhante — confira de quem é.",
    };
  }

  if (field === "data_nascimento") {
    return {
      nivel: "media",
      rotulo: "Média — é uma data plausível",
      explicacao:
        "O formato é de data e o ano é plausível, mas a ficha costuma ter outras datas (avaliação, cirurgia, início do tratamento). Confirme que esta é a de nascimento.",
    };
  }

  if (field === "cep") {
    return {
      nivel: "media",
      rotulo: "Média — informativo",
      explicacao:
        "Oito dígitos no formato de CEP. Serve para conferir o endereço à mão, mas não é gravado por aqui.",
    };
  }

  return {
    nivel: "media",
    rotulo: "Média — formato de e-mail",
    explicacao:
      "O texto tem formato de e-mail, mas OCR troca com facilidade caracteres parecidos (l/1, o/0, m/rn). Leia com atenção antes de aplicar.",
  };
}

/** Valida o valor EDITADO — o que vai para o banco é o que está na tela. */
export function valorInvalido(field: IntakeField, valor: string): string | null {
  const v = valor.trim();
  if (!v) return "Preencha ou desmarque o campo.";

  if (field === "telefone" || field === "telefone_secundario") {
    const d = apenasDigitos(v);
    if (d.length < 10) return "Sem DDD o número não serve para envio. Informe DDD + número.";
    if (d.length > 11) return "Telefone com dígitos demais.";
    return null;
  }
  if (field === "cpf") {
    return apenasDigitos(v).length === 11 ? null : "CPF precisa ter 11 dígitos.";
  }
  if (field === "data_nascimento") {
    return /^\d{4}-\d{2}-\d{2}$/.test(v) ? null : "Use o formato AAAA-MM-DD.";
  }
  if (field === "email") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "E-mail inválido.";
  }
  return null;
}

function normalizar(field: IntakeField, valor: string): string {
  const v = valor.trim();
  if (field === "cpf" || field === "telefone" || field === "telefone_secundario") {
    return apenasDigitos(v);
  }
  return v;
}

const CLASSE_NIVEL: Record<Nivel, string> = {
  alta: "border-emerald-300 bg-emerald-50 text-emerald-900",
  media: "border-amber-300 bg-amber-50 text-amber-900",
  baixa: "border-red-300 bg-red-50 text-red-900",
};

export function PatientIntakeScanDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
  onApplied,
}: PatientIntakeScanDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<IntakeScanResponse | null>(null);
  /** Índice do candidato escolhido por campo — um campo grava um valor só. */
  const [escolhidos, setEscolhidos] = useState<Partial<Record<IntakeField, number>>>({});
  /** Valor editado por índice de candidato. */
  const [edicoes, setEdicoes] = useState<Record<number, string>>({});

  const scan = useScanIntakeSheet();
  const apply = useApplyIntakeFields();

  const candidatos = resultado?.data.candidatos ?? [];
  const aplicaveis = candidatos.filter((c) => campoEhAplicavel(c.field));
  const informativos = candidatos.filter((c) => !campoEhAplicavel(c.field));

  const valorDe = (indice: number, c: IntakeCandidate) => edicoes[indice] ?? c.value;

  const contagemPorCampo = useMemo(() => {
    const mapa: Partial<Record<IntakeField, number>> = {};
    for (const c of candidatos) mapa[c.field] = (mapa[c.field] ?? 0) + 1;
    return mapa;
  }, [candidatos]);

  const selecao = useMemo(
    () =>
      Object.entries(escolhidos)
        .map(([field, indice]) => ({ field: field as IntakeField, indice: indice as number }))
        .filter(({ indice }) => candidatos[indice] != null),
    [escolhidos, candidatos],
  );

  const erros = selecao
    .map(({ field, indice }) => valorInvalido(field, valorDe(indice, candidatos[indice])))
    .filter((e): e is string => e != null);

  const podeAplicar = selecao.length > 0 && erros.length === 0 && !apply.isPending;

  function limpar() {
    setArquivo(null);
    setResultado(null);
    setEscolhidos({});
    setEdicoes({});
    scan.reset();
    apply.reset();
    if (inputRef.current) inputRef.current.value = "";
  }

  function fechar(aberto: boolean) {
    if (!aberto) limpar();
    onOpenChange(aberto);
  }

  function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setArquivo(file);
    setResultado(null);
    setEscolhidos({});
    setEdicoes({});
    apply.reset();
    scan.reset();
  }

  async function digitalizar() {
    if (!arquivo) return;
    const res = await scan.mutateAsync({ file: arquivo, patientId });
    setResultado(res);
    // Nada vem marcado por padrão: marcar sozinho transformaria leitura de foto
    // em decisão tomada, que é exatamente o que esta tela existe para evitar.
    setEscolhidos({});
    setEdicoes({});
  }

  function alternar(field: IntakeField, indice: number) {
    setEscolhidos((atual) => {
      const proximo = { ...atual };
      if (proximo[field] === indice) delete proximo[field];
      else proximo[field] = indice;
      return proximo;
    });
  }

  async function aplicar() {
    const payload: ApplyIntakeInput = { patientId };
    for (const { field, indice } of selecao) {
      const valor = normalizar(field, valorDe(indice, candidatos[indice]));
      if (field === "telefone") payload.telefone = valor;
      if (field === "telefone_secundario") payload.telefoneSecundario = valor;
      if (field === "cpf") payload.cpf = valor;
      if (field === "data_nascimento") payload.dataNascimento = valor;
      if (field === "email") payload.email = valor;
    }
    const res = await apply.mutateAsync(payload);
    if (res.data.aplicados.length) onApplied?.(res.data.aplicados);
  }

  const resultadoApply = apply.data;

  return (
    <Dialog open={open} onOpenChange={fechar}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Digitalizar ficha de cadastro</DialogTitle>
          <DialogDescription>
            {patientName
              ? `Fotografe a ficha de papel de ${patientName} e confira os dados antes de gravar.`
              : "Fotografe a ficha de papel e confira os dados antes de gravar."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="intake-arquivo">Foto ou PDF da ficha</Label>
          <Input
            id="intake-arquivo"
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={aoEscolherArquivo}
          />
          <p className="text-xs text-muted-foreground">Até 8 MB. A imagem não é armazenada.</p>
        </div>

        <div>
          <Button type="button" onClick={digitalizar} disabled={!arquivo || scan.isPending}>
            {scan.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Lendo a ficha…
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
                Ler ficha
              </>
            )}
          </Button>
        </div>

        {scan.isError && (
          <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
            {(scan.error as Error).message}
          </div>
        )}

        {resultado && (
          <div className="space-y-4">
            <div
              role="status"
              className="flex gap-2 rounded-md border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900"
            >
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{resultado.meta.aviso}</p>
            </div>

            <p className="text-xs text-muted-foreground">
              {resultado.data.caracteresLidos} caracteres lidos da imagem.
              {candidatos.length === 0
                ? " Nenhum dado de cadastro foi reconhecido — refotografe com mais luz ou digite à mão."
                : ` ${candidatos.length} candidato(s) acima da confiança mínima de ${Math.round(
                    resultado.meta.confiancaMinima * 100,
                  )}%.`}
            </p>

            {aplicaveis.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Dados que podem ser gravados</h3>
                {aplicaveis.map((c) => {
                  const indice = candidatos.indexOf(c);
                  const valor = valorDe(indice, c);
                  const leitura = lerConfianca(c.field, valor, c.confidence);
                  const marcado = escolhidos[c.field] === indice;
                  const erro = marcado ? valorInvalido(c.field, valor) : null;
                  const duplicado = (contagemPorCampo[c.field] ?? 0) > 1;

                  return (
                    <div key={indice} className="rounded-md border border-border bg-card p-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`intake-usar-${indice}`}
                          checked={marcado}
                          onCheckedChange={() => alternar(c.field, indice)}
                          aria-describedby={`intake-conf-${indice}`}
                        />
                        <div className="min-w-0 flex-1 space-y-2">
                          <Label htmlFor={`intake-usar-${indice}`} className="font-semibold">
                            {ROTULO_CAMPO[c.field]}
                          </Label>

                          <Input
                            aria-label={`Valor de ${ROTULO_CAMPO[c.field]}`}
                            value={valor}
                            onChange={(e) =>
                              setEdicoes((atual) => ({ ...atual, [indice]: e.target.value }))
                            }
                          />

                          <p
                            id={`intake-conf-${indice}`}
                            className={`rounded-md border p-2 text-xs ${CLASSE_NIVEL[leitura.nivel]}`}
                          >
                            <span className="font-semibold">{leitura.rotulo}</span> —{" "}
                            {leitura.explicacao}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            <FileText className="mr-1 inline h-3 w-3" aria-hidden="true" />
                            Trecho lido na ficha: <q className="font-mono">{c.sourceText}</q>
                          </p>

                          {duplicado && (
                            <p className="text-xs text-muted-foreground">
                              Há mais de uma leitura para {ROTULO_CAMPO[c.field]} — escolha uma.
                            </p>
                          )}

                          {erro && (
                            <p role="alert" className="text-xs font-medium text-red-700">
                              <AlertTriangle className="mr-1 inline h-3 w-3" aria-hidden="true" />
                              {erro}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            {informativos.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Somente informativo</h3>
                {informativos.map((c) => (
                  <div
                    key={`info-${candidatos.indexOf(c)}`}
                    className="rounded-md border border-border bg-muted p-3 text-sm"
                  >
                    <p className="font-medium">
                      {ROTULO_CAMPO[c.field]}: {c.value}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <Info className="mr-1 inline h-3 w-3" aria-hidden="true" />
                      Não existe campo de {ROTULO_CAMPO[c.field]} no cadastro — o endereço é um
                      texto único. Use para conferir o endereço à mão.
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Trecho lido na ficha: <q className="font-mono">{c.sourceText}</q>
                    </p>
                  </div>
                ))}
              </section>
            )}
          </div>
        )}

        {apply.isError && (
          <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
            {(apply.error as Error).message}
          </div>
        )}

        {resultadoApply && (
          <div className="space-y-2 rounded-md border border-border bg-card p-3 text-sm">
            {resultadoApply.data.aplicados.length > 0 ? (
              <p className="text-emerald-800">
                <Check className="mr-1 inline h-4 w-4" aria-hidden="true" />
                Gravado no cadastro:{" "}
                {resultadoApply.data.aplicados.map((f) => CHAVE_APPLY[f] ?? f).join(", ")}.
              </p>
            ) : (
              <p className="text-muted-foreground">Nenhum campo novo foi gravado.</p>
            )}

            {resultadoApply.data.ignorados.length > 0 && (
              <div className="text-amber-900">
                <p className="font-medium">
                  Não sobrescrito:{" "}
                  {resultadoApply.data.ignorados.map((f) => CHAVE_APPLY[f] ?? f).join(", ")}.
                </p>
                <p className="text-xs">
                  {resultadoApply.meta.aviso ??
                    "Esses campos já tinham dado preenchido e não foram sobrescritos."}{" "}
                  Se a ficha estiver mais atualizada, corrija pelo cadastro do paciente.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => fechar(false)}>
            Fechar
          </Button>
          <Button type="button" onClick={aplicar} disabled={!podeAplicar}>
            {apply.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Gravando…
              </>
            ) : selecao.length === 0 ? (
              "Aplicar campos conferidos"
            ) : (
              `Aplicar ${selecao.length} campo${selecao.length === 1 ? "" : "s"}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PatientIntakeScanDialog;
