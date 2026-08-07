import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExerciseMediaEditModal } from "./ExerciseMediaEditModal";
import type { ExerciseVideo } from "@/services/exerciseVideos";

const mockMedia: ExerciseVideo = {
  id: "test-media-1",
  exercise_id: "test-exercise-1",
  organization_id: "test-org-1",
  title: "Test Exercise Media",
  description: "Test description",
  video_url: "https://example.com/video.mp4",
  thumbnail_url: "https://example.com/thumb.jpg",
  duration: 120,
  file_size: 5242880,
  category: "fortalecimento",
  difficulty: "intermediário",
  body_parts: ["ombro", "bíceps"],
  equipment: ["halter"],
  type: "video",
  uploaded_by: "test-user",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockOnSave = vi.fn();

describe("ExerciseMediaEditModal", () => {
  beforeEach(() => {
    mockOnSave.mockClear();
  });

  it("renders with open=true and media prop", () => {
    render(
      <ExerciseMediaEditModal
        open={true}
        onOpenChange={vi.fn()}
        exerciseId="test-exercise-1"
        media={mockMedia}
        onSave={mockOnSave}
      />,
    );

    expect(screen.getByText("Editar Mídia do Exercício")).toBeInTheDocument();
    expect(screen.getByText("Test Exercise Media")).toBeInTheDocument();
  });

  it("renders with open=true and no media prop", () => {
    render(
      <ExerciseMediaEditModal
        open={true}
        onOpenChange={vi.fn()}
        exerciseId="test-exercise-1"
        media={null}
        onSave={mockOnSave}
      />,
    );

    expect(screen.getByText("Editar Mídia do Exercício")).toBeInTheDocument();
    expect(screen.getByText("Arraste um vídeo/imagem ou clique para selecionar")).toBeInTheDocument();
  });

  it("shows upload area when no media and no file selected", () => {
    render(
      <ExerciseMediaEditModal
        open={true}
        onOpenChange={vi.fn()}
        exerciseId="test-exercise-1"
        media={null}
        onSave={mockOnSave}
      />,
    );

    expect(screen.getByText("Arraste um vídeo/imagem ou clique para selecionar")).toBeInTheDocument();
  });

  it("calls onOpenChange when cancel is clicked", () => {
    const onOpenChange = vi.fn();
    render(
      <ExerciseMediaEditModal
        open={true}
        onOpenChange={onOpenChange}
        exerciseId="test-exercise-1"
        media={mockMedia}
        onSave={mockOnSave}
      />,
    );

    const cancelButton = screen.getByText("Cancelar");
    fireEvent.click(cancelButton);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables save button when title is too short", () => {
    render(
      <ExerciseMediaEditModal
        open={true}
        onOpenChange={vi.fn()}
        exerciseId="test-exercise-1"
        media={mockMedia}
        onSave={mockOnSave}
      />,
    );

    const saveButton = screen.getByText("Salvar Alterações");
    expect(saveButton).toBeDisabled();
  });

  it("enables save button when form is valid", async () => {
    render(
      <ExerciseMediaEditModal
        open={true}
        onOpenChange={vi.fn()}
        exerciseId="test-exercise-1"
        media={mockMedia}
        onSave={mockOnSave}
      />,
    );

    const titleInput = screen.getByPlaceholderText("Ex: Rotação de Ombro com Bastão");
    fireEvent.change(titleInput, { target: { value: "Rotação de Ombro" } });

    const categorySelect = screen.getByRole("combobox");
    fireEvent.change(categorySelect, { target: { value: "fortalecimento" } });

    const difficultySelect = screen.getByRole("combobox");
    fireEvent.change(difficultySelect, { target: { value: "intermediário" } });

    const saveButton = screen.getByText("Salvar Alterações");
    expect(saveButton).not.toBeDisabled();
  });

  it("shows remove confirmation when remove button is clicked", () => {
    render(
      <ExerciseMediaEditModal
        open={true}
        onOpenChange={vi.fn()}
        exerciseId="test-exercise-1"
        media={mockMedia}
        onSave={mockOnSave}
      />,
    );

    const removeButton = screen.getByText("Remover");
    fireEvent.click(removeButton);

    expect(screen.getByText("Remover mídia?")).toBeInTheDocument();
  });

  it("calls onSave with metadata when save is clicked", async () => {
    render(
      <ExerciseMediaEditModal
        open={true}
        onOpenChange={vi.fn()}
        exerciseId="test-exercise-1"
        media={mockMedia}
        onSave={mockOnSave}
      />,
    );

    const titleInput = screen.getByPlaceholderText("Ex: Rotação de Ombro com Bastão");
    fireEvent.change(titleInput, { target: { value: "Rotação de Ombro Atualizada" } });

    const saveButton = screen.getByText("Salvar Alterações");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Rotação de Ombro Atualizada",
          category: "fortalecimento",
          difficulty: "intermediário",
        }),
      );
    });
  });
});