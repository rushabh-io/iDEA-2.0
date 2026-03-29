import { useState, useCallback, useEffect } from 'react'
import {
    getAnalysisStatus, runAnalysis,
    getAnalysisGraph, getAnalysisStats,
    getAnalysisAlerts, getAnalysisValidation,
    stopAnalysis, getAnalysisOwnership, createAnalysisReport
} from '../api/client'

export function useAnalysisSession() {
    const [analysisMode, setAnalysisMode] = useState(false)
    const [analysisStatus, setAnalysisStatus] = useState(null)
    const [analysisGraph, setAnalysisGraph] = useState(null)
    const [analysisStats, setAnalysisStats] = useState(null)
    const [analysisAlerts, setAnalysisAlerts] = useState([])
    const [analysisMetrics, setAnalysisMetrics] = useState(null)
    const [analysisRunning, setAnalysisRunning] = useState(false)
    const [initialized, setInitialized] = useState(false)

    // Check for existing session on mount
    useEffect(() => {
        const checkSession = async () => {
            try {
                const res = await getAnalysisStatus()
                if (res.data.active) {
                    setAnalysisMode(true)
                    setAnalysisStatus(res.data)
                    
                    // Fetch all relevant data
                    const [graph, stats, alerts, metrics] = await Promise.all([
                        getAnalysisGraph(),
                        getAnalysisStats(),
                        getAnalysisAlerts(),
                        getAnalysisValidation().catch(() => ({ data: null }))
                    ])
                    
                    setAnalysisGraph(graph.data)
                    setAnalysisStats(stats.data)
                    setAnalysisAlerts(alerts.data || [])
                    setAnalysisMetrics(metrics.data)
                }
            } catch (error) {
                console.error("Session check failed:", error)
            } finally {
                setInitialized(true)
            }
        }
        checkSession()
    }, [])

    const startAnalysisMode = useCallback(
        async (uploadResult) => {
            setAnalysisMode(true)
            setAnalysisStatus(uploadResult)
            try {
                const [graph, stats] = await Promise.all([
                    getAnalysisGraph(),
                    getAnalysisStats()
                ])
                setAnalysisGraph(graph.data)
                setAnalysisStats(stats.data)
            } catch (error) {
                console.error("Failed to start analysis mode:", error)
            }
        }, []
    )

    const runDetection = useCallback(async () => {
        setAnalysisRunning(true)
        try {
            await runAnalysis()
            const [graph, stats, alerts, metrics] = await Promise.all([
                getAnalysisGraph(),
                getAnalysisStats(),
                getAnalysisAlerts(),
                getAnalysisValidation()
            ])
            setAnalysisGraph(graph.data)
            setAnalysisStats(stats.data)
            setAnalysisAlerts(alerts.data)
            setAnalysisMetrics(metrics.data)
        } catch (error) {
            console.error("Analysis execution failed:", error)
        } finally {
            setAnalysisRunning(false)
        }
    }, [])

    const stopAnalysisMode = useCallback(async () => {
        try {
            await stopAnalysis()
        } catch (error) {
            console.error("Failed to stop analysis session:", error)
        }
        setAnalysisMode(false)
        setAnalysisStatus(null)
        setAnalysisGraph(null)
        setAnalysisStats(null)
        setAnalysisAlerts([])
        setAnalysisMetrics(null)
    }, [])

    return {
        analysisMode,
        analysisStatus,
        analysisGraph,
        analysisStats,
        analysisAlerts,
        analysisMetrics,
        analysisRunning,
        initialized,
        startAnalysisMode,
        runDetection,
        stopAnalysisMode,
        getAnalysisOwnership,
        createAnalysisReport
    }
}
