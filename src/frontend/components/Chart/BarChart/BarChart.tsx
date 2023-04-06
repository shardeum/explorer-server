import React from 'react'
import HighchartsReact from 'highcharts-react-official'
import Highcharts from 'highcharts/highstock'

interface BarChartProps {
  title: string
  data: any
}

// TODO: have to refactor the code

export const BarChart: React.FC<BarChartProps> = ({ title }) => {
  const option = {
    chart: {
      type: 'column',
      backgroundColor: '#ffffff',
      borderColor: '#e9ecef',
      borderWidth: 1,
      borderRadius: 8,
      spacingTop: 20,
      height: 300,
    },
    title: {
      text: title,
      align: 'left',
      style: {
        fontSize: '12px',
        fontWeight: '600',
        color: '#495057',
      },
    },
    xAxis: {
      categories: ['Africa', 'America', 'Asia', 'Europe', 'Oceania'],
      title: {
        text: undefined,
      },
    },
    yAxis: {
      min: 0,
      title: {
        text: undefined,
      },
    },
    tooltip: {
      valueSuffix: ' millions',
      borderRadius: 8,
    },
    plotOptions: {
      bar: {
        dataLabels: {
          enabled: true,
        },
      },
    },
    credits: {
      enabled: false,
    },
    series: [
      {
        name: 'Year 1800',
        data: [107, 31, 635, 203, 2],
      },
      {
        name: 'Year 1900',
        data: [133, 156, 947, 408, 6],
      },
      {
        name: 'Year 2000',
        data: [814, 841, 3714, 727, 31],
      },
      {
        name: 'Year 2016',
        data: [1216, 1001, 4436, 738, 40],
      },
    ],
  }

  return <HighchartsReact highcharts={Highcharts} options={option} allowChartUpdate={true} />
}
