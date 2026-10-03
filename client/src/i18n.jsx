import React, { createContext, useContext, useState, useEffect } from 'react';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import ar from './locales/ar.json';

const LOCALES = { en, es, fr, de, ar };
const RTL = ['ar'];
export const LANG_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ar', label: 'العربية' },
];

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('wcai_lang') || 'en');

  useEffect(() => {
    localStorage.setItem('wcai_lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL.includes(lang) ? 'rtl' : 'ltr';
  }, [lang]);

  const t = (key, vars) => {
    let s = (LOCALES[lang] && LOCALES[lang][key]) || LOCALES.en[key] || key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    return s;
  };

  return <I18nContext.Provider value={{ t, lang, setLang }}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
