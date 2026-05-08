import { Fragment, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, FileText, Loader2, Eye, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReciboPDF, type ReciboData } from "@/components/financial/ReciboPDF";
import { ReceiptGenerator } from "@/components/financial/ReceiptGenerator";
import { accentIncludes } from "@/lib/utils/bilingualSearch";

interface RecibosTableProps {
  recibos: any[];
  isLoading: boolean;
  onPreview: (data: ReciboData) => void;
}

export function RecibosTable({ recibos, isLoading, onPreview }: RecibosTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedReciboId, setExpandedReciboId] = useState<string | null>(null);

  const filteredRecibos = recibos.filter(
    (r) =>
      r.numero_recibo.toString().includes(searchTerm) ||
      (r.referente && accentIncludes(r.referente, searchTerm)),
  );

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar recibos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl border-none bg-slate-50 dark:bg-slate-800 h-10 font-medium"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
            </div>
          ) : filteredRecibos.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-10" />
              <p className="font-bold text-xs uppercase tracking-widest">Nenhum registro</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50 dark:bg-slate-800/20">
                  <TableRow className="border-none">
                    <TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest">
                      Nº Recibo
                    </TableHead>
                    <TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest">
                      Emissão
                    </TableHead>
                    <TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest">
                      Referência
                    </TableHead>
                    <TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest">
                      Valor
                    </TableHead>
                    <TableHead className="px-6 py-4 text-right font-black text-[10px] uppercase tracking-widest">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecibos.map((recibo) => {
                    const reciboData: ReciboData = {
                      numero: recibo.numero_recibo,
                      valor: recibo.valor,
                      referente: recibo.referente,
                      dataEmissao: recibo.data_emissao,
                      emitente: {
                        nome: recibo.emitido_por,
                        cpfCnpj: recibo.cpf_cnpj_emitente || undefined,
                      },
                      assinado: recibo.assinado,
                    };
                    return (
                      <Fragment key={recibo.id}>
                        <TableRow
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 border-slate-50 dark:border-slate-800/50"
                        >
                          <TableCell className="px-6 py-4">
                            <Badge variant="outline" className="font-mono text-xs rounded-lg">
                              #{recibo.numero_recibo.toString().padStart(6, "0")}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-xs font-medium text-slate-500">
                            {format(new Date(recibo.data_emissao), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell className="px-6 py-4 max-w-xs truncate font-bold text-slate-700 dark:text-slate-300">
                            {recibo.referente}
                          </TableCell>
                          <TableCell className="px-6 py-4 font-black text-slate-900 dark:text-white">
                            R${" "}
                            {recibo.valor.toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onPreview(reciboData)}
                                className="h-8 rounded-lg text-slate-400 hover:text-primary font-bold text-[10px] uppercase tracking-wider"
                              >
                                <Eye className="h-3.5 w-3.5 mr-1.5" />
                                Ver
                              </Button>
                              <ReciboPDF
                                data={reciboData}
                                fileName={`recibo-${recibo.numero_recibo}`}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setExpandedReciboId(
                                    expandedReciboId === recibo.id ? null : recibo.id,
                                  )
                                }
                                className="h-8 rounded-lg text-slate-400 hover:text-primary font-bold text-[10px] uppercase tracking-wider"
                                title="WhatsApp / Pix"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {expandedReciboId === recibo.id && (
                          <TableRow key={`${recibo.id}-expanded`}>
                            <TableCell colSpan={5} className="px-6 pb-4 pt-0">
                              <ReceiptGenerator
                                reciboId={recibo.id}
                                reciboData={reciboData}
                                patientPhone={(recibo as any).patient_phone ?? undefined}
                                whatsappSentAt={(recibo as any).whatsapp_sent_at ?? null}
                                onWhatsappSent={() => setExpandedReciboId(null)}
                              />
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
