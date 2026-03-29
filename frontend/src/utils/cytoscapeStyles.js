export const cytoscapeStyles = [
  {
    selector: 'node',
    style: {
      'background-color': '#3b5bdb',
      'label': (ele) => ele.data('label') || ele.data('id'),
      'color': '#ffffff',
      'font-size': '9px',
      'text-valign': 'center',
      'text-halign': 'center',
      'text-wrap': 'wrap',
      'width': 44,
      'height': 44,
      'border-width': 2,
      'border-color': '#e2e8f0',
      'transition-property': 'background-color, border-color, width, height',
      'transition-duration': '300ms',
    }
  },
  {
    selector: 'node[type="Person"]',
    style: {
      'background-color': '#d97706',
      'shape': 'ellipse',
      'width': 36,
      'height': 36,
    }
  },
  {
    selector: 'node.suspicious',
    style: {
      'background-color': '#dc2626',
      'border-color': '#fca5a5',
      'border-width': 3,
      'width': 54,
      'height': 54,
      'z-index': 10,
    }
  },
  {
    selector: 'node[pep_connected="true"]',
    style: {
      'border-color': '#d97706',
      'border-width': 3,
    }
  },
  {
    selector: 'node[velocity_flag="true"]',
    style: {
      'border-color': '#7c3aed',
      'border-width': 3,
    }
  },
  {
    selector: 'node[fan_out_flag="true"]',
    style: {
      'border-color': '#0891b2',
      'border-width': 3,
    }
  },
  {
    selector: 'edge',
    style: {
      'line-color': '#cbd5e1',
      'target-arrow-color': '#cbd5e1',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'width': 1,
      'transition-property': 'line-color, target-arrow-color, width',
      'transition-duration': '300ms',
    }
  },
  {
    selector: 'edge.suspicious',
    style: {
      'line-color': '#dc2626',
      'target-arrow-color': '#dc2626',
      'width': 2.5,
      'line-style': 'dashed',
      'z-index': 9,
    }
  },
  {
    selector: 'edge[is_laundering=1]',
    style: {
      'line-color': '#d97706',
      'target-arrow-color': '#d97706',
      'width': 2,
    }
  },
  {
    selector: 'edge.owns',
    style: {
      'line-color': '#d97706',
      'target-arrow-shape': 'none',
      'line-style': 'dotted',
      'width': 1.5,
    }
  },
  {
    selector: 'edge.director',
    style: {
      'line-color': '#0891b2',
      'target-arrow-shape': 'none',
      'line-style': 'dotted',
      'width': 1.5,
    }
  },
  // Active/Hover states
  {
    selector: 'node:selected',
    style: {
      'border-color': '#0f172a',
      'border-width': 4,
    }
  },
  {
    selector: '.highlighted',
    style: {
      'line-color': '#f59e0b',
      'target-arrow-color': '#f59e0b',
      'width': 3,
    }
  },
  {
    selector: '.live-node',
    style: {
      'border-color': '#10b981',
      'border-width': 4,
      'underlay-color': '#10b981',
      'underlay-padding': 5,
      'underlay-opacity': 0.4,
      'underlay-shape': 'ellipse'
    }
  },
  {
    selector: '.shap-node, node[ml_prediction="LAUNDERING"]',
    style: {
      'border-color': '#f97316',
      'border-width': 4,
      'border-style': 'dashed'
    }
  },
  {
    selector: '.live-edge',
    style: {
      'line-color': '#10b981',
      'target-arrow-color': '#10b981',
      'width': 3,
      'z-index': 99
    }
  },
  {
    selector: '.live-edge.suspicious',
    style: {
      'line-color': '#ef4444',
      'target-arrow-color': '#ef4444',
      'width': 4,
      'line-style': 'dashed',
      'z-index': 100
    }
  }
];
