import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../../packages/ui/theme.css';
import type { QuantumBridge, WorkerStatus } from '../../../packages/contracts';
declare global { interface Window { quantum: QuantumBridge } }
function App() {
  const [status, setStatus] = useState<WorkerStatus>();
  useEffect(() => {
    const update = () => { void window.quantum.getStatus().then(setStatus); };
    update(); const interval = setInterval(update, 500); return () => clearInterval(interval);
  }, []);
  return <main><p>THEORY LAB / DESKTOP</p><h1>Quantum Hamiltonian Lab</h1><p>Python worker: {status?.state ?? 'STARTING'}</p><p>{status?.detail}</p><button onClick={() => void window.quantum.restart().then(setStatus)}>Restart worker</button></main>;
}
createRoot(document.getElementById('root')!).render(<App />);
