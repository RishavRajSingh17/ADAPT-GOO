import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, TranslationKey, SUPPORTED_LANGUAGES, LanguageOption } from './types';
import { translations } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  languages: LanguageOption[];
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  getDestinationName: (destId: string) => string;
  getDestinationDesc: (destId: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'adaptgo_language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Language;
      if (saved && ['en', 'hi', 'bn', 'mr'].includes(saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'en';
  });

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch {
      // ignore
    }
    // Update html lang attribute
    document.documentElement.lang = newLang;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const langDict = translations[language] || translations.en;
    let text = langDict[key] || translations.en[key] || key;

    if (params) {
      Object.entries(params).forEach(([paramKey, val]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
      });
    }

    return text;
  };

  const getDestinationName = (destId: string): string => {
    switch (destId.toLowerCase()) {
      case 'kolkata':
        return t('dest_kolkata');
      case 'nainital':
        return t('dest_nainital');
      case 'darjeeling':
        return t('dest_darjeeling');
      case 'kashmir':
        return t('dest_kashmir');
      default:
        return destId;
    }
  };

  const getDestinationDesc = (destId: string): string => {
    switch (destId.toLowerCase()) {
      case 'kolkata':
        return t('dest_kolkata_desc');
      case 'nainital':
        return t('dest_nainital_desc');
      case 'darjeeling':
        return t('dest_darjeeling_desc');
      case 'kashmir':
        return t('dest_kashmir_desc');
      default:
        return '';
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        languages: SUPPORTED_LANGUAGES,
        t,
        getDestinationName,
        getDestinationDesc
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
