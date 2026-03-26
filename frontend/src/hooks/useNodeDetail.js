import { useState, useCallback, useRef } from 'react'

export function useNodeDetail() {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const abortRef = useRef(null)

  const fetchDetail = useCallback(async (nodeId) => {
    // Abort any in-flight request before starting a new one
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setDetail(null)
    try {
      const res = await fetch(`/api/graph/node/${encodeURIComponent(nodeId)}`, {
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setDetail(data)
    } catch (err) {
      if (err.name === 'AbortError') return
      setDetail({ error: err.message })
    } finally {
      setLoading(false)
    }
  }, [])

  const clearDetail = useCallback(() => {
    if (abortRef.current) abortRef.current.abort()
    setDetail(null)
  }, [])

  return { detail, loading, fetchDetail, clearDetail }
}
