import React from "react";
import Highcharts from "highcharts";
import HighchartsExporting from "highcharts/modules/exporting";
import HighchartsReact from "highcharts-react-official";
import { useRouter } from "next/router";

if (typeof Highcharts === "object") {
  HighchartsExporting(Highcharts);
}

interface LineChartProps {
  title: string;
  centerTitle?: boolean;
  subTitle?: string;
  data: any;
  height?: number;
  name: string;
}

export const LineChart: React.FC<LineChartProps> = (props) => {
  const router = useRouter();

  const { title, centerTitle, subTitle, data, height = 300, name } = props;

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
        name: name,
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
      pointFormat: name === 'Validators' ?
        "<span>Number of Validators: <b>{point.y}</b></span><br/><br /><span>CycleNumber: <b></b></span>" : "<span>Total Transactions: <b>{point.y}</b></span><br/><br /><span>CycleNumber: <b></b></span>",
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
    exporting: {
      allowHTML: true,
      menuItemDefinitions: {
        viewFullscreen: {
          onclick: function () {
            router.push("/transaction_line_chart");
          },
          text: "View Detail",
        },
      },
      buttons: {
        contextButton: {
          menuItems: ["viewFullscreen"],
        },
      },
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
    />
  );
};
