import { describe, it, expect } from 'vitest';

describe('Internationalization', () => {
  const detectLocale = (text: string): string => {
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja';
    if (/[\uac00-\ud7af]/.test(text)) return 'ko';
    if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
    if (/[\u0400-\u04ff]/.test(text)) return 'ru';
    if (/[\u0600-\u06ff]/.test(text)) return 'ar';
    if (/\b(el|la|los|las|del|una|pero|porque|también)\b/i.test(text)) return 'es';
    if (/\b(le|la|les|des|une|mais|aussi|avec|pour)\b/i.test(text)) return 'fr';
    if (/\b(der|die|das|ein|und|aber|auch|für|mit)\b/i.test(text)) return 'de';
    if (/\b(também|não|são|está|isso|preciso|porque|obrigado)\b/i.test(text)) return 'pt';
    return 'en';
  };

  describe('Language Detection', () => {
    it('should detect Chinese', () => { expect(detectLocale('创建一个网站')).toBe('zh'); });
    it('should detect Japanese', () => { expect(detectLocale('ウェブサイトを作る')).toBe('ja'); });
    it('should detect Korean', () => { expect(detectLocale('웹사이트를 만들어')).toBe('ko'); });
    it('should detect Russian', () => { expect(detectLocale('Создайте веб-сайт')).toBe('ru'); });
    it('should detect Arabic', () => { expect(detectLocale('إنشاء موقع على الإنترنت')).toBe('ar'); });
    it('should detect Spanish', () => { expect(detectLocale('Necesito una página web para la empresa')).toBe('es'); });
    it('should detect French', () => { expect(detectLocale('Je veux créer une page avec des images')).toBe('fr'); });
    it('should detect German', () => { expect(detectLocale('Ich brauche ein Dashboard für die Firma')).toBe('de'); });
    it('should detect Portuguese', () => { expect(detectLocale('Preciso de um site também para isso')).toBe('pt'); });
    it('should default to English', () => { expect(detectLocale('Build me a website')).toBe('en'); });
  });

  describe('Translation System', () => {
    const translations: Record<string, Record<string, string>> = {
      en: { 'signal.captured': 'Signal captured', 'offline.synced': 'Synced {count} signals' },
      zh: { 'signal.captured': '信号已捕获', 'offline.synced': '已同步 {count} 个信号' },
    };

    const t = (key: string, locale: string = 'en', params?: Record<string, any>): string => {
      const translation = translations[locale]?.[key] || translations.en[key] || key;
      if (!params) return translation;
      return translation.replace(/\{(\w+)\}/g, (_, k) => String(params[k] || `{${k}}`));
    };

    it('should return English translation', () => {
      expect(t('signal.captured')).toBe('Signal captured');
    });

    it('should return Chinese translation', () => {
      expect(t('signal.captured', 'zh')).toBe('信号已捕获');
    });

    it('should substitute parameters', () => {
      expect(t('offline.synced', 'en', { count: 5 })).toBe('Synced 5 signals');
      expect(t('offline.synced', 'zh', { count: 3 })).toBe('已同步 3 个信号');
    });

    it('should fallback to English for missing locale', () => {
      expect(t('signal.captured', 'xx')).toBe('Signal captured');
    });

    it('should return key for missing translation', () => {
      expect(t('nonexistent.key')).toBe('nonexistent.key');
    });
  });
});
