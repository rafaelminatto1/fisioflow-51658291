import { createContext } from 'react';
import type { DataContextType } from '@/types/context';

export const DataContext = createContext<DataContextType | null>(null);