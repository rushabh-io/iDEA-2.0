import { useState, useCallback, useRef } from 'react';

export const useLiveFeed = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [events, setEvents] = useState([]);
  const [lastError, setLastError] = useState(null);
  const wsRef = useRef(null);

  const stopSimulation = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const startSimulation = useCallback((options = {}) => {
    if (wsRef.current) return;

    const { analysisMode = false, pattern = 'all' } = options;

    setIsRunning(true);
    setEvents([]);
    setLastError(null);

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const wsUrl = baseUrl.replace(/^http/, 'ws') + '/ws/live';

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        action: 'start',
        mode: analysisMode ? 'analysis' : 'demo',
        pattern: pattern,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'sequence_complete') {
          stopSimulation();
        } else if (data.type === 'error') {
          setLastError(data.message || 'Simulation failed');
          stopSimulation();
        } else {
          setEvents(prev => [...prev, data]);
        }
      } catch (e) {
        console.error('WS Parse error', e);
      }
    };

    ws.onerror = (err) => {
      console.error('WS Error', err);
      setLastError('WebSocket connection failed');
      stopSimulation();
    };

    ws.onclose = () => {
      stopSimulation();
    };
  }, [stopSimulation]);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastError(null);
  }, []);

  return {
    isRunning,
    events,
    lastError,
    startSimulation,
    stopSimulation,
    clearEvents,
  };
};
