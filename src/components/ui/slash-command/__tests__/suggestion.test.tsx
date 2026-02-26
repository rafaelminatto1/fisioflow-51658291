import { describe, it, expect, vi } from 'vitest';
import { getSuggestionItems, getExerciseSuggestionItems } from '../suggestion';

describe('Suggestion Logic', () => {
    it('should return default suggestion items', () => {
        const items = getSuggestionItems({ query: '' });
        expect(items.length).toBeGreaterThan(0);
        expect(items.find(i => i.title === 'Biblioteca de Exercícios')).toBeDefined();
        expect(items.find(i => i.title === 'Título 1')).toBeDefined();
        // The list might be filtered or categorized, let's just check key clinical ones
        expect(items.find(i => i.title === 'Metas do Paciente')).toBeDefined();
        expect(items.find(i => i.title === 'Diagnóstico')).toBeDefined();
        expect(items.find(i => i.title === 'Última Sessão')).toBeDefined();
    });

    it('should filter suggestion items by query', () => {
        const items = getSuggestionItems({ query: 'Metas' });
        expect(items.length).toBe(1);
        expect(items[0].title).toBe('Metas do Paciente');
    });

    it('should filter suggestion items by keyword aliases', () => {
        const items = getSuggestionItems({ query: 'objetivos' });
        expect(items.length).toBeGreaterThan(0);
        expect(items.find(i => i.title === 'Metas do Paciente')).toBeDefined();
    });

    it('should filter exercise suggestion items', () => {
        const mockExercises = [
            { id: '1', name: 'Agachamento', category: 'Pernas' },
            { id: '2', name: 'Flexão', category: 'Braços' },
            { id: '3', name: 'Prancha', category: 'Core' },
        ];
        
        const suggestions = getExerciseSuggestionItems({ 
            query: 'Flex', 
            exercises: mockExercises 
        });

        expect(suggestions.length).toBe(1);
        expect(suggestions[0].title).toBe('Flexão');
        expect(suggestions[0].id).toBe('2');
    });

    it('should limit exercise suggestion items to 8', () => {
        const mockExercises = Array.from({ length: 15 }, (_, i) => ({
            id: String(i),
            name: `Exercicio ${i}`,
            category: 'Geral'
        }));

        const suggestions = getExerciseSuggestionItems({ 
            query: 'Exercicio', 
            exercises: mockExercises 
        });

        expect(suggestions.length).toBe(8);
    });

    it('should execute all default slash commands without throwing', () => {
        const items = getSuggestionItems({ query: '' });
        const mockEditor = {
            chain: () => ({
                focus: () => ({
                    deleteRange: () => ({
                        setNode: () => ({ run: () => {} }),
                        toggleBulletList: () => ({ run: () => {} }),
                        toggleOrderedList: () => ({ run: () => {} }),
                        toggleTaskList: () => ({ run: () => {} }),
                        toggleBlockquote: () => ({ run: () => {} }),
                        insertTable: () => ({ run: () => {} }),
                        setHorizontalRule: () => ({ run: () => {} }),
                        toggleCodeBlock: () => ({ run: () => {} }),
                        insertContent: () => ({ run: () => {} }),
                        run: () => {}
                    }),
                    run: () => {}
                })
            })
        };

        items.forEach(item => {
            if (typeof item.command === 'function') {
                expect(() => item.command({ editor: mockEditor, range: { from: 0, to: 0 } })).not.toThrow();
            }
        });
    });
});
