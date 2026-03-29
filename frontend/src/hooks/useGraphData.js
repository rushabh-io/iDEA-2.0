import { useState, useEffect, useCallback } from 'react';
import { getGraph } from '../api/client';

export const useGraphData = () => {
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGraphData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getGraph();
      setGraphData(data);
    } catch (err) {
      setError(err);
      console.error("Failed to load graph data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  return { graphData, loading, error, refresh: fetchGraphData };
};
