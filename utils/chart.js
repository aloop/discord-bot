import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import "chartjs-adapter-date-fns";
import singularize from "./singularize.js";

const chart = new ChartJSNodeCanvas({
    type: "png",
    width: 400,
    height: 300,
    backgroundColour: "#36393f",
    colour: "#ffffff",
});

const formatToChartData = ({ updatedAt, price }) => ({
    x: updatedAt,
    y: price,
});

export async function generateChart(data, period, unit) {
    period = Math.abs(period);

    let timeFrame = `${period} ${unit}`;

    if (period === 1) {
        timeFrame = singularize(unit);
    }

    let label = `Wow Token Price History - Last ${timeFrame}`;

    const chartData = {
        datasets: [
            {
                label,
                data: data.map(formatToChartData),
                pointRadius: 0,
                fill: false,
                borderColor: "hsl(110, 66%, 64%)",
                tension: 0.1,
            },
        ],
    };

    return await chart.renderToBuffer(
        {
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
                            unit: singularize(unit),
                            displayFormats: {
                                day: "MMM do",
                                hour: "haaa",
                            },
                        },
                    },
                },
            },
        },
        "image/png"
    );
}
