import { useEffect, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import './Troll.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface TrollData {
  daily: Array<{
    date: string;
    totalMessages: number;
    trollMessages: number;
  }>;
  topTrollTopics: Array<{ topic: string; count: number }>;
  dates: string[];
}

export default function Troll() {
  const [data, setData] = useState<TrollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadData();
  }, [days]);

  async function loadData() {
    setLoading(true);
    try {
      const response = await fetch(`/api/troll?days=${days}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error loading troll data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="loading">Loading troll data...</div>;
  if (!data) return <div className="error">Failed to load troll data</div>;

  const totalTroll = data.daily.reduce((sum, d) => sum + d.trollMessages, 0);
  const totalMessages = data.daily.reduce((sum, d) => sum + d.totalMessages, 0);
  const avgTrollRate = totalMessages > 0 ? (totalTroll / totalMessages) * 100 : 0;

  const labels = data.daily.map((d) => {
    const date = new Date(d.date);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  });

  const comparisonData = {
    labels,
    datasets: [
      {
        label: 'Total Messages',
        data: data.daily.map((d) => d.totalMessages),
        backgroundColor: '#e3f2fd',
        borderColor: '#1976d2',
      },
      {
        label: 'Troll Messages',
        data: data.daily.map((d) => d.trollMessages),
        backgroundColor: '#ffebee',
        borderColor: '#c62828',
      },
    ],
  };

  const topicsData = {
    labels: data.topTrollTopics.map((t) => t.topic),
    datasets: [
      {
        label: 'Troll Messages',
        data: data.topTrollTopics.map((t) => t.count),
        backgroundColor: '#c62828',
      },
    ],
  };

  return (
    <div className="troll">
      <div className="troll-header">
        <h2>Troll Analysis</h2>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Troll Messages</h3>
          <div className="stat-value">{totalTroll.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <h3>Total Messages</h3>
          <div className="stat-value">{totalMessages.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <h3>Average Troll Rate</h3>
          <div className="stat-value">{avgTrollRate.toFixed(2)}%</div>
        </div>
      </div>

      <div className="troll-grid">
        <div className="chart-card">
          <h3>Troll vs Non-Troll Messages</h3>
          <div className="chart-container">
            <Bar data={comparisonData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="chart-card">
          <h3>Top Trolling Topics</h3>
          <div className="chart-container">
            <Bar data={topicsData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>
    </div>
  );
}

