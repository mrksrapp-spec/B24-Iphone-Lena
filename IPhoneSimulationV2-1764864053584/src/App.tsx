import { useState, useEffect } from 'react';
import IPhoneSimulation from './Component';

export default function App() {
  // Force re-render on mount to ensure animations play correctly
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="w-full h-full bg-black overflow-hidden">
      <IPhoneSimulation />
    </div>
  );
}