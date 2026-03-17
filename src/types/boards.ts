export interface BoardColumn {
  id: string;
  board_id: string;
  name: string;
  color?: string;
  wip_limit?: number | null;
  order_index: number;
  created_at: string;
}

export interface Board {
  id: string;
  name: string;
  description?: string | null;
  organization_id?: string | null;
  background_color?: string;
  background_image?: string | null;
  icon?: string;
  is_starred: boolean;
  is_archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  columns: BoardColumn[];
  task_count?: number;
}

export const BOARD_PRESET_COLORS = [
  { label: 'Azul Trello', value: '#0079BF' },
  { label: 'Verde', value: '#519839' },
  { label: 'Laranja', value: '#D29034' },
  { label: 'Vermelho', value: '#B04632' },
  { label: 'Roxo', value: '#89609E' },
  { label: 'Rosa', value: '#CD5A91' },
  { label: 'Teal', value: '#4BBF6B' },
  { label: 'Cinza', value: '#838C91' },
] as const;

export const COLUMN_COLORS = [
  '#E2E8F0', '#BEE3F8', '#C6F6D5', '#FEFCBF',
  '#FED7D7', '#E9D8FD', '#FED7E2', '#FEEBC8',
] as const;
