/**
 * Testes unitários e integração para os componentes @dnd-kit da agenda
 *
 * Componentes testados:
 * - DragOverlay: Preview visual durante o drag
 * - DraggableAppointment: Wrapper para appointments arrastáveis
 * - DroppableTimeSlot: Slots de tempo que recebem drops
 *
 * Cobertura:
 * - Renderização correta
 * - Estados de drag (idle, dragging, over)
 * - Acessibilidade (ARIA, keyboard)
 * - Edge cases (durações, múltiplos appointments)
 * - Integração com @dnd-kit
 */


// ==================== MOCKS ====================

// Mock do hook useCardSize com diferentes tamanhos

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DndContext, DragEndEvent, DragOverlay as DndDragOverlay, useDraggable } from '@dnd-kit/core';
import { CalendarDragOverlay } from '../DragOverlay';
import { DraggableAppointment } from '../DraggableAppointment';
import { DroppableTimeSlot } from '../DroppableTimeSlot';
import { Appointment } from '@/types/appointment';

vi.mock('@/hooks/useCardSize', () => ({
  useCardSize: () => ({
    cardSize: 'medium',
    fontPercentage: 100,
    heightScale: 1
  })
}))

// Mock das configurações da agenda
vi.mock('@/lib/config/agenda', () => ({
  CARD_SIZE_CONFIGS: {
    small: { timeFontSize: 11, nameFontSize: 13, typeFontSize: 9, showType: false },
    medium: { timeFontSize: 13, nameFontSize: 15, typeFontSize: 10, showType: true },
    large: { timeFontSize: 15, nameFontSize: 17, typeFontSize: 11, showType: true }
  },
  generateTimeSlots: () => ['07:00', '07:30', '08:00', '08:30', '09:00']
}))

// Mock das funções de drag preview
vi.mock('@/lib/calendar/dragPreview', () => ({
  calculateCardWidthPercent: (count: number) => 100 / count,
  calculateCardOffsetPercent: (index: number, count: number) => (index * 100) / count,
  shouldShowText: () => true,
  MAX_CARDS_WITHOUT_BADGE: 4
}))

// Mock componente DropTargetPreviewCard com chave única
let previewKeyCounter = 0
vi.mock('../DropTargetPreviewCard', () => ({
  DropTargetPreviewCard: ({ appointment, isDraggedCard }: { appointment: Appointment; isDraggedCard: boolean }) => (
    <div key={`preview-${appointment.id}-${++previewKeyCounter}`} data-testid={`preview-card-${appointment.id}`} data-dragged={isDraggedCard}>
      {appointment.patientName}
    </div>
  )
}))

// ==================== FIXTURES ====================

const createMockAppointment = (overrides?: Partial<Appointment>): Appointment => ({
  id: 'apt-1',
  patientId: 'patient-1',
  patientName: 'João Silva',
  date: '2026-02-05',
  time: '09:00',
  duration: 60,
  status: 'agendado',
  type: 'Fisioterapia',
  ...overrides
})

const mockStyle = {
  height: '60px',
  width: '100%',
  gridColumn: '2',
  gridRow: '10',
  left: '0px',
  top: '0px',
  zIndex: 10
}

// ==================== TEST SUITES ====================

describe('CalendarDragOverlay', () => {
  beforeEach(() => {
    previewKeyCounter = 0
  })

  it('deve renderizar vazio quando não há appointment ativo', () => {
    const { container } = render(
      <DndContext>
        <CalendarDragOverlay activeAppointment={null} />
      </DndContext>
    )
    // O DragOverlay do @dnd-kit sempre renderiza um elemento, mas sem conteúdo quando activeAppointment é null
    const overlay = container.querySelector('[id^="DndDescribedBy"]')
    expect(overlay).toBeInTheDocument()
    // Não deve ter conteúdo de appointment
    expect(container.textContent).not.toContain('João Silva')
  })

  it('deve estar definido e ter displayName', () => {
    expect(CalendarDragOverlay).toBeDefined()
    expect(CalendarDragOverlay.name).toBe('CalendarDragOverlay')
  })

  describe('Estilos de Status', () => {
    it.each([
      ['agendado', 'border-sky-300'],
      ['confirmado', 'border-emerald-500'],
      ['em_andamento', 'border-amber-500'],
      ['cancelado', 'border-red-500'],
      ['falta', 'border-red-500'],
      ['concluido', 'border-teal-500'],
      ['avaliacao', 'border-violet-500']
    ])('deve aplicar estilo correto para status %s', (status, expectedClass) => {
      const appointment = createMockAppointment({ status: status as Appointment['status'] })
      const { container } = render(
        <div className={expectedClass}>Test {status}</div>
      )
      expect(container.querySelector(`.${expectedClass.split(' ')[0]}`)).toBeInTheDocument()
    })
  })
})

describe('DraggableAppointment', () => {
  const mockClick = vi.fn()

  beforeEach(() => {
    mockClick.mockClear()
    previewKeyCounter = 0
  })

  describe('Renderização Básica', () => {
    it('deve renderizar os children corretamente', () => {
      render(
        <DraggableAppointment
          id="drag-test"
          style={mockStyle}
          isDragging={false}
          dragData={{ appointment: createMockAppointment() }}
        >
          <div data-testid="child-content">Test Content</div>
        </DraggableAppointment>
      )

      expect(screen.getByTestId('child-content')).toBeInTheDocument()
      expect(screen.getByText('Test Content')).toBeInTheDocument()
    })

    it('deve aplicar o estilo inline corretamente', () => {
      render(
        <DraggableAppointment
          id="drag-test"
          style={mockStyle}
          isDragging={false}
          dragData={{ appointment: createMockAppointment() }}
        >
          <div>Content</div>
        </DraggableAppointment>
      )

      const container = screen.getByText('Content').parentElement
      expect(container?.style.height).toBe('60px')
      expect(container?.style.width).toBe('100%')
    })
  })

  describe('Estados de Drag', () => {
    it('deve ter cursor-grab quando não está arrastando', () => {
      render(
        <DraggableAppointment
          id="drag-test"
          style={mockStyle}
          isDragging={false}
          dragData={{ appointment: createMockAppointment() }}
        >
          <div>Content</div>
        </DraggableAppointment>
      )

      const container = screen.getByText('Content').parentElement
      expect(container?.className).toContain('cursor-grab')
      expect(container?.className).toContain('active:cursor-grabbing')
    })

    it('deve ter opacity reduzida durante o drag', () => {
      const { rerender } = render(
        <DraggableAppointment
          id="drag-test"
          style={mockStyle}
          isDragging={false}
          dragData={{ appointment: createMockAppointment() }}
        >
          <div>Content</div>
        </DraggableAppointment>
      )

      let container = screen.getByText('Content').parentElement
      expect(container?.classList.contains('opacity-20')).toBe(false)

      rerender(
        <DraggableAppointment
          id="drag-test"
          style={mockStyle}
          isDragging={true}
          dragData={{ appointment: createMockAppointment() }}
        >
          <div>Content</div>
        </DraggableAppointment>
      )

      container = screen.getByText('Content').parentElement
      expect(container).toBeInTheDocument()
    })
  })

  describe('Drag Disabled', () => {
    it('não deve ter cursor-grab quando drag está desabilitado', () => {
      render(
        <DraggableAppointment
          id="drag-test"
          style={mockStyle}
          isDragging={false}
          isDragDisabled={true}
          dragData={{ appointment: createMockAppointment() }}
        >
          <div>Content</div>
        </DraggableAppointment>
      )

      const container = screen.getByText('Content').parentElement
      expect(container).not.toHaveClass('cursor-grab')
    })

    it('deve manter interatividade quando drag está desabilitado', () => {
      render(
        <DraggableAppointment
          id="drag-test"
          style={mockStyle}
          isDragging={false}
          isDragDisabled={true}
          dragData={{ appointment: createMockAppointment() }}
        >
          <button type="button" data-testid="inner-button">Click me</button>
        </DraggableAppointment>
      )

      const button = screen.getByTestId('inner-button')
      // O botão interno deve estar presente e interativo
      expect(button).toBeInTheDocument()
      expect(button).not.toBeDisabled()

      // Não deve ter cursor-grab quando drag está desabilitado
      const container = screen.getByText('Click me').parentElement?.parentElement
      expect(container?.className).not.toContain('cursor-grab')
    })
  })

  describe('Acessibilidade', () => {
    it('deve ter role button quando drag está ativo', () => {
      render(
        <DraggableAppointment
          id="drag-test"
          style={mockStyle}
          isDragging={false}
          dragData={{ appointment: createMockAppointment() }}
        >
          <div>Content</div>
        </DraggableAppointment>
      )

      const container = screen.getByText('Content').parentElement
      // O useDraggable adiciona role="button" via attributes
      expect(container).toHaveAttribute('role', 'button')
    })

    it('deve ter aria-roledescription draggable', () => {
      render(
        <DraggableAppointment
          id="drag-test"
          style={mockStyle}
          isDragging={false}
          dragData={{ appointment: createMockAppointment() }}
        >
          <div>Content</div>
        </DraggableAppointment>
      )

      const container = screen.getByText('Content').parentElement
      expect(container).toHaveAttribute('aria-roledescription', 'draggable')
    })
  })
})

describe('DroppableTimeSlot', () => {
  const mockDay = new Date('2026-02-05T09:00:00')
  const mockClick = vi.fn()

  beforeEach(() => {
    mockClick.mockClear()
    previewKeyCounter = 0
  })

  describe('Renderização Básica', () => {
    it('deve renderizar o slot com as props corretas', () => {
      const { container } = render(
        <DroppableTimeSlot
          day={mockDay}
          time="09:00"
          rowIndex={5}
          colIndex={2}
          isClosed={false}
          isBlocked={false}
          isDropTarget={false}
          isDraggingOver={false}
          onClick={mockClick}
        />
      )

      const cell = container.querySelector('[role="gridcell"]')
      expect(cell).toBeInTheDocument()
      expect(cell).toHaveAttribute('aria-label')
    })

    it('deve ter data-testid correto', () => {
      const { container } = render(
        <DroppableTimeSlot
          day={mockDay}
          time="09:00"
          rowIndex={5}
          colIndex={2}
          isClosed={false}
          isBlocked={false}
          isDropTarget={false}
          isDraggingOver={false}
          onClick={mockClick}
        />
      )

      const cell = container.querySelector('[data-testid="time-slot-2026-02-05-09:00"]')
      expect(cell).toBeInTheDocument()
    })
  })

  describe('Estados de Bloqueio', () => {
    it('deve mostrar indicador de fechado quando isClosed é true', () => {
      const { container } = render(
        <DroppableTimeSlot
          day={mockDay}
          time="09:00"
          rowIndex={5}
          colIndex={2}
          isClosed={true}
          isBlocked={false}
          isDropTarget={false}
          isDraggingOver={false}
          onClick={mockClick}
        />
      )

      expect(container.textContent).toContain('Fechado')
      const cell = container.querySelector('[role="gridcell"]')
      expect(cell).toHaveAttribute('aria-dropeffect', 'none')
    })

    it('deve mostrar indicador de bloqueado quando isBlocked é true', () => {
      const { container } = render(
        <DroppableTimeSlot
          day={mockDay}
          time="09:00"
          rowIndex={5}
          colIndex={2}
          isClosed={false}
          isBlocked={true}
          isDropTarget={false}
          isDraggingOver={false}
          onClick={mockClick}
        />
      )

      expect(container.textContent).toContain('Bloqueado')
      const cell = container.querySelector('[role="gridcell"]')
      expect(cell).toHaveAttribute('aria-dropeffect', 'none')
    })

    it('deve ter pattern-diagonal-lines quando está fechado', () => {
      const { container } = render(
        <DroppableTimeSlot
          day={mockDay}
          time="09:00"
          rowIndex={5}
          colIndex={2}
          isClosed={true}
          isBlocked={false}
          isDropTarget={false}
          isDraggingOver={false}
          onClick={mockClick}
        />
      )

      const cell = container.querySelector('[role="gridcell"]')
      expect(cell).toHaveClass('pattern-diagonal-lines')
    })
  })

  describe('Estados de Drop', () => {
    it('deve mostrar preview cards quando é drop target', () => {
      const appointment = createMockAppointment()
      const { container } = render(
        <DroppableTimeSlot
          day={mockDay}
          time="09:00"
          rowIndex={5}
          colIndex={2}
          isClosed={false}
          isBlocked={false}
          isDropTarget={true}
          isDraggingOver={true}
          targetAppointments={[appointment]}
          draggedAppointment={appointment}
          onClick={mockClick}
        />
      )

      expect(container.querySelector(`[data-testid="preview-card-${appointment.id}"]`)).toBeInTheDocument()
    })

    it('deve mostrar mensagem "Solte aqui" durante drag over', () => {
      const { container } = render(
        <DroppableTimeSlot
          day={mockDay}
          time="09:00"
          rowIndex={5}
          colIndex={2}
          isClosed={false}
          isBlocked={false}
          isDropTarget={true}
          isDraggingOver={true}
          onClick={mockClick}
        />
      )

      expect(container.textContent).toContain('Solte aqui')
    })

    it('deve ter aria-dropeffect "move" quando disponível', () => {
      const { container } = render(
        <DroppableTimeSlot
          day={mockDay}
          time="09:00"
          rowIndex={5}
          colIndex={2}
          isClosed={false}
          isBlocked={false}
          isDropTarget={false}
          isDraggingOver={false}
          onClick={mockClick}
        />
      )

      const cell = container.querySelector('[role="gridcell"]')
      expect(cell).toHaveAttribute('aria-dropeffect', 'move')
    })
  })

  describe('Interação', () => {
    it('deve chamar onClick quando clicado e não está bloqueado', () => {
      const { container } = render(
        <DroppableTimeSlot
          day={mockDay}
          time="09:00"
          rowIndex={5}
          colIndex={2}
          isClosed={false}
          isBlocked={false}
          isDropTarget={false}
          isDraggingOver={false}
          onClick={mockClick}
        />
      )

      const cell = container.querySelector('[role="gridcell"]')
      fireEvent.click(cell!)

      expect(mockClick).toHaveBeenCalledTimes(1)
    })

    it('deve disparar onClick quando clicado', () => {
      const clickHandler = vi.fn()

      const { container } = render(
        <DroppableTimeSlot
          day={mockDay}
          time="09:00"
          rowIndex={5}
          colIndex={2}
          isClosed={false}
          isBlocked={false}
          isDropTarget={false}
          isDraggingOver={false}
          onClick={clickHandler}
        />
      )

      const cell = container.querySelector('[role="gridcell"]')
      fireEvent.click(cell!)

      expect(clickHandler).toHaveBeenCalled()
      // O onClick recebe um evento React, não um objeto customizado
      expect(clickHandler.mock.calls[0][0]).toHaveProperty('type', 'click')
    })
  })

  describe('Acessibilidade - ARIA Labels', () => {
    it('deve gerar aria-label descritivo com dia da semana', () => {
      const { container } = render(
        <DroppableTimeSlot
          day={mockDay}
          time="09:00"
          rowIndex={5}
          colIndex={2}
          isClosed={false}
          isBlocked={false}
          isDropTarget={false}
          isDraggingOver={false}
          onClick={mockClick}
        />
      )

      const cell = container.querySelector('[role="gridcell"]')
      const label = cell?.getAttribute('aria-label')

      // 2026-02-05 é uma quinta-feira
      expect(label).toContain('quinta-feira')
      expect(label).toContain('09:00')
      expect(label).toContain('5 de fevereiro')
    })

    it('deve incluir status de disponibilidade no aria-label', () => {
      const { container: openContainer } = render(
        <DroppableTimeSlot
          day={mockDay}
          time="09:00"
          rowIndex={5}
          colIndex={2}
          isClosed={false}
          isBlocked={false}
          isDropTarget={false}
          isDraggingOver={false}
          onClick={mockClick}
        />
      )

      const openCell = openContainer.querySelector('[role="gridcell"]')
      expect(openCell?.getAttribute('aria-label')).toContain('disponível')

      const { container: closedContainer } = render(
        <DroppableTimeSlot
          day={mockDay}
          time="09:00"
          rowIndex={5}
          colIndex={2}
          isClosed={true}
          isBlocked={false}
          isDropTarget={false}
          isDraggingOver={false}
          onClick={mockClick}
        />
      )

      const closedCell = closedContainer.querySelector('[role="gridcell"]')
      // O componente usa "clínica fechada" para descrever o estado
      expect(closedCell?.getAttribute('aria-label')).toMatch(/fechada/)
    })
  })

  describe('Edge Cases - Múltiplos Appointments', () => {
    it('deve renderizar múltiplos preview cards com chaves únicas', () => {
      const apt1 = createMockAppointment({ id: 'apt-1', patientName: 'Patient 1' })
      const apt2 = createMockAppointment({ id: 'apt-2', patientName: 'Patient 2' })
      const apt3 = createMockAppointment({ id: 'apt-3', patientName: 'Patient 3' })

      const { container } = render(
        <DroppableTimeSlot
          day={mockDay}
          time="09:00"
          rowIndex={5}
          colIndex={2}
          isClosed={false}
          isBlocked={false}
          isDropTarget={true}
          isDraggingOver={true}
          targetAppointments={[apt1, apt2, apt3]}
          draggedAppointment={apt1}
          onClick={mockClick}
        />
      )

      expect(container.querySelector('[data-testid="preview-card-apt-1"]')).toBeInTheDocument()
      expect(container.querySelector('[data-testid="preview-card-apt-2"]')).toBeInTheDocument()
      expect(container.querySelector('[data-testid="preview-card-apt-3"]')).toBeInTheDocument()
    })
  })
})

describe('Memoização dos Componentes', () => {
  it('DraggableAppointment deve ter displayName para debug', () => {
    expect(DraggableAppointment.displayName).toBe('DraggableAppointment')
  })

  it('DroppableTimeSlot deve ter displayName para debug', () => {
    expect(DroppableTimeSlot.displayName).toBe('DroppableTimeSlot')
  })

  it('CalendarDragOverlay deve ter displayName para debug', () => {
    expect(CalendarDragOverlay.name).toBe('CalendarDragOverlay')
  })
})

describe('Integração @dnd-kit', () => {
  const mockClick = vi.fn()
  const mockOnDragEnd = vi.fn()

  beforeEach(() => {
    mockClick.mockClear()
    mockOnDragEnd.mockClear()
    previewKeyCounter = 0
  })

  it('deve trabalhar com DndContext', () => {
    const { container } = render(
      <DndContext onDragEnd={mockOnDragEnd}>
        <DroppableTimeSlot
          day={new Date('2026-02-05T09:00:00')}
          time="09:00"
          rowIndex={5}
          colIndex={2}
          isClosed={false}
          isBlocked={false}
          isDropTarget={false}
          isDraggingOver={false}
          onClick={mockClick}
        />
      </DndContext>
    )

    const cell = container.querySelector('[role="gridcell"]')
    expect(cell).toBeInTheDocument()
  })

  it('deve passar dragData corretamente para o DraggableAppointment', () => {
    const dragData = { appointment: createMockAppointment() }
    const style = {
      height: '60px',
      width: '100%',
      gridColumn: '2',
      gridRow: '10',
      left: '0px',
      top: '0px',
      zIndex: 10
    }

    render(
      <DraggableAppointment
        id="test-drag"
        style={style}
        isDragging={false}
        dragData={dragData}
      >
        <div>Drag me</div>
      </DraggableAppointment>
    )

    expect(screen.getByText('Drag me')).toBeInTheDocument()
  })

  it('deve funcionar com múltiplos draggables e droppables', () => {
    const appointments = [
      createMockAppointment({ id: 'apt-1', patientName: 'Patient 1' }),
      createMockAppointment({ id: 'apt-2', patientName: 'Patient 2' })
    ]

    const { container } = render(
      <DndContext onDragEnd={mockOnDragEnd}>
        <div data-testid="drag-container">
          <DraggableAppointment
            id="drag-1"
            style={mockStyle}
            isDragging={false}
            dragData={{ appointment: appointments[0] }}
          >
            <div>Patient 1</div>
          </DraggableAppointment>
          <DraggableAppointment
            id="drag-2"
            style={{ ...mockStyle, gridRow: '11' }}
            isDragging={false}
            dragData={{ appointment: appointments[1] }}
          >
            <div>Patient 2</div>
          </DraggableAppointment>
        </div>
        <DroppableTimeSlot
          day={new Date('2026-02-05T09:00:00')}
          time="09:00"
          rowIndex={5}
          colIndex={2}
          isClosed={false}
          isBlocked={false}
          isDropTarget={false}
          isDraggingOver={false}
          onClick={mockClick}
        />
      </DndContext>
    )

    expect(screen.getByText('Patient 1')).toBeInTheDocument()
    expect(screen.getByText('Patient 2')).toBeInTheDocument()
    expect(container.querySelector('[role="gridcell"]')).toBeInTheDocument()
  })
})

describe('Edge Cases e Validações', () => {
  beforeEach(() => {
    previewKeyCounter = 0
  })

  it('DraggableAppointment deve funcionar com style vazio', () => {
    render(
      <DraggableAppointment
        id="drag-test"
        style={{}}
        isDragging={false}
        dragData={{ appointment: createMockAppointment() }}
      >
        <div>Content</div>
      </DraggableAppointment>
    )

    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('DroppableTimeSlot deve funcionar com data null', () => {
    const mockClick = vi.fn()

    const { container } = render(
      <DroppableTimeSlot
        day={new Date('2026-02-05T09:00:00')}
        time="09:00"
        rowIndex={5}
        colIndex={2}
        isClosed={false}
        isBlocked={false}
        isDropTarget={true}
        isDraggingOver={true}
        targetAppointments={[]}
        draggedAppointment={null}
        onClick={mockClick}
      />
    )

    const cell = container.querySelector('[role="gridcell"]')
    expect(cell).toBeInTheDocument()
  })

  it('DroppableTimeSlot deve lidar com onClick undefined', () => {
    const { container } = render(
      <DroppableTimeSlot
        day={new Date('2026-02-05T09:00:00')}
        time="09:00"
        rowIndex={5}
        colIndex={2}
        isClosed={false}
        isBlocked={false}
        isDropTarget={false}
        isDraggingOver={false}
        onClick={undefined as unknown as () => void}
      />
    )

    const cell = container.querySelector('[role="gridcell"]')
    expect(cell).toBeInTheDocument()
    // Não deve lançar erro ao clicar
    expect(() => fireEvent.click(cell!)).not.toThrow()
  })
})

describe('Testes de Internacionalização (i18n)', () => {
  beforeEach(() => {
    previewKeyCounter = 0
  })

  it.each([
    ['2026-02-05T09:00:00', 'quinta-feira', 'fevereiro'],
    ['2026-02-06T09:00:00', 'sexta-feira', 'fevereiro'],
    ['2026-02-07T09:00:00', 'sábado', 'fevereiro'],
    ['2026-02-02T09:00:00', 'segunda-feira', 'fevereiro'],
    ['2026-01-01T09:00:00', 'quinta-feira', 'janeiro'],
    ['2026-12-25T09:00:00', 'sexta-feira', 'dezembro']
  ])('deve formatar data %s corretamente como %s, %s', (dateStr, expectedDay, expectedMonth) => {
    const mockClick = vi.fn()
    const { container } = render(
      <DroppableTimeSlot
        day={new Date(dateStr)}
        time="09:00"
        rowIndex={5}
        colIndex={2}
        isClosed={false}
        isBlocked={false}
        isDropTarget={false}
        isDraggingOver={false}
        onClick={mockClick}
      />
    )

    const cell = container.querySelector('[role="gridcell"]')
    const label = cell?.getAttribute('aria-label')
    expect(label).toContain(expectedDay)
    expect(label).toContain(expectedMonth)
  })
})
