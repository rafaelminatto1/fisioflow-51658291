import { createContext, useContext } from 'react';
import type { DataContextType } from '@/types/context';

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within DataProvider');
    }
    return context;
};


export const DataContext = createContext<DataContextType | null>(null);