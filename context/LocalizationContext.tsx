import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'pt' | 'es';
type Translations = Record<string, string>;

interface LocalizationContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, options?: Record<string, string | number>) => string;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

const supportedLanguages: Language[] = ['en', 'pt', 'es'];

const getInitialLanguage = (): Language => {
    const savedLang = localStorage.getItem('language') as Language;
    if (savedLang && supportedLanguages.includes(savedLang)) {
        return savedLang;
    }

    const browserLang = navigator.language.split('-')[0] as Language;
    if (supportedLanguages.includes(browserLang)) {
        return browserLang;
    }
    
    return 'en';
};

export const LocalizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const [translations, setTranslations] = useState<Translations>({});

  useEffect(() => {
    const fetchTranslations = async () => {
      try {
        const response = await fetch(`/i18n/${language}.json`);
        if (!response.ok) {
            // Fallback to English if the language file is not found
            console.error(`Could not load ${language}.json, falling back to English.`);
            const fallbackResponse = await fetch(`/i18n/en.json`);
            const data = await fallbackResponse.json();
            setTranslations(data);
            return;
        }
        const data = await response.json();
        setTranslations(data);
      } catch (error) {
        console.error('Failed to load translations:', error);
      }
    };

    fetchTranslations();
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key: string, options?: Record<string, string | number>): string => {
    let translation = translations[key] || key;
    if (options) {
      Object.keys(options).forEach(optionKey => {
        const regex = new RegExp(`{{${optionKey}}}`, 'g');
        translation = translation.replace(regex, String(options[optionKey]));
      });
    }
    return translation;
  };

  return (
    <LocalizationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = (): LocalizationContextType => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};
