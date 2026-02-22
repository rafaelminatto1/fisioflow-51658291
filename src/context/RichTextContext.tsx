import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Editor } from '@tiptap/react';

interface RichTextContextType {
    activeEditor: Editor | null;
    setActiveEditor: (editor: Editor | null) => void;
}

const RichTextContext = createContext<RichTextContextType | undefined>(undefined);

export function RichTextProvider({ children }: { children: ReactNode }) {
    const [activeEditor, setActiveEditor] = useState<Editor | null>(null);

    return (
        <RichTextContext.Provider value={{ activeEditor, setActiveEditor }}>
            {children}
        </RichTextContext.Provider>
    );
}

export function useRichTextContext() {
    return useContext(RichTextContext);
}
