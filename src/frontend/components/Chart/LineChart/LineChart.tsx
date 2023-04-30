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
  data: any
  height?: number
  name?: string
}

export const LineChart: React.FC<LineChartProps> = (props) => {
  const router = useRouter()

  const { title, centerTitle, subTitle, data, height = 300, name } = props
  // let activeAndSyncing

  // if (data.length === 0) return <></>
  // if (data) {
  //   activeAndSyncing = data.map((d) => {
  //     return [d[0], d[1] + d[2], d[2], d[3], d[4]]
  //   })
  // }

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
      // {
      //   name: 'activeAndSyncing',
      //   lineWidth: 0.5,
      //   data: activeAndSyncing,
      // },
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
      // crosshairs: true,
      // shared: true,
      // @ts-ignore
      formatter:
        name === 'Validators'
          ? function () {
              // @ts-ignore
              const timestamp = this?.x

              // @ts-ignore
              // const data = this?.series?.options?.data

              // @ts-ignore
              const item = data?.findIndex((d) => d[0] === timestamp)
              return `<span><b>${Highcharts.dateFormat(
                '%A, %B %d, %Y',
                //@ts-ignore
                new Date(timestamp)
              )}</b></span><br /><br />
      <span>Active Validators: <b>${data[item][1]}</b></span><br />
      <span>Activated Validators: <b>${data[item][2]}</b></span><br />
      <span>Syncing Validators: <b>${data[item][3]}</b></span><br />
      <span>Joined Validators: <b>${data[item][4]}</b></span><br />
      <span>Removed Validators: <b>${data[item][5]}</b></span><br />
      <span>Apoptosized Validators: <b>${data[item][6]}</b></span><br />
      <span>Cycle Number: <b>${data[item][7]}</b></span>`
            }
          : function () {
              // @ts-ignore
              const timestamp = this?.x

              // @ts-ignore
              const data = this?.series?.options?.data

              // @ts-ignore
              const item = data?.filter((d) => d[0] === this?.x)
              if (item)
                return `<span><b>${Highcharts.dateFormat(
                  '%A, %B %d, %Y',
                  //@ts-ignore
                  new Date(timestamp)
                )}</b></span><br /><br />
        <span>Total Txs: <b>${item[0][1]}</b></span><br />
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
    // plotOptions: {
    //   series: {
    //     color: "#555555",
    //   },
    // },
  }

  return (
    <HighchartsReact
      highcharts={Highcharts}
      options={option}
      // allowChartUpdate={true}
    />
  )
}
