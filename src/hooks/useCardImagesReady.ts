import { useEffect, useState } from 'react';
import { loadCardImages } from '@/lib/loadCardImages';

export const useCardImagesReady = (sources: string[]) => {
  const key = JSON.stringify(sources);
  const [state, setState] = useState({ key: '', ready: false, error: '' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ key, ready: false, error: '' });
    void loadCardImages(JSON.parse(key) as string[]).then(() => {
      if (active) setState({ key, ready: true, error: '' });
    }).catch(() => {
      if (active) setState({ key, ready: false, error: 'A card image could not be loaded.' });
    });
    return () => { active = false; };
  }, [key, attempt]);
  return {
    ready: state.key === key && state.ready,
    error: state.key === key ? state.error : '',
    retry: () => setAttempt((value) => value + 1),
  };
};