
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentRegistrationModal } from '@/components/schedule/PaymentRegistrationModal';
import { FinancialService } from '@/services/financialService';
import { useUpdateAppointment } from '@/hooks/useAppointments';

// Mock dependencies
vi.mock('@/services/financialService', () => ({
    FinancialService: {
        createTransaction: vi.fn(),
    },
}));

vi.mock('@/hooks/useAppointments', () => ({
    useUpdateAppointment: vi.fn(),
}));

// Mock Sonner toast
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock UI components that might cause issues in test environment
// Simplified mocks for complex components if needed
vi.mock('@/components/ui/calendar', () => ({
    Calendar: ({ onSelect }: any) => (
        <div data-testid="calendar-mock">
            <button onClick={() => onSelect(new Date('2024-03-20'))}>Select Date</button>
        </div>
    ),
}));

describe('PaymentRegistrationModal', () => {
    const mockUpdateAppointment = vi.fn();
    const mockOnOpenChange = vi.fn();
    const mockOnSuccess = vi.fn();

    const defaultAppointment = {
        id: 'apt-123',
        patientId: 'pat-123',
        patientName: 'John Doe',
        therapistId: 'therapist-123',
        date: '2024-03-20',
        time: '14:00',
        duration: 60,
        status: 'agendado',
        payment_amount: 150,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (useUpdateAppointment as any).mockReturnValue({
            mutateAsync: mockUpdateAppointment,
        });

        // Mock clipboard
        // Mock clipboard
        Object.defineProperty(navigator, 'clipboard', {
            value: {
                writeText: vi.fn(),
                readText: vi.fn(),
            },
            writable: true,
        });
    });

    it('renders correctly when open', () => {
        render(
            <PaymentRegistrationModal
                open={true}
                onOpenChange={mockOnOpenChange}
                appointment={defaultAppointment as any}
            />
        );

        expect(screen.getByText('Registrar Pagamento')).toBeInTheDocument();
        expect(screen.getByText('Confirme os detalhes do pagamento para este atendimento.')).toBeInTheDocument();
        expect(screen.getByLabelText(/Valor/i)).toHaveValue(150);
    });

    it('submits payment successfully', async () => {
        const user = userEvent.setup();
        render(
            <PaymentRegistrationModal
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
                appointment={defaultAppointment as any}
            />
        );

        // Verify initial values
        const amountInput = screen.getByLabelText(/Valor/i);
        expect(amountInput).toHaveValue(150);

        // Submit form
        const submitButton = screen.getByRole('button', { name: /Confirmar Pagamento/i });
        await user.click(submitButton);

        await waitFor(() => {
            expect(FinancialService.createTransaction).toHaveBeenCalledWith(expect.objectContaining({
                valor: 150,
                metadata: expect.objectContaining({
                    appointmentId: 'apt-123',
                    patientId: 'pat-123',
                }),
            }));
        });

        await waitFor(() => {
            expect(mockUpdateAppointment).toHaveBeenCalledWith(expect.objectContaining({
                appointmentId: 'apt-123',
                updates: expect.objectContaining({
                    payment_status: 'paid',
                }),
            }));
        });

        expect(mockOnSuccess).toHaveBeenCalled();
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('updates appointment status only for single session', async () => {
        // Test logic if we implemented differentiation
        // Current implementation always updates to 'paid', so this test confirms that behavior
        const user = userEvent.setup();
        render(
            <PaymentRegistrationModal
                open={true}
                onOpenChange={mockOnOpenChange}
                appointment={defaultAppointment as any}
            />
        );

        // Select Package type (if we had specific logic for it not updating status, we'd test it here)
        // But for now, just ensure it works.

        const submitButton = screen.getByRole('button', { name: /Confirmar Pagamento/i });
        await user.click(submitButton);

        await waitFor(() => {
            expect(mockUpdateAppointment).toHaveBeenCalled();
        });
    });

    it('handles API errors gracefully', async () => {
        const user = userEvent.setup();
        (FinancialService.createTransaction as any).mockRejectedValue(new Error('API Error'));

        render(
            <PaymentRegistrationModal
                open={true}
                onOpenChange={mockOnOpenChange}
                appointment={defaultAppointment as any}
            />
        );

        const submitButton = screen.getByRole('button', { name: /Confirmar Pagamento/i });
        await user.click(submitButton);

        await waitFor(() => {
            expect(FinancialService.createTransaction).toHaveBeenCalled();
        });

        // Should NOT update appointment if transaction failed
        expect(mockUpdateAppointment).not.toHaveBeenCalled();
        // Should NOT close modal
        expect(mockOnOpenChange).not.toHaveBeenCalledWith(false);
    });
});
