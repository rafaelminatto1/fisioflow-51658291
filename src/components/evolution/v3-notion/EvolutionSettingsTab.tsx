import React from "react";
import { useEvolutionSettings } from "@/hooks/useEvolutionSettings";
import {
  Settings,
  SlidersHorizontal,
  EyeOff,
  LayoutTemplate,
  MessageSquarePlus,
} from "lucide-react";

// Hardcoded available commands for now.
// Eventually this could be dynamic, but since we are controlling Tiptap commands, we list the main ones.
const AVAILABLE_COMMANDS = [
  { id: "heading", label: "Cabeçalhos (H1, H2, H3)", icon: "T" },
  { id: "bold", label: "Negrito", icon: "B" },
  { id: "italic", label: "Itálico", icon: "I" },
  { id: "bulletList", label: "Lista de Marcadores", icon: "•" },
  { id: "orderedList", label: "Lista Numerada", icon: "1." },
  { id: "template", label: "Inserir Modelo", icon: "LayoutTemplate" },
  { id: "exercise", label: "Inserir Exercício", icon: "Dumbbell" },
  { id: "suggestion", label: "Assistente Clínico (/sugestoes)", icon: "MessageSquarePlus" },
];

export const EvolutionSettingsTab: React.FC = () => {
  const { settings, updateSettings, toggleCommand } = useEvolutionSettings();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center gap-3">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
          <Settings size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Configurações da Evolução</h2>
          <p className="text-sm text-gray-500">Personalize seu ambiente de digitação clínica</p>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Editor View Settings */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <LayoutTemplate size={18} className="text-gray-500" />
            <h3 className="font-medium text-gray-900">Visualização Padrão</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => updateSettings({ defaultView: "notion" })}
              className={`p-4 rounded-xl border text-left transition-all ${
                settings.defaultView === "notion"
                  ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <div className="font-medium text-gray-900 mb-1">Editor Inteligente (Modão Novo)</div>
              <p className="text-sm text-gray-500">
                Editor em blocos com comandos / e templates rápidos.
              </p>
            </button>
            <button
              onClick={() => updateSettings({ defaultView: "classic" })}
              className={`p-4 rounded-xl border text-left transition-all ${
                settings.defaultView === "classic"
                  ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <div className="font-medium text-gray-900 mb-1">Visualização Clássica</div>
              <p className="text-sm text-gray-500">Editor de texto tradicional simples e direto.</p>
            </button>
          </div>
        </section>

        <hr className="border-gray-100" />

        {/* Global Feature Toggles */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal size={18} className="text-gray-500" />
            <h3 className="font-medium text-gray-900">Assistentes Inteligentes</h3>
          </div>
          <label className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="flex-1">
              <div className="font-medium text-gray-900">Assistente Clínico (/sugestoes)</div>
              <p className="text-sm text-gray-500 mt-1">
                Habilita a sugestão de blocos clínicos (exercícios, patologias, protocolos) durante
                a digitação.
              </p>
            </div>
            <div className="relative inline-block w-12 h-6 flex-shrink-0 transition-opacity">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={settings.enableSuggestions}
                onChange={(e) => updateSettings({ enableSuggestions: e.target.checked })}
              />
              <span className="absolute inset-0 bg-gray-300 rounded-full transition-colors peer-checked:bg-blue-500"></span>
              <span className="absolute inset-y-1 left-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-6"></span>
            </div>
          </label>
        </section>

        <hr className="border-gray-100" />

        {/* Slash Commands Configuration */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <EyeOff size={18} className="text-gray-500" />
            <h3 className="font-medium text-gray-900">Comandos Rápidos (/)</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Desative os comandos que você não utiliza para manter seu menu mais limpo.
          </p>
          <div className="bg-gray-50 rounded-xl p-2 border border-gray-200">
            {AVAILABLE_COMMANDS.map((cmd) => {
              const isEnabled = !settings.disabledCommands.includes(cmd.id);
              return (
                <div
                  key={cmd.id}
                  className="flex items-center justify-between p-3 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-white border border-gray-200 shadow-sm flex items-center justify-center text-xs font-bold text-gray-600">
                      {cmd.icon}
                    </div>
                    <span
                      className={`font-medium ${isEnabled ? "text-gray-900" : "text-gray-400 line-through"}`}
                    >
                      {cmd.label}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={isEnabled}
                      onChange={() => toggleCommand(cmd.id)}
                    />
                    <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
