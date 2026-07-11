import re

with open('src/components/schedule/settings/tabs/AparenciaTab.tsx', 'r') as f:
    content = f.read()

# 1. Update ViewControls props to include new setters
content = content.replace(
    '  onOpacity: (val: number) => void;',
    '  onOpacity: (val: number) => void;\n  onTheme: (val: string) => void;\n  onBorderRadius: (val: string) => void;\n  onBorderStyle: (val: string) => void;'
)

# 2. Extract new variables in ViewControls
content = content.replace(
    '  const opacity = appearance.opacity ?? 100;',
    '  const opacity = appearance.opacity ?? 100;\n  const colorTheme = appearance.colorTheme ?? "status";\n  const borderRadius = appearance.borderRadius ?? "lg";\n  const borderStyle = appearance.borderStyle ?? "left";'
)

# 3. Add new FieldRows inside the Component inside ViewControls
new_fields = """
              <FieldRow
                label="Tema de Cores"
                description="Como as cores dos status são aplicadas"
                control={
                  <select
                    value={colorTheme}
                    onChange={(e) => onTheme(e.target.value)}
                    className="w-48 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    <option value="status">Padrão (Forte)</option>
                    <option value="pastel">Pastel (Suave)</option>
                    <option value="vibrant">Vibrante</option>
                    <option value="monochrome">Monocromático</option>
                  </select>
                }
              />
              <FieldRow
                label="Estilo da Borda"
                description="Borda de destaque do card"
                control={
                  <select
                    value={borderStyle}
                    onChange={(e) => onBorderStyle(e.target.value)}
                    className="w-48 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    <option value="left">Apenas Esquerda</option>
                    <option value="full">Contorno Completo</option>
                    <option value="none">Sem Borda</option>
                  </select>
                }
              />
              <FieldRow
                label="Arredondamento"
                description="Formato dos cantos dos cards"
                control={
                  <select
                    value={borderRadius}
                    onChange={(e) => onBorderRadius(e.target.value)}
                    className="w-48 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    <option value="none">Quadrado (0px)</option>
                    <option value="sm">Suave (2px)</option>
                    <option value="md">Médio (4px)</option>
                    <option value="lg">Arredondado (8px)</option>
                    <option value="full">Pílula (Total)</option>
                  </select>
                }
              />
"""

content = content.replace(
    '              <FieldRow\n                label="Opacidade"',
    new_fields + '              <FieldRow\n                label="Opacidade"'
)

# 4. Update the preview styling to respect the new theme/border logic
# The preview card currently has hardcoded styles. We will modify it slightly.
preview_styles_replacement = """style={{
                minHeight: preview.minHeight,
                fontSize: preview.fontSize * (fontScale / 5),
                padding: `${2 * (paddingScale / 5)}px 8px`,
                borderWidth: borderStyle === "full" ? "1px" : "0",
                borderLeftWidth: borderStyle === "left" || borderStyle === "full" ? "4px" : "0",
                borderRadius: borderRadius === "none" ? "0" : borderRadius === "sm" ? "2px" : borderRadius === "lg" ? "8px" : borderRadius === "full" ? "9999px" : "4px",
              }}"""

content = content.replace("""style={{
                minHeight: preview.minHeight,
                fontSize: preview.fontSize * (fontScale / 5),
                padding: `${2 * (paddingScale / 5)}px 8px`,
              }}""", preview_styles_replacement)

# 5. Add new setters to the <ViewControls /> call in AparenciaTab
view_controls_call = """        <ViewControls
          key={activeView}
          view={activeView}
          onDensity={handleDensity}
          onHeightScale={handleHeightScale}
          onFontScale={(v) => activeHook.setFontScale(v)}
          onPaddingScale={(v) => activeHook.setPaddingScale(v)}
          onOpacity={(v) => activeHook.setOpacity(v)}
          onTheme={(v) => activeHook.setColorTheme(v)}
          onBorderRadius={(v) => activeHook.setBorderRadius(v)}
          onBorderStyle={(v) => activeHook.setBorderStyle(v)}
          onApplyToAll={handleApplyToAll}
          onResetView={handleResetView}
        />"""

content = re.sub(r'<ViewControls[\s\S]*?onResetView=\{handleResetView\}\n\s*/>', view_controls_call, content)


# 6. Include them in applyToAllViews
apply_to_all_replacement = """  const handleApplyToAll = () => {
    const curr = activeHook.appearance;
    applyToAllViews({
      cardSize: curr.cardSize,
      heightScale: curr.heightScale,
      fontScale: curr.fontScale,
      paddingScale: curr.paddingScale,
      opacity: curr.opacity,
      timeFontScale: curr.timeFontScale,
      typeFontScale: curr.typeFontScale,
      colorTheme: curr.colorTheme,
      borderRadius: curr.borderRadius,
      borderStyle: curr.borderStyle,
    });
  };"""

content = re.sub(r'const handleApplyToAll = \(\) => \{[\s\S]*?\}\);\n  \};', apply_to_all_replacement, content)

# 7. Add Save feedback to SectionCard
# In SectionCard import, add SaveIndicator
save_indicator = """
function SaveIndicator({ isSaving, lastSavedAt }: { isSaving: boolean; lastSavedAt: Date | null }) {
  if (isSaving) return <span className="flex items-center gap-1.5 text-xs text-blue-500"><span className="h-2 w-2 animate-ping rounded-full bg-blue-500"></span> Salvando...</span>;
  if (lastSavedAt) return <span className="flex items-center gap-1 text-xs text-slate-500"><Check className="h-3.5 w-3.5 text-green-500" /> Salvo</span>;
  return null;
}
"""

content = content.replace('export function AparenciaTab', save_indicator + '\nexport function AparenciaTab')

# Update the SectionCard action
section_card_replacement = """    <SectionCard
      icon={<SlidersHorizontal className="h-4 w-4" />}
      title="Aparência da Agenda"
      description="Configure a densidade e altura dos cards. Cada visão pode ter configuração independente."
      action={
        <div className="flex items-center gap-4">
          <SaveIndicator isSaving={isSyncing} lastSavedAt={lastSyncedAt} />
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Restaurar padrões
          </Button>
        </div>
      }
    >"""

content = re.sub(r'<SectionCard[\s\S]*?Restaurar padrões\n\s*</Button>\n\s*\}\n\s*>', section_card_replacement, content)

with open('src/components/schedule/settings/tabs/AparenciaTab.tsx', 'w') as f:
    f.write(content)
