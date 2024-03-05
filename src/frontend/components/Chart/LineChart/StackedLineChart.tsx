import React, { useEffect, useRef } from 'react'
import Highcharts from 'highcharts'
import HighchartsExporting from 'highcharts/modules/exporting'
import HighchartsReact from 'highcharts-react-official'
import { useRouter } from 'next/router'
import { CycleLineMarker } from '../../../dashboard/ChartDetail/ChartDetail'

declare module 'highcharts' {
  interface Chart {
    customVerticalLines: SVGElement[]
  }
}

if (typeof Highcharts === 'object') {
  HighchartsExporting(Highcharts)
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
  cycleMarkers: CycleLineMarker[]
}

export const StackedLineChart: React.FC<StackedLineChartProps> = (props: StackedLineChartProps) => {
  const router = useRouter()
  const chartComponentRef = useRef<HighchartsReact.RefObject>(null)

  const { title, centerTitle, subTitle, data, height = 300, name, cycleMarkers } = props

  useEffect(() => {
    const chart = chartComponentRef.current?.chart
    if (chart) {
      chart.customVerticalLines?.forEach((line) => line.destroy())
      chart.customVerticalLines = []

      cycleMarkers.forEach((marker) => {
        if (typeof marker.cycle === 'number') {
          const point = chart.series[0].data.find((dp) => dp.options['cycle'] === marker.cycle)

          if (point) {
            const position = point.plotX
            const topPosition = chart.plotTop
            const bottomPosition = chart.plotTop + chart.plotHeight

            let pathArray: Highcharts.SVGPathArray = []
            if (position) {
              pathArray = [
                ['M', position, topPosition],
                ['L', position, bottomPosition],
              ]
            }
            const line = chart.renderer
              .path(pathArray)
              .attr({
                'stroke-width': 2,
                stroke: marker.color,
                zIndex: 3,
              })
              .add()

            if (line) {
              chart.customVerticalLines.push(line)
            }
          }
        }
      })
    }
  }, [cycleMarkers])

  const option = {
    title: {
      text: title,
      align: centerTitle ? 'center' : 'left',
      style: {
        fontSize: '12px',
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
    series: data,
    plotOptions: {
      series: {
        cursor: 'pointer',
        stacking: null,
        findNearestPointBy: 'xy',
        point: {
          events: {
            click: function () {
              window.open(`/cycle/${this.cycle}`, '_blank')
            },
          },
        },
      },
    },
    legend: {
      enabled: true,
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
        let cycle = 0

        let tooltipContent = `<span><b>${xDateString}</b></span><br /><br />`

        this.series.chart.series.forEach((series) => {
          if (!series.visible) return
          const seriesName = series.name
          const dataPoint = series.data.find((point) => point.x === timestamp)
          cycle = dataPoint.cycle
          if (dataPoint) {
            tooltipContent += `<span>${seriesName}: <b>${dataPoint.y}</b></span><br />`
          }
        })
        tooltipContent += `<span>Cycle Number: <b>${cycle}</b></span><br />`

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
    exporting: {
      allowHTML: true,
      menuItemDefinitions: {
        viewFullscreen: {
          onclick: function () {
            name === 'Validators'
              ? router.push('/validator_line_chart')
              : router.push('/transaction_line_chart')
          },
          text: 'View Detail',
        },
      },
      buttons: {
        contextButton: {
          menuItems: ['viewFullscreen'],
        },
      },
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
      selected: 1,
    },
  }

  return <HighchartsReact highcharts={Highcharts} options={option} ref={chartComponentRef} />
}
