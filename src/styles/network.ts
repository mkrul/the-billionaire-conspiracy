export const defaultStyles = [
  {
    selector: 'node',
    style: {
      'background-color': '#666',
      label: 'data(label)',
      width: 60,
      height: 60,
      'font-size': 12,
      'text-valign': 'bottom',
      'text-halign': 'center',
      'text-wrap': 'wrap',
      'text-max-width': 100,
      'background-image': 'data(image)',
      'background-fit': 'cover',
    },
  },
  {
    selector: 'edge',
    style: {
      width: 2,
      'line-color': '#ccc',
      'target-arrow-color': '#ccc',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      label: 'data(label)',
      'font-size': 10,
      'text-rotation': 'autorotate',
      'text-margin-y': -10,
    },
  },
];
