/**
 * Componente: ReceiptButton
 * Botão para gerar recibos em PDF
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { useReceiptGenerator } from '@/hooks/useReceiptGenerator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface ReceiptButtonProps {
  transaction: {
    id: string;
    valor: number | string;
    patient_name?: string;
    patient_cpf?: string;
    descricao?: string;
    payment_method?: string;
    created_at?: string | Date;
  };
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  label?: string;
}

export function ReceiptButton({
  transaction,
  variant = 'outline',
  size = 'sm',
  className,
  label = 'Recibo',
}: ReceiptButtonProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isGenerating, generateReceiptFromTransaction } = useReceiptGenerator({
    onSuccess: () => {
      toast({
        title: 'Recibo gerado',
        description: 'O recibo foi baixado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao gerar recibo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleGenerate = async () => {
    try {
      await generateReceiptFromTransaction(
        transaction,
        {
          name: user?.clinic?.name,
          address: user?.clinic?.address ? `${user.clinic.address.street}, ${user.clinic.address.number}` : undefined,
          cnpj: user?.clinic?.cnpj,
          phone: user?.clinic?.phone,
          city: user?.clinic?.city,
          state: user?.clinic?.state,
        },
        `recibo-${transaction.id}.pdf`
      );
    } catch (error) {
      // Error já tratado no hook
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleGenerate}
      disabled={isGenerating}
      className={className}
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileText className="h-4 w-4" />
      )}
      {!isGenerating && <span className="ml-1.5">{label}</span>}
    </Button>
  );
}

export default ReceiptButton;
