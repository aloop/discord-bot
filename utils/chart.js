import { createCanvas, registerFont } from "canvas";
import { Chart, registerables } from "chart.js";
import "chartjs-adapter-date-fns";

import singularize from "./singularize.js";

const customCanvasBackgroundColor = {
    id: "customCanvasBackgroundColor",
    beforeDraw: (chart, args, options) => {
        const { ctx } = chart;
        ctx.save();
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = options.color || "#99ffff";
        ctx.fillRect(0, 0, chart.width, chart.height);
        ctx.restore();
    },
};

const formatToChartData = ({ updatedAt, price }) => ({
    x: updatedAt,
    y: price,
});

const canvasWidth = 400;
const canvasHeight = 300;

export async function generateChart(data, period, unit) {
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext("2d");

    Chart.register(...registerables);

    period = Math.abs(period);

    let timeFrame = `${period} ${unit}`;

    if (period === 1) {
        timeFrame = singularize(unit);
    }

    let label = `Wow Token Price History - Last ${timeFrame}`;

    const chartConfig = {
        type: "line",
        data: {
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
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,
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
            plugins: {
                customCanvasBackgroundColor: {
                    color: "#36393f",
                },
            },
        },
        plugins: [customCanvasBackgroundColor],
    };

    const chart = new Chart(ctx, chartConfig);

    const stream = canvas.createPNGStream();
    stream.once("finish", () => chart.destroy());

    return stream;
}
