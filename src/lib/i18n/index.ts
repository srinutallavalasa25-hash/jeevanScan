import { en } from './en';
import { te } from './te';

export type Language = 'en' | 'te';
export type TranslationDict = typeof en;

export const translations: Record<Language, TranslationDict> = {
  en,
  te,
};
