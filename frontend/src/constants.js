export const NODE_COLORS = {
  SalesOrder:      '#4F8EFF',
  Delivery:        '#00E59A',
  BillingDocument: '#F5A623',
  JournalEntry:    '#A78BFA',
  Payment:         '#F472B6',
  Customer:        '#00D4FF',
  Product:         '#FB923C',
  Plant:           '#86EFAC',
}

export const NODE_TYPE_LABELS = {
  SalesOrder:      'Sales Order',
  Delivery:        'Delivery',
  BillingDocument: 'Billing Doc',
  JournalEntry:    'Journal Entry',
  Payment:         'Payment',
  Customer:        'Customer',
  Product:         'Product',
  Plant:           'Plant',
}

export const CYTOSCAPE_STYLE = [
  {
    selector: 'node',
    style: {
      'background-color': 'data(color)',
      'label': 'data(label)',
      'color': '#ffffff',
      'font-size': '8px',
      'font-family': 'IBM Plex Mono, monospace',
      'text-valign': 'center',
      'text-halign': 'center',
      'width': 32,
      'height': 32,
      'text-max-width': '62px',
      'text-wrap': 'ellipsis',
      'border-width': 1.5,
      'border-color': 'data(borderColor)',
      'border-opacity': 0.7,
      'shadow-blur': 16,
      'shadow-color': 'data(color)',
      'shadow-opacity': 0.55,
      'shadow-offset-x': 0,
      'shadow-offset-y': 0,
    },
  },
  {
    selector: 'node:selected',
    style: {
      'border-width': 2.5,
      'border-color': '#ffffff',
      'border-opacity': 1,
      'width': 40,
      'height': 40,
      'shadow-blur': 28,
      'shadow-opacity': 0.85,
      'font-size': '9px',
    },
  },
  {
    selector: 'node:active',
    style: {
      'overlay-opacity': 0,
    },
  },
  {
    selector: 'edge',
    style: {
      'width': 1,
      'line-color': 'rgba(79, 142, 255, 0.18)',
      'target-arrow-color': 'rgba(79, 142, 255, 0.3)',
      'target-arrow-shape': 'triangle',
      'arrow-scale': 0.8,
      'curve-style': 'bezier',
      'label': 'data(label)',
      'font-size': '7px',
      'font-family': 'IBM Plex Mono, monospace',
      'color': 'rgba(94, 117, 153, 0.8)',
      'text-rotation': 'autorotate',
      'text-background-color': '#060912',
      'text-background-opacity': 0.75,
      'text-background-padding': '2px',
    },
  },
  {
    selector: 'edge:selected',
    style: {
      'line-color': 'rgba(0, 212, 255, 0.45)',
      'target-arrow-color': 'rgba(0, 212, 255, 0.6)',
      'width': 1.5,
    },
  },
]
