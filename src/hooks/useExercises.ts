export const useExercises = () => ({
  exercises: [
    {
      id: '1',
      name: 'Flexão de Braço',
      category: 'Força',
      description: 'Exercício para fortalecimento dos membros superiores',
      instructions: 'Mantenha o corpo reto e desça até quase tocar o chão',
      video_url: ''
    },
    {
      id: '2',
      name: 'Agachamento',
      category: 'Força', 
      description: 'Exercício para fortalecimento dos membros inferiores',
      instructions: 'Desça mantendo os joelhos alinhados com os pés',
      video_url: ''
    }
  ],
  loading: false,
  error: null
});