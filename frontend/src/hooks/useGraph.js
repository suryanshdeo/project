import { useState, useEffect } from 'react'
import { NODE_COLORS } from '../constants'

export function useGraph() {
  const [elements, setElements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({ nodes: 0, edges: 0 })

  useEffect(() => {
    async function fetchGraph() {
      try {
        const res = await fetch('/api/graph')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()

        const nodes = data.nodes.map(n => ({
          data: {
            ...n.data,
            color: NODE_COLORS[n.data.type] || '#64748b',
            borderColor: NODE_COLORS[n.data.type] || '#64748b',
          },
        }))

        setElements([...nodes, ...data.edges])
        setStats({ nodes: nodes.length, edges: data.edges.length })
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchGraph()
  }, [])

  return { elements, loading, error, stats }
}
