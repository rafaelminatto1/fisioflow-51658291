import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUpload } from '@/components/ui/file-upload';
import { createMockFile, createMockDragEvent } from '../setup';

// Mock do Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: 'https://example.com/file.pdf' }
        }))
      }))
    }
  }
}));

// Mock do sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => 'toast-id'),
    dismiss: vi.fn()
  }
}));

describe('FileUpload Component', () => {
  const mockOnUpload = vi.fn();
  const mockOnError = vi.fn();
  
  const defaultProps = {
    onUpload: mockOnUpload,
    onError: mockOnError,
    accept: '.pdf,.doc,.docx',
    maxSize: 5 * 1024 * 1024, // 5MB
    bucket: 'documents'
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('Rendering', () => {
    it('should render upload area with correct text', () => {
      render(<FileUpload {...defaultProps} />);
      
      expect(screen.getByText('Clique para selecionar ou arraste arquivos aqui')).toBeInTheDocument();
      expect(screen.getByText('Formatos aceitos: .pdf, .doc, .docx')).toBeInTheDocument();
      expect(screen.getByText('Tamanho máximo: 5 MB')).toBeInTheDocument();
    });
    
    it('should render with custom text', () => {
      render(
        <FileUpload
          {...defaultProps}
          text="Upload personalizado"
          description="Descrição personalizada"
        />
      );
      
      expect(screen.getByText('Upload personalizado')).toBeInTheDocument();
      expect(screen.getByText('Descrição personalizada')).toBeInTheDocument();
    });
    
    it('should render multiple upload when enabled', () => {
      render(<FileUpload {...defaultProps} multiple />);
      
      const input = screen.getByRole('button').querySelector('input');
      expect(input).toHaveAttribute('multiple');
    });
    
    it('should be disabled when disabled prop is true', () => {
      render(<FileUpload {...defaultProps} disabled />);
      
      const uploadArea = screen.getByRole('button');
      expect(uploadArea).toBeDisabled();
      expect(uploadArea).toHaveClass('opacity-50', 'cursor-not-allowed');
    });
  });
  
  describe('File Selection', () => {
    it('should handle file selection via click', async () => {
      const user = userEvent.setup();
      render(<FileUpload {...defaultProps} />);
      
      const file = createMockFile('test.pdf', 1024, 'application/pdf');
      const input = screen.getByRole('button').querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, file);
      
      expect(input.files).toHaveLength(1);
      expect(input.files?.[0]).toBe(file);
    });
    
    it('should handle multiple file selection', async () => {
      const user = userEvent.setup();
      render(<FileUpload {...defaultProps} multiple />);
      
      const files = [
        createMockFile('test1.pdf', 1024, 'application/pdf'),
        createMockFile('test2.pdf', 2048, 'application/pdf')
      ];
      
      const input = screen.getByRole('button').querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, files);
      
      expect(input.files).toHaveLength(2);
    });
  });
  
  describe('Drag and Drop', () => {
    it('should handle drag enter and leave events', () => {
      render(<FileUpload {...defaultProps} />);
      
      const uploadArea = screen.getByRole('button');
      
      fireEvent.dragEnter(uploadArea, createMockDragEvent([]));
      expect(uploadArea).toHaveClass('border-primary', 'bg-primary/5');
      
      fireEvent.dragLeave(uploadArea, createMockDragEvent([]));
      expect(uploadArea).not.toHaveClass('border-primary', 'bg-primary/5');
    });
    
    it('should handle file drop', async () => {
      render(<FileUpload {...defaultProps} />);
      
      const uploadArea = screen.getByRole('button');
      const file = createMockFile('dropped.pdf', 1024, 'application/pdf');
      
      fireEvent.drop(uploadArea, createMockDragEvent([file]));
      
      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalled();
      });
    });
    
    it('should prevent default drag over behavior', () => {
      render(<FileUpload {...defaultProps} />);
      
      const uploadArea = screen.getByRole('button');
      const dragOverEvent = createMockDragEvent([]);
      
      fireEvent.dragOver(uploadArea, dragOverEvent);
      
      expect(dragOverEvent.preventDefault).toHaveBeenCalled();
    });
  });
  
  describe('File Validation', () => {
    it('should reject files that exceed max size', async () => {
      const user = userEvent.setup();
      render(<FileUpload {...defaultProps} maxSize={1024} />);
      
      const largeFile = createMockFile('large.pdf', 2048, 'application/pdf');
      const input = screen.getByRole('button').querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, largeFile);
      
      expect(mockOnError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('muito grande')
        })
      );
    });
    
    it('should reject files with invalid extensions', async () => {
      const user = userEvent.setup();
      render(<FileUpload {...defaultProps} accept=".pdf" />);
      
      const invalidFile = createMockFile('test.txt', 1024, 'text/plain');
      const input = screen.getByRole('button').querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, invalidFile);
      
      expect(mockOnError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('formato não é aceito')
        })
      );
    });
    
    it('should accept valid files', async () => {
      const user = userEvent.setup();
      render(<FileUpload {...defaultProps} />);
      
      const validFile = createMockFile('valid.pdf', 1024, 'application/pdf');
      const input = screen.getByRole('button').querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, validFile);
      
      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalled();
      });
    });
  });
  
  describe('Upload Process', () => {
    it('should show loading state during upload', async () => {
      const { supabase } = await import('@/lib/supabase');
      const mockUpload = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: { path: 'test.pdf' } }), 100))
      );
      
      supabase.storage.from().upload = mockUpload;
      
      const user = userEvent.setup();
      render(<FileUpload {...defaultProps} />);
      
      const file = createMockFile('test.pdf', 1024, 'application/pdf');
      const input = screen.getByRole('button').querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, file);
      
      // Verificar se o estado de loading é mostrado
      expect(screen.getByText('Enviando...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalled();
      });
    });
    
    it('should handle upload success', async () => {
      const { supabase } = await import('@/lib/supabase');
      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: 'documents/test.pdf' },
        error: null
      });
      
      supabase.storage.from().upload = mockUpload;
      
      const user = userEvent.setup();
      render(<FileUpload {...defaultProps} />);
      
      const file = createMockFile('test.pdf', 1024, 'application/pdf');
      const input = screen.getByRole('button').querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, file);
      
      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalledWith({
          file,
          path: 'documents/test.pdf',
          url: 'https://example.com/file.pdf'
        });
      });
    });
    
    it('should handle upload error', async () => {
      const { supabase } = await import('@/lib/supabase');
      const mockUpload = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Upload failed' }
      });
      
      supabase.storage.from().upload = mockUpload;
      
      const user = userEvent.setup();
      render(<FileUpload {...defaultProps} />);
      
      const file = createMockFile('test.pdf', 1024, 'application/pdf');
      const input = screen.getByRole('button').querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, file);
      
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Upload failed'
          })
        );
      });
    });
  });
  
  describe('Progress Tracking', () => {
    it('should show upload progress when showProgress is true', async () => {
      render(<FileUpload {...defaultProps} showProgress />);
      
      const user = userEvent.setup();
      const file = createMockFile('test.pdf', 1024, 'application/pdf');
      const input = screen.getByRole('button').querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, file);
      
      // Verificar se a barra de progresso aparece
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });
    
    it('should update progress during upload', async () => {
      // Mock XMLHttpRequest para simular progresso
      const mockXHR = {
        open: vi.fn(),
        send: vi.fn(),
        setRequestHeader: vi.fn(),
        upload: {
          addEventListener: vi.fn((event, callback) => {
            if (event === 'progress') {
              // Simular progresso
              setTimeout(() => callback({ loaded: 50, total: 100 }), 50);
              setTimeout(() => callback({ loaded: 100, total: 100 }), 100);
            }
          })
        },
        addEventListener: vi.fn((event, callback) => {
          if (event === 'load') {
            setTimeout(callback, 150);
          }
        }),
        status: 200,
        response: JSON.stringify({ path: 'test.pdf' })
      };
      
      vi.stubGlobal('XMLHttpRequest', vi.fn(() => mockXHR));
      
      render(<FileUpload {...defaultProps} showProgress />);
      
      const user = userEvent.setup();
      const file = createMockFile('test.pdf', 1024, 'application/pdf');
      const input = screen.getByRole('button').querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, file);
      
      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toBeInTheDocument();
      });
    });
  });
  
  describe('File Preview', () => {
    it('should show file preview when showPreview is true', async () => {
      render(<FileUpload {...defaultProps} showPreview />);
      
      const user = userEvent.setup();
      const file = createMockFile('test.pdf', 1024, 'application/pdf');
      const input = screen.getByRole('button').querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, file);
      
      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
        expect(screen.getByText('1 KB')).toBeInTheDocument();
      });
    });
    
    it('should allow removing files from preview', async () => {
      render(<FileUpload {...defaultProps} showPreview multiple />);
      
      const user = userEvent.setup();
      const file = createMockFile('test.pdf', 1024, 'application/pdf');
      const input = screen.getByRole('button').querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, file);
      
      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });
      
      const removeButton = screen.getByRole('button', { name: /remover/i });
      await user.click(removeButton);
      
      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
    });
  });
  
  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<FileUpload {...defaultProps} />);
      
      const uploadArea = screen.getByRole('button');
      expect(uploadArea).toHaveAttribute('aria-label', expect.stringContaining('upload'));
      
      const input = uploadArea.querySelector('input[type="file"]');
      expect(input).toHaveAttribute('aria-describedby');
    });
    
    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<FileUpload {...defaultProps} />);
      
      const uploadArea = screen.getByRole('button');
      
      await user.tab();
      expect(uploadArea).toHaveFocus();
      
      await user.keyboard('{Enter}');
      // Verificar se o input de arquivo foi ativado
      const input = uploadArea.querySelector('input[type="file"]');
      expect(input).toBeInTheDocument();
    });
    
    it('should announce upload status to screen readers', async () => {
      render(<FileUpload {...defaultProps} />);
      
      const user = userEvent.setup();
      const file = createMockFile('test.pdf', 1024, 'application/pdf');
      const input = screen.getByRole('button').querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, file);
      
      await waitFor(() => {
        const statusElement = screen.getByRole('status');
        expect(statusElement).toBeInTheDocument();
      });
    });
  });
});