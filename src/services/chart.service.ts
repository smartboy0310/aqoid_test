import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import type { ChartConfiguration } from 'chart.js';

const canvas = new ChartJSNodeCanvas({ width: 800, height: 450, backgroundColour: 'white' });

export const chartService = {
  async scoreDistributionChart(scores: number[]): Promise<Buffer> {
    const buckets = [0, 0, 0, 0, 0]; // 0-20,20-40,40-60,60-80,80-100
    for (const s of scores) {
      const idx = Math.min(4, Math.floor(s / 20));
      buckets[idx]++;
    }
    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: ['0-20%', '20-40%', '40-60%', '60-80%', '80-100%'],
        datasets: [{ label: 'Talabalar soni', data: buckets, backgroundColor: '#4C84FF' }],
      },
      options: {
        plugins: { title: { display: true, text: 'Ballar taqsimoti' } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
      },
    };
    return canvas.renderToBuffer(config);
  },

  async difficultyChart(items: { text: string; difficultyIndex: number }[]): Promise<Buffer> {
    const labels = items.map((_, i) => `S${i + 1}`);
    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Qiyinlik indeksi (p)',
            data: items.map((i) => i.difficultyIndex),
            backgroundColor: items.map((i) =>
              i.difficultyIndex < 0.3 ? '#E74C3C' : i.difficultyIndex > 0.8 ? '#F1C40F' : '#2ECC71',
            ),
          },
        ],
      },
      options: {
        plugins: {
          title: { display: true, text: 'Savollar qiyinlik darajasi (qizil = juda qiyin, sariq = juda oson)' },
        },
        scales: { y: { min: 0, max: 1 } },
      },
    };
    return canvas.renderToBuffer(config);
  },
};
