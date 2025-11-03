import { useOrganizations } from '@/hooks/useOrganizations';
import { Building2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const OrganizationSelector = () => {
  const { organizations, currentOrganization, isLoading } = useOrganizations();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span>Carregando...</span>
      </div>
    );
  }

  if (!organizations || organizations.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select value={currentOrganization?.id} disabled>
        <SelectTrigger className="w-[200px]">
          <SelectValue>
            {currentOrganization?.name || 'Selecione...'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {organizations.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              {org.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
