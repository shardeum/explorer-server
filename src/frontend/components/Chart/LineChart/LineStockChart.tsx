import React from 'react'
import Highcharts from 'highcharts/highstock'
import HighchartsExporting from 'highcharts/modules/exporting'
import HighchartsReact from 'highcharts-react-official'

if (typeof Highcharts === 'object') {
  HighchartsExporting(Highcharts)
}

interface LineStockChartProps {
  title: string
  centerTitle?: boolean
  subTitle?: string
  data: number[][]
  height?: number
  name?: string
}

interface SeriesData {
  name: string
  keys: string[]
  data: number[][]
  type?: string
  threshold?: unknown
  dataGrouping?: {
    enabled: boolean
  }
  color?: string
  visible?: boolean
}


export const LineStockChart: React.FC<LineStockChartProps> = (props) => {
  const { title, centerTitle, subTitle, data, height = 300, name } = props

  let activeAndSyncing: number[][] = []

  const seriesData: SeriesData[] = []

  if (data.length === 0) return <></>
  if (data) {
    seriesData.push({
      name: name === 'Validators' ? 'Active Validators' : 'Total Txs',
      keys:
        name === 'Validators'
          ? ['x', 'y', 'activated', 'syncing', 'joined', 'removed', 'apoped', 'cycleNumber']
          : ['x', 'y', 'totalStakeTxs', 'totalUnstakeTxs', 'cycleNumber'],
      data: data,
      // type: 'line',
      threshold: null,
      dataGrouping: {
        enabled: false,
      },
    })
    if (name === 'Validators') {
      activeAndSyncing = data.map((d) => {
        return [d[0], d[1] + d[3], d[2], d[3], d[4], d[5], d[6], d[7]]
      })
      seriesData.push({
        name: 'Active & Syncing Validators',
        keys:
          name === 'Validators'
            ? ['x', 'y', 'activated', 'syncing', 'joined', 'removed', 'apoped', 'cycleNumber']
            : ['x', 'y', 'totalStakeTxs', 'totalUnstakeTxs', 'cycleNumber'],
        data: activeAndSyncing,
        // type: 'line',
        threshold: null,
        dataGrouping: {
          enabled: false,
        },
        color: 'teal',
        visible: false,
      })
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
    series: seriesData,
    legend: {
      enabled: true,
      layout: 'horizontal',
      align: 'center',
      verticalAlign: 'bottom',
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
      pointFormat:
        name === 'Validators'
          ? `<span>Active Validators: <b>{point.y}</b></span><br/>
          <span>Activated Validators: <b>{point.activated}</b></span><br/>
          <span>Syncing Validators: <b>{point.syncing}</b></span><br/>
          <span>Joined Validators: <b>{point.joined}</b></span><br/>
          <span>Removed Validators: <b>{point.removed}</b></span><br/>
          <span>Apoptosized Validators: <b>{point.apoped}</b></span><br/>
          <span>Cycle Number <b>{point.cycleNumber}</b></span>`
          : `<span>Total Txs: <b>{point.y}</b></span><br />
      <span>Total StakeTxs: <b>{point.totalStakeTxs}</b></span><br />
      <span>Total UnstakeTxs: <b>{point.totalUnstakeTxs}</b></span><br />
      <span>Cycle Number: <b>{point.cycleNumber}</b></span><br />`,
      formatter:
        name === 'Validators'
          ? function () {
              const timestamp = this?.x

              const item = data?.filter((d) => d[0] === this?.x)
              if (item)
                return `<span><b>${Highcharts.dateFormat(
                  '%A, %B %d, %Y',
                  new Date(timestamp).getTime()
                )}</b></span><br /><br />
      <span>Active Validators: <b>${item[0][1]}</b></span><br />
      <span>Activated Validators: <b>${item[0][2]}</b></span><br />
      <span>Syncing Validators: <b>${item[0][3]}</b></span><br/>
      <span>Joined Validators: <b>${item[0][4]}</b></span><br/>
      <span>Removed Validators: <b>${item[0][5]}</b></span><br/>
      <span>Apoptosized Validators: <b>${item[0][6]}</b></span><br/>
      <span>Cycle Number: <b>${item[0][7]}</b></span>`
            }
          : function () {
              const timestamp = this?.x

              const item = data?.filter((d) => d[0] === this?.x)
              if (item)
                return `<span><b>${Highcharts.dateFormat(
                  '%A, %B %d, %Y',
                  new Date(timestamp).getTime()
                )}</b></span><br /><br />
        <span>Total Txs: <b>${item[0][1]}</b></span><br />
        <span>Total Stake Txs: <b>${item[0][3]}</b></span><br />
        <span>Total Unstake Txs: <b>${item[0][4]}</b></span><br />
        <span>Cycle Number: <b>${item[0][5]}</b></span>`
            },
      split: true,
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
      type: 'spline',
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
    // plotOptions: {
    //   series: {
    //     color: "#555555",
    //   },
    // },
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
