export const defaultEquipments: Equipment[] = [
  {
    id: 'laser',
    name: 'Laser',
    icon: '🔴',
    hasParameters: true,
    parameters: [
      { id: 'power', label: 'Potência', type: 'select', options: ['3J', '4J', '6J', '8J'], defaultValue: '4J' },
      { id: 'time', label: 'Tempo', type: 'number', unit: 'seg', defaultValue: 30 },
      { id: 'points', label: 'Pontos', type: 'number', defaultValue: 10 },
    ]
  },
  {
    id: 'ultrassom',
    name: 'Ultrassom',
    icon: '🔊',
    hasParameters: true,
    parameters: [
      { id: 'frequency', label: 'Frequência', type: 'select', options: ['1MHz', '3MHz'], defaultValue: '1MHz' },
      { id: 'intensity', label: 'Intensidade', type: 'number', unit: 'W/cm²', defaultValue: 1.0 },
      { id: 'time', label: 'Tempo', type: 'number', unit: 'min', defaultValue: 5 },
      { id: 'mode', label: 'Modo', type: 'select', options: ['Contínuo', 'Pulsado'], defaultValue: 'Contínuo' },
    ]
  },
  {
    id: 'tens',
    name: 'TENS',
    icon: '⚡',
    hasParameters: true,
    parameters: [
      { id: 'frequency', label: 'Frequência', type: 'number', unit: 'Hz', defaultValue: 100 },
      { id: 'time', label: 'Tempo', type: 'number', unit: 'min', defaultValue: 20 },
      { id: 'intensity', label: 'Intensidade', type: 'text', defaultValue: 'Confortável' },
    ]
  },
  {
    id: 'corrente_russa',
    name: 'Corrente Russa',
    icon: '💪',
    hasParameters: true,
    parameters: [
      { id: 'frequency', label: 'Frequência', type: 'select', options: ['2500Hz', '5000Hz'], defaultValue: '2500Hz' },
      { id: 'time', label: 'Tempo', type: 'number', unit: 'min', defaultValue: 15 },
      { id: 'rise', label: 'Rise/Decay', type: 'text', defaultValue: '3/3' },
    ]
  },
  {
    id: 'ondas_curtas',
    name: 'Ondas Curtas',
    icon: '📡',
    hasParameters: true,
    parameters: [
      { id: 'mode', label: 'Modo', type: 'select', options: ['Contínuo', 'Pulsado'], defaultValue: 'Pulsado' },
      { id: 'time', label: 'Tempo', type: 'number', unit: 'min', defaultValue: 20 },
      { id: 'intensity', label: 'Intensidade', type: 'text', defaultValue: 'Calor agradável' },
    ]
  },
  {
    id: 'infravermelho',
    name: 'Infravermelho',
    icon: '🔥',
    hasParameters: true,
    parameters: [
      { id: 'time', label: 'Tempo', type: 'number', unit: 'min', defaultValue: 15 },
      { id: 'distance', label: 'Distância', type: 'number', unit: 'cm', defaultValue: 50 },
    ]
  },
  {
    id: 'crioterapia',
    name: 'Crioterapia',
    icon: '❄️',
    hasParameters: true,
    parameters: [
      { id: 'time', label: 'Tempo', type: 'number', unit: 'min', defaultValue: 20 },
      { id: 'method', label: 'Método', type: 'select', options: ['Bolsa de gelo', 'Spray', 'Imersão'], defaultValue: 'Bolsa de gelo' },
    ]
  },
  {
    id: 'maca',
    name: 'Maca',
    icon: '🛏️',
    hasParameters: false,
  },
];
