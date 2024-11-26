import React, { useState } from 'react'
import Highcharts from 'highcharts/highstock'
import HighchartsReact from 'highcharts-react-official'
import HighchartsBoost from 'highcharts/modules/boost'

if (typeof Highcharts === 'object') {
  HighchartsBoost(Highcharts)
}

interface DataPoint {
  x: number
  y: number
  cycle: number
}

interface SeriesData {
  name: string
  data: DataPoint[]
  zIndex: number
  tooltip?: string
}

interface StackedLineChartProps {
  title: string
  centerTitle?: boolean
  subTitle?: string
  data: SeriesData[]
  height?: number
  name?: string
  groupData?: boolean
}

export const StackedLineStockChart: React.FC<StackedLineChartProps> = (props: StackedLineChartProps) => {
  const { title, centerTitle, subTitle, data, height = 300 } = props

  const timestampToCycle = new Map<number, number>()
  data.forEach((series) => {
    series.data.forEach((point) => {
      if (point.x && point.cycle) {
        timestampToCycle.set(point.x, point.cycle)
      }
    })
  })

  const [selectedRange, setSelectedRange] = useState(props.groupData ? 'week' : '')

  const getPlotOptions = (): object => {
    if (selectedRange === 'week' && props.groupData) {
      return {
        series: {
          animation: false,
          marker: {
            enabled: false,
          },
          boostThreshold: 1,
          findNearestPointBy: 'xy',
          dataGrouping: {
            enabled: true,
            forced: true,
            units: [['day', [1]]],
            approximation: 'sum',
          },
          cursor: 'pointer',
          point: {
            events: {
              click: function () {
                const cycle = timestampToCycle.get(this.x) || 0
                window.open(`/cycle/${cycle}`, '_blank')
              },
            },
          },
        },
      }
    } else {
      return {
        series: {
          boostThreshold: 1,
          findNearestPointBy: 'xy',
          dataGrouping: {
            enabled: false,
          },
          cursor: 'pointer',
          point: {
            events: {
              click: function () {
                const cycle = timestampToCycle.get(this.x) || 0
                window.open(`/cycle/${cycle}`, '_blank')
              },
            },
          },
        },
      }
    }
  }

  const option = {
    title: {
      text: title,
      align: centerTitle ? 'center' : 'left',
      style: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#495057',
      },
    },
    subtitle: {
      text: subTitle || undefined,
      style: {
        fontSize: '12px',
      },
    },
    series: data.map((row) => ({
      ...row,
      data: row.data
        .filter((point: DataPoint) => point.x != null && point.y != null)
        .map((point: DataPoint) => [point.x, point.y]),
      showInNavigator: true,
    })),
    boost: {},

    plotOptions: getPlotOptions(),
    legend: {
      enabled: true,
      layout: 'horizontal',
      align: 'center',
      verticalAlign: 'bottom',
      labelFormatter: function () {
        const series = this as Highcharts.Series
        const tooltipText = series.userOptions.tooltip || ''
        return `<span title="${tooltipText}">${series.name}</span>`
      },
      useHTML: true,
    },
    xAxis: {
      type: 'datetime',
      gridLineWidth: 0,
      labels: {},
      events: {
        setExtremes: function (e) {
          const totalRange = e.max - e.min
          const oneWeek = 7 * 24 * 3600 * 1000 // one week in milliseconds
          if (props.groupData) {
            setSelectedRange(totalRange >= oneWeek ? 'week' : '')
          }
        },
      },
    },
    yAxis: {
      title: {
        text: undefined,
      },
      gridLineWidth: 0,
      labels: {},
      zoomEnabled: true,
    },
    tooltip: {
      formatter: function () {
        const timestamp = this.x
        const xDate = new Date(timestamp)
        const xDateString = Highcharts.dateFormat('%A, %B %d, %Y', xDate.getTime())

        const cycle = timestampToCycle.get(timestamp) || 0

        let tooltipContent = `<span><b>${xDateString}</b></span><br /><br />`

        this.points.forEach((point) => {
          const seriesName = point.series.name
          const dataPoint = point.point
          tooltipContent += `<span>${seriesName}: <b>${dataPoint.y}</b></span><br />`
        })

        if (selectedRange !== 'week') {
          tooltipContent += `<span>Cycle Number: <b>${cycle}</b></span><br />`
        }

        return tooltipContent
      },
      borderColor: '#e9ecef',
      borderRadius: 4,
    },
    chart: {
      backgroundColor: '#ffffff',
      borderColor: '#e9ecef',
      borderWidth: 1,
      borderRadius: 8,
      spacingTop: 20,
      height: height,
      zoomType: 'x',
    },
    credits: {
      enabled: false,
    },
    navigation: {
      menuStyle: {
        border: '1px solid #e9ecef',
        background: '#ffffff',
        padding: '5px 0',
      },
      menuItemStyle: {
        color: '#343a40',
      },
    },
    rangeSelector: {
      inputStyle: {
        color: '#039',
        fontWeight: 'bold',
        backgroundColor: 'white',
        border: 'none',
      },
      labelStyle: {
        color: 'silver',
        fontWeight: 'bold',
      },
      selected: 5,
      buttons: [
        {
          type: 'hour',
          count: 1,
          text: '1h',
        },
        {
          type: 'day',
          count: 1,
          text: '1d',
        },
        {
          type: 'day',
          count: 5,
          text: '5d',
        },
        {
          type: 'month',
          count: 1,
          text: '1m',
        },
        {
          type: 'all',
          text: 'All',
        },
      ],
    },
  }

  return (
    <HighchartsReact
      highcharts={Highcharts}
      options={option}
      allowChartUpdate={true}
      constructorType="stockChart"
    />
  )
}
