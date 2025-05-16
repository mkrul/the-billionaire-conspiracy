Highcharts.chart('container', {
  chart: {
    type: 'networkgraph',
    marginTop: 80
  },
  title: {
    text: 'Network graph'
  },
  plotOptions: {
    networkgraph: {
      keys: ['from', 'to'],
    }
  },
  series: [{
    marker: {
      radius: 30
    },
    dataLabels: {
      enabled: true,
      linkFormat: '',
      allowOverlap: true
    },
    data: [
      ['Node 1', 'Node 2'],
      ['Node 1', 'Node 3'],
      ['Node 1', 'Node 4'],
      ['Node 4', 'Node 5'],
      ['Node 2', 'Node 5']
    ]
  }]
});