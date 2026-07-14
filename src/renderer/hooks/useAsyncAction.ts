import { useState } from 'react';

export function useAsyncAction() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function run<T>(action: () => Promise<T>, successMessage?: string): Promise<T | null> {
    setBusy(true);
    setMessage('');
    try {
      const result = await action();
      if (successMessage) {
        setMessage(successMessage);
      }
      return result;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { busy, message, setMessage, run };
}