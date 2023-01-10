import React from "react";
import { useRouter } from "next/router";
import Highcharts from "highcharts/highstock";
import HighchartsExporting from "highcharts/modules/exporting";
import HighchartsReact from "highcharts-react-official";

if (typeof Highcharts === "object") {
  HighchartsExporting(Highcharts);
}

interface LineStockChartProps {
  title: string;
  centerTitle?: boolean;
  subTitle?: string;
  data: any;
  height?: number;
}

export const LineStockChart: React.FC<LineStockChartProps> = (props) => {
  const router = useRouter();

  const { title, centerTitle, subTitle, data, height = 300 } = props;

  const option = {
    title: {
      text: title,
      align: centerTitle ? "center" : "left",
      style: {
        fontSize: "18px",
      },
    },
    subtitle: {
      text: subTitle || undefined,
      style: {
        fontSize: "12px",
      },
    },
    series: [
      {
        name: "Transactions:",
        data: data,
      },
    ],
    legend: {
      enabled: false,
    },
    xAxis: {
      type: "datetime",
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
        "<span>Transactions: <b>{point.y}</b></span><br/><br /><span>Prices: <b>$123,456</b></span>",
      borderColor: "#dedede",
      borderRadius: 4,
    },
    chart: {
      backgroundColor: "#ffffff",
      borderColor: "#dedede",
      borderWidth: 1,
      borderRadius: 4,
      spacingTop: 20,
      height: height,
      zoomType: "x",
    },
    credits: {
      enabled: false,
    },
    navigation: {
      menuStyle: {
        border: "1px solid #dedede",
        background: "#ffffff",
        padding: "5px 0",
      },
      menuItemStyle: {
        color: "#000000",
      },
    },
    rangeSelector: {
      inputStyle: {
        color: "#039",
        fontWeight: "bold",
        backgroundColor: "white",
        border: "none",
      },
      labelStyle: {
        color: "silver",
        fontWeight: "bold",
      },
      selected: 1,
    },
  };

  return (
    <HighchartsReact
      highcharts={Highcharts}
      options={option}
      allowChartUpdate={true}
      constructorType={"stockChart"}
    />
  );
};
