import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Tipos para dados SOAP
export interface SoapData {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  pain_level?: number;
  pain_location?: string;
  pain_character?: string;
}

export interface PainScaleData {
  level: number;
  location?: string;
  character?: string;
}

interface SoapContextValue {
  soapData: SoapData;
  painScale: PainScaleData;
  isDirty: boolean;
  lastSaveAt: Date | null;
  updateSoapField: <K extends keyof SoapData>(field: K, value: SoapData[K]) => void;
  updatePainScale: (data: PainScaleData) => void;
  updateMultipleFields: (fields: Partial<SoapData>) => void;
  resetSoap: () => void;
  setLastSaveAt: (date: Date) => void;
  setIsDirty: (dirty: boolean) => void;
}

const SoapContext = createContext<SoapContextValue | undefined>(undefined);

const DEFAULT_SOAP_DATA: SoapData = {
  subjective: '',
  objective: '',
  assessment: '',
  plan: '',
  pain_level: 0
};

const DEFAULT_PAIN_SCALE: PainScaleData = {
  level: 0
};

interface SoapProviderProps {
  children: ReactNode;
  initialData?: Partial<SoapData>;
}

export function SoapProvider({ children, initialData }: SoapProviderProps) {
  const [soapData, setSoapData] = useState<SoapData>({
    ...DEFAULT_SOAP_DATA,
    ...initialData
  });
  const [painScale, setPainScale] = useState<PainScaleData>(DEFAULT_PAIN_SCALE);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaveAt, setLastSaveAt] = useState<Date | null>(null);

  const updateSoapField = useCallback(<K extends keyof SoapData>(
    field: K,
    value: SoapData[K]
  ) => {
    setSoapData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }, []);

  const updatePainScale = useCallback((data: PainScaleData) => {
    setPainScale(data);
    updateSoapField('pain_level', data.level);
    updateSoapField('pain_location', data.location);
    updateSoapField('pain_character', data.character);
  }, [updateSoapField]);

  const updateMultipleFields = useCallback((fields: Partial<SoapData>) => {
    setSoapData(prev => ({ ...prev, ...fields }));
    setIsDirty(true);
  }, []);

  const resetSoap = useCallback(() => {
    setSoapData(DEFAULT_SOAP_DATA);
    setPainScale(DEFAULT_PAIN_SCALE);
    setIsDirty(false);
    setLastSaveAt(null);
  }, []);

  const value: SoapContextValue = {
    soapData,
    painScale,
    isDirty,
    lastSaveAt,
    updateSoapField,
    updatePainScale,
    updateMultipleFields,
    resetSoap,
    setLastSaveAt,
    setIsDirty
  };

  return (
    <SoapContext.Provider value={value}>
      {children}
    </SoapContext.Provider>
  );
}

export function useSoapContext() {
  const context = useContext(SoapContext);
  if (context === undefined) {
    throw new Error('useSoapContext must be used within a SoapProvider');
  }
  return context;
}

// Hook alternativo que não lança erro (para uso opcional)
export function useSoapContextOptional() {
  return useContext(SoapContext);
}
