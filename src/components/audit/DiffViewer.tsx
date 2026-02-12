
import { Minus, Plus } from 'lucide-react';

interface DiffViewerProps {
    oldData: Record<string, unknown>;
    newData: Record<string, unknown>;
    changes: Record<string, { old: unknown; new: unknown }> | null;
}

export default function DiffViewer({ oldData, newData, changes }: DiffViewerProps) {
    if (changes && Object.keys(changes).length > 0) {
        return (
            <div className="space-y-2">
                {Object.entries(changes).map(([key, value]) => (
                    <div key={key} className="text-sm border-b pb-2">
                        <span className="font-medium text-muted-foreground">{key}:</span>
                        <div className="flex gap-4 mt-1">
                            <div className="flex items-center gap-1">
                                <Minus className="h-3 w-3 text-destructive" />
                                <code className="text-xs bg-destructive/10 px-1 rounded">
                                    {JSON.stringify(value.old)}
                                </code>
                            </div>
                            <div className="flex items-center gap-1">
                                <Plus className="h-3 w-3 text-green-500" />
                                <code className="text-xs bg-green-500/10 px-1 rounded">
                                    {JSON.stringify(value.new)}
                                </code>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-4">
            {oldData && (
                <div>
                    <h4 className="font-semibold mb-2 text-destructive">Dados Anteriores</h4>
                    <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-60">
                        {JSON.stringify(oldData, null, 2)}
                    </pre>
                </div>
            )}
            {newData && (
                <div>
                    <h4 className="font-semibold mb-2 text-green-500">Dados Novos</h4>
                    <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-60">
                        {JSON.stringify(newData, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}
