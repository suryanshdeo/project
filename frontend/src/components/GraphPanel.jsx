import { useRef, useCallback, useEffect } from 'react'
import CytoscapeComponent from 'react-cytoscapejs'
import cytoscape from 'cytoscape'
import dagre from 'cytoscape-dagre'
import { CYTOSCAPE_STYLE } from '../constants'

cytoscape.use(dagre)

const LAYOUT = {
  name: 'cose',
  animate: false,
  randomize: false,
  nodeRepulsion: 450000,
  idealEdgeLength: 100,
  edgeElasticity: 100,
  gravity: 80,
  numIter: 1000,
}

export default function GraphPanel({ elements, onNodeClick }) {
  const cyRef = useRef(null)
  const onNodeClickRef = useRef(onNodeClick)
  useEffect(() => { onNodeClickRef.current = onNodeClick }, [onNodeClick])

  const handleCyInit = useCallback((cy) => {
    cyRef.current = cy
    cy.on('tap', 'node', (evt) => { onNodeClickRef.current(evt.target.id()) })
    cy.on('tap', (evt) => { if (evt.target === cy) onNodeClickRef.current(null) })
  }, [])

  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'var(--bg-void)',
      backgroundImage: [
        'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(79,142,255,0.04) 0%, transparent 70%)',
        'linear-gradient(rgba(79,142,255,0.025) 1px, transparent 1px)',
        'linear-gradient(90deg, rgba(79,142,255,0.025) 1px, transparent 1px)',
      ].join(', '),
      backgroundSize: 'auto, 48px 48px, 48px 48px',
    }}>
      <CytoscapeComponent
        elements={elements}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
        stylesheet={CYTOSCAPE_STYLE}
        layout={LAYOUT}
        cy={handleCyInit}
        minZoom={0.1}
        maxZoom={4}
      />
    </div>
  )
}
