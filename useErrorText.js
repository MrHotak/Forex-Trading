import { useCallback } from 'react';
import { useT } from '../context/PrefsContext.jsx';

/** Turns a parsed API error (or a field message key) into translated text. */
export function useErrorText() {
  const t = useT();
  const errorText = useCallback(
    (e) => {
      if (!e) return '';
      const key = `errors.${e.code}`;
      const translated = t(key);
      return translated !== key ? translated : e.message || t('errors.INTERNAL_ERROR');
    },
    [t],
  );
  const fieldText = useCallback((msg) => {
    if (!msg) return '';
    const key = `validation.${msg}`;
    const translated = t(key);
    return translated !== key ? translated : msg;
  }, [t]);
  return { errorText, fieldText };
}
