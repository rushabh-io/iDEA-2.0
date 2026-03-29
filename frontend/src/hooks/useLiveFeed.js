import { useState, useCallback, useRef } from 'react';

export const useLiveFeed = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [events, setEvents] = useState([]);
  const wsRef = useRef(null);

  const startSimulation = useCallback(() => {
    if (wsRef.current) return;
    
    setIsRunning(true);
    setEvents([]);
    
    // Automatically match protocol (ws/wss) based on http/https
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const wsUrl = baseUrl.replace(/^http/, 'ws') + '/ws/live';
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send('start');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'sequence_complete') {
          stopSimulation();
        } else {
          setEvents(prev => [...prev, data]);
        }
      } catch (e) {
        console.error("WS Parse error", e);
      }
    };

    ws.onerror = (err) => {
      console.error("WS Error", err);
      stopSimulation();
    };

    ws.onclose = () => {
      stopSimulation();
    };
  }, []);

  const stopSimulation = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsRunning(false);
  }, []);

  return { isRunning, events, startSimulation, stopSimulation };
};
