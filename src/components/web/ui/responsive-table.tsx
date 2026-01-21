import React, { useMemo, useCallback } from 'react';
import { Card, CardContent } from './card';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  mobileLabel?: string;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

function ResponsiveTableComponent<T extends Record<string, unknown>>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  emptyMessage = 'Nenhum item encontrado'
}: ResponsiveTableProps<T>) {
  const handleRowClick = useCallback((item: T) => {
    onRowClick?.(item);
  }, [onRowClick]);

  const memoizedColumns = useMemo(() => columns, [columns]);

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              {memoizedColumns.map((col) => (
                <th
                  key={col.key}
                  className="text-left py-3 px-4 font-medium text-sm text-muted-foreground"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr
                key={keyExtractor(item)}
                onClick={() => handleRowClick(item)}
                className={`border-b hover:bg-muted/50 transition-colors ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
              >
                {memoizedColumns.map((col) => (
                  <td key={col.key} className="py-3 px-4">
                    {col.render ? col.render(item) : String(item[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {data.map((item) => (
          <Card
            key={keyExtractor(item)}
            onClick={() => handleRowClick(item)}
            className={onRowClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
          >
            <CardContent className="p-4 space-y-2">
              {memoizedColumns.map((col) => (
                <div key={col.key} className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">
                    {col.mobileLabel || col.label}:
                  </span>
                  <span className="text-sm text-right">
                    {col.render ? col.render(item) : String(item[col.key] ?? '')}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

export const ResponsiveTable = React.memo(ResponsiveTableComponent) as typeof ResponsiveTableComponent;
