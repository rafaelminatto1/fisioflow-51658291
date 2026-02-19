export function SOAPEditorSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-label="Loading SOAP editor">
      {['Subjetivo', 'Objetivo', 'Avaliação', 'Plano'].map((section) => (
        <div key={section} className="space-y-2">
          <div className="h-5 w-32 bg-muted rounded" />
          <div className="h-32 bg-muted rounded w-full" />
        </div>
      ))}
      <div className="flex gap-2">
        <div className="h-10 w-24 bg-muted rounded" />
        <div className="h-10 w-32 bg-muted rounded" />
      </div>
    </div>
  )
}
