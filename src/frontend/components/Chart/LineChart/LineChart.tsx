import React from 'react'
import Highcharts from 'highcharts'
import HighchartsExporting from 'highcharts/modules/exporting'
import HighchartsReact from 'highcharts-react-official'
import { useRouter } from 'next/router'

if (typeof Highcharts === 'object') {
  HighchartsExporting(Highcharts)
}

interface LineChartProps {
  title: string
  centerTitle?: boolean
  subTitle?: string
  data: number[][]
  height?: number
  name?: string
}

export const LineChart: React.FC<LineChartProps> = (props: LineChartProps) => {
  const router = useRouter()

  const { title, centerTitle, subTitle, data, height = 300, name } = props

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
    series: [
      {
        name: name,
        data: data,
      },
    ],
    legend: {
      enabled: false,
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
      formatter:
        name === 'Validators'
          ? function () {
              const timestamp = this?.x

              const item = data?.findIndex((d: number[]) => d[0] === timestamp)
              /* eslint-disable security/detect-object-injection */
              return `<span><b>${Highcharts.dateFormat(
                '%A, %B %d, %Y',
                new Date(timestamp).getTime()
              )}</b></span><br /><br />
      <span>Active Validators: <b>${data[item][1]}</b></span><br />
      <span>Activated Validators: <b>${data[item][2]}</b></span><br />
      <span>Syncing Validators: <b>${data[item][3]}</b></span><br />
      <span>Joined Validators: <b>${data[item][4]}</b></span><br />
      <span>Removed Validators: <b>${data[item][5]}</b></span><br />
      <span>Apoptosized Validators: <b>${data[item][6]}</b></span><br />
      <span>Cycle Number: <b>${data[item][7]}</b></span>`
            }
          : /* eslint-enable security/detect-object-injection */
            function () {
              const timestamp = this?.x

              const data = this?.series?.options?.data

              const item = data?.filter((d: number[]) => d[0] === this?.x)
              if (item)
                return `<span><b>${Highcharts.dateFormat(
                  '%A, %B %d, %Y',
                  new Date(timestamp).getTime()
                )}</b></span><br /><br />
        <span>Total Txs: <b>${item[0][1]}</b></span><br />
        <span>Total Internal Txs: <b>${item[0][2]}</b></span><br />
        <span>Total Stake Txs: <b>${item[0][3]}</b></span><br />
        <span>Total Unstake Txs: <b>${item[0][4]}</b></span><br />
        <span>Cycle Number: <b>${item[0][5]}</b></span>`
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

  return <HighchartsReact highcharts={Highcharts} options={option} />
}
