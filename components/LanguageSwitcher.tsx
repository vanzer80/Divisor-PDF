import React, { useState, useRef, useEffect } from 'react';
import { useLocalization } from '../context/LocalizationContext';
import { Icons } from './Icons';
import { CSSTransition } from 'react-transition-group';

type Language = 'en' | 'pt' | 'es';

const languages: { code: Language; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLocalization();
  const [isOpen, setIsOpen] = useState(false);
  const nodeRef = useRef(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLanguageChange = (langCode: Language) => {
    setLanguage(langCode);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
        aria-label="Change language"
      >
        <Icons.Globe className="w-7 h-7 text-slate-600 dark:text-slate-300" />
      </button>

      <CSSTransition
        in={isOpen}
        timeout={200}
        classNames="language-menu"
        unmountOnExit
        nodeRef={nodeRef}
      >
        <div
          ref={nodeRef}
          className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg py-1 z-10 border border-slate-200 dark:border-slate-700"
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full text-left flex items-center px-4 py-2 text-sm ${
                language === lang.code
                  ? 'bg-brand-blue-50 text-brand-blue-700 dark:bg-brand-blue-900/50 dark:text-brand-blue-300'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <span className="mr-3">{lang.flag}</span>
              {lang.name}
            </button>
          ))}
        </div>
      </CSSTransition>
      <style>{`
        .language-menu-enter {
          opacity: 0;
          transform: scale(0.95);
        }
        .language-menu-enter-active {
          opacity: 1;
          transform: scale(1);
          transition: opacity 200ms, transform 200ms;
        }
        .language-menu-exit {
          opacity: 1;
          transform: scale(1);
        }
        .language-menu-exit-active {
          opacity: 0;
          transform: scale(0.95);
          transition: opacity 200ms, transform 200ms;
        }
      `}</style>
    </div>
  );
};
