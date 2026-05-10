import React, { createContext, useContext, ReactNode } from 'react';

interface I18nContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, params?: Record<string, any>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Simple translation function without external dependencies
const simpleGetTranslation = (key: string): string => {
  return key;
};

// Get language from localStorage safely
const getInitialLanguage = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('app_language') || 'en';
  }
  return 'en';
};

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = React.useState<string>(getInitialLanguage);

  const setLanguage = (lang: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_language', lang);
    }
    setLanguageState(lang);
  };

  const t = (key: string, params?: Record<string, any>): string => {
    return simpleGetTranslation(key);
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};