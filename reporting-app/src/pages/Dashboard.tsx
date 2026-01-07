import { useEffect, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import './Dashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface OverviewData {
  totals: {
    conversations: number;
    messages: number;
    users: number;
  };
  metrics: {
    trollRate: number;
    avgMessagesPerConversation: number;
  };
  topTopics: Array<{ topic: string; count: number }>;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export default function Dashboard() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(90);

  useEffect(() => {
    loadData();
  }, [days]);

  async function loadData() {
    try {
      const response = await fetch(`/api/overview?days=${days}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (!data) return <div className="error">Failed to load dashboard data</div>;

  const sentimentData = {
    labels: ['Positive', 'Neutral', 'Negative'],
    datasets: [
      {
        data: [data.sentiment.positive, data.sentiment.neutral, data.sentiment.negative],
        backgroundColor: ['#4caf50', '#ff9800', '#f44336'],
      },
    ],
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Dashboard Overview</h2>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Conversations</h3>
          <div className="stat-value">{data.totals.conversations.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <h3>Messages</h3>
          <div className="stat-value">{data.totals.messages.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <h3>Unique Users</h3>
          <div className="stat-value">{data.totals.users.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <h3>Troll Rate</h3>
          <div className="stat-value">{data.metrics.trollRate.toFixed(2)}%</div>
        </div>
        <div className="stat-card">
          <h3>Avg Messages/Conv</h3>
          <div className="stat-value">{data.metrics.avgMessagesPerConversation.toFixed(2)}</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="chart-card">
          <h3>Top 10 Topics</h3>
          <table>
            <thead>
              <tr>
                <th>Topic</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {data.topTopics.map((item) => (
                <tr key={item.topic}>
                  <td>{item.topic}</td>
                  <td>{item.count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="chart-card">
          <h3>Sentiment Breakdown</h3>
          <div className="chart-container">
            <Doughnut data={sentimentData} />
          </div>
        </div>
      </div>
    </div>
  );
}
