import { useState, useEffect } from 'react';

export function useAdminKey() {
  const [adminKey, setAdminKey] = useState<string>(() => localStorage.getItem('X-Admin-Key') || '');

  const saveKey = (key: string) => {
    localStorage.setItem('X-Admin-Key', key);
    setAdminKey(key);
  };

  const clearKey = () => {
    localStorage.removeItem('X-Admin-Key');
    setAdminKey('');
  };

  return { adminKey, saveKey, clearKey };
}
