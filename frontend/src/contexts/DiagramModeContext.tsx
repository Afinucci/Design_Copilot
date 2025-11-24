import React, { createContext, useContext, ReactNode } from 'react';
import { AppMode } from '../types';

interface DiagramModeContextType {
  mode: AppMode;
}

const DiagramModeContext = createContext<DiagramModeContextType | undefined>(undefined);

interface DiagramModeProviderProps {
  mode: AppMode;
  children: ReactNode;
}

export const DiagramModeProvider: React.FC<DiagramModeProviderProps> = ({ mode, children }) => {
  return (
    <DiagramModeContext.Provider value={{ mode }}>
      {children}
    </DiagramModeContext.Provider>
  );
};

export const useDiagramMode = (): DiagramModeContextType => {
  const context = useContext(DiagramModeContext);
  if (!context) {
    throw new Error('useDiagramMode must be used within a DiagramModeProvider');
  }
  return context;
};