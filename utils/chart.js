import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import "chartjs-adapter-date-fns";

const chart = new ChartJSNodeCanvas({
    width: 400,
    height: 300,
    backgroundColour: "#36393f",
    colour: "#ffffff",
});

const formatToChartData = ({ updatedAt, price }) => ({
    x: updatedAt,
    y: price,
});

export async function generateChart(data, timeUnit = "hour") {
    const chartData = {
        datasets: [
            {
                label: `Wow Token Price History - Last ${
                    timeUnit === "hour" ? "24 hours" : "30 days"
                }`,
                data: data.map(formatToChartData),
                pointRadius: 0,
                fill: false,
                borderColor: "hsl(110, 66%, 64%)",
                tension: 0.1,
            },
        ],
    };

    return await chart.renderToDataURL({
        type: "line",
        data: chartData,
        options: {
            color: "#ffffff",
            scales: {
                y: {
                    ticks: {
                        color: "#ffffff",
                    },
                },
                x: {
                    ticks: {
                        color: "#ffffff",
                    },
                    type: "time",
                    time: {
                        unit: timeUnit,
                        displayFormats: {
                            day: "MMM do",
                            hour: "h aaa",
                        },
                    },
                },
            },
        },
    });
}
