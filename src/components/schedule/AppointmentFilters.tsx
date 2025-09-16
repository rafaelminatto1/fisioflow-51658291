import React, { memo, useCallback } from 'react';
import { Search, Filter, X, Calendar, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export interface AppointmentFilters {
  search: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  service: string;
}

interface AppointmentFiltersProps {
  filters: AppointmentFilters;
  onFiltersChange: (filters: AppointmentFilters) => void;
  onClearFilters: () => void;
  services: string[];
}

const AppointmentFiltersComponent: React.FC<AppointmentFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  services
}) => {
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, search: e.target.value });
  }, [filters, onFiltersChange]);

  const handleStatusChange = useCallback((value: string) => {
    onFiltersChange({ ...filters, status: value === 'all' ? '' : value });
  }, [filters, onFiltersChange]);

  const handleServiceChange = useCallback((value: string) => {
    onFiltersChange({ ...filters, service: value === 'all' ? '' : value });
  }, [filters, onFiltersChange]);

  const handleDateFromChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, dateFrom: e.target.value });
  }, [filters, onFiltersChange]);

  const handleDateToChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, dateTo: e.target.value });
  }, [filters, onFiltersChange]);

  const hasActiveFilters = filters.search || filters.status || filters.service || filters.dateFrom || filters.dateTo;

  return (
    <Card className="border-0 shadow-lg bg-white">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-1.5 bg-blue-100 rounded-lg">
            <Filter className="h-4 w-4 text-blue-600" />
          </div>
          Filtros
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
              Ativos
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Buscar Paciente
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Nome do paciente..."
                value={filters.search}
                onChange={handleSearchChange}
                className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Status
            </label>
            <Select value={filters.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <SelectValue placeholder="Todos" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="scheduled">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Agendado
                  </div>
                </SelectItem>
                <SelectItem value="confirmed">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Confirmado
                  </div>
                </SelectItem>
                <SelectItem value="completed">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    Concluído
                  </div>
                </SelectItem>
                <SelectItem value="cancelled">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    Cancelado
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Service Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Serviço
            </label>
            <Select value={filters.service} onValueChange={handleServiceChange}>
              <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <SelectValue placeholder="Todos" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Serviços</SelectItem>
                {services.map((service) => (
                  <SelectItem key={service} value={service}>
                    {service}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="lg:col-span-1">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Período
            </label>
            <div className="space-y-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={handleDateFromChange}
                  className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500 text-sm"
                  placeholder="Data inicial"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={handleDateToChange}
                  className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500 text-sm"
                  placeholder="Data final"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <Button 
              variant="outline" 
              onClick={onClearFilters}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 border-gray-200 hover:border-gray-300"
            >
              <X className="h-4 w-4" />
              Limpar Filtros
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const AppointmentFilters = memo(AppointmentFiltersComponent);
export default AppointmentFilters;