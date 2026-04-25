import { Card, CardContent } from "@/components/ui/card";
import type { Patient } from "@/types";
import { Activity, FileText, MapPin, Phone, Copy, ExternalLink, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PersonalDataTabProps {
  patient: Patient;
}

const formatPhone = (phone: string | undefined) => {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
};

const openWhatsApp = (phone: string) => {
  const formatted = formatPhone(phone);
  if (formatted) {
    window.open(`https://wa.me/55${formatted}`, "_blank");
  }
};

const openGoogleMaps = (address: string) => {
  if (address) {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
      "_blank",
    );
  }
};

const copyToClipboard = (text: string, label: string) => {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copiado!`);
};

export function PersonalDataTab({ patient }: PersonalDataTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="font-bold text-base flex items-center gap-2 text-slate-800">
            <Phone className="h-4 w-4 text-blue-500" />
            Contato e Emergência
          </h3>
          <Card className="bg-white border-blue-100 shadow-sm rounded-xl">
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Telefone
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">{patient.phone || "-"}</span>
                    {patient.phone && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => openWhatsApp(patient.phone!)}
                          title="Abrir WhatsApp"
                        >
                          <MessageCircle className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => copyToClipboard(patient.phone!, "Telefone")}
                          title="Copiar"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Email
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className="font-semibold text-slate-700 truncate block"
                      title={patient.email}
                    >
                      {patient.email || "-"}
                    </span>
                    {patient.email && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => copyToClipboard(patient.email!, "Email")}
                        title="Copiar"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Contato de Emergência
                  </span>
                  <span className="font-semibold text-slate-700">
                    {patient.emergency_contact || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Tel. Emergência
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">
                      {patient.emergency_phone || "-"}
                    </span>
                    {patient.emergency_phone && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => openWhatsApp(patient.emergency_phone!)}
                        title="Abrir WhatsApp"
                      >
                        <MessageCircle className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-base flex items-center gap-2 text-slate-800">
            <MapPin className="h-4 w-4 text-blue-500" />
            Endereço Residencial
          </h3>
          <Card className="bg-white border-blue-100 shadow-sm rounded-xl">
            <CardContent className="p-5 space-y-4">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Logradouro
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">{patient.address || "-"}</span>
                    {patient.address && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => openGoogleMaps(patient.address!)}
                        title="Abrir no Mapa"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Cidade/UF
                    </span>
                    <span className="font-semibold text-slate-700">
                      {patient.city || "-"} {patient.state ? `/ ${patient.state}` : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      CEP
                    </span>
                    <span className="font-semibold text-slate-700">{patient.zip_code || "-"}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-base flex items-center gap-2 text-slate-800">
            <Activity className="h-4 w-4 text-blue-500" />
            Saúde e Convênio
          </h3>
          <Card className="bg-white border-blue-100 shadow-sm rounded-xl">
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Convênio
                  </span>
                  <span className="font-semibold text-slate-700">
                    {patient.health_insurance || "Particular"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Nº da Carteirinha
                  </span>
                  <span className="font-semibold text-slate-700">
                    {patient.insurance_number || "-"}
                  </span>
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    CPF
                  </span>
                  <span className="font-semibold text-slate-700">{patient.cpf || "-"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-base flex items-center gap-2 text-slate-800">
            <FileText className="h-4 w-4 text-blue-500" />
            Observações Internas
          </h3>
          <Card className="bg-white border-blue-100 shadow-sm rounded-xl min-h-[125px]">
            <CardContent className="p-5">
              <p className="text-sm leading-relaxed text-slate-600 italic">
                {patient.observations || "Nenhuma observação registrada."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
