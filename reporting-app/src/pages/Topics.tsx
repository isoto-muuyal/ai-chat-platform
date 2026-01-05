import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import './Topics.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface Topic {
  topic: string;
  count: number;
  share: number;
}

interface TimeseriesData {
  topics: string[];
  dailyData: Record<string, Array<{ date: string; count: number }>>;
  dates: string[];
}

export default function Topics() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [timeseries, setTimeseries] = useState<TimeseriesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [topN, setTopN] = useState(5);

  useEffect(() => {
    loadData();
  }, [days, topN]);

  async function loadData() {
    setLoading(true);
    try {
      const [topicsRes, timeseriesRes] = await Promise.all([
        fetch(`/api/topics?days=${days}`, { credentials: 'include' }),
        fetch(`/api/topics/timeseries?days=${days}&top=${topN}`, { credentials: 'include' }),
      ]);

      if (!topicsRes.ok || !timeseriesRes.ok) throw new Error('Failed to fetch');

      const [topicsData, timeseriesData] = await Promise.all([
        topicsRes.json(),
        timeseriesRes.json(),
      ]);

      setTopics(topicsData);
      setTimeseries(timeseriesData);
    } catch (error) {
      console.error('Error loading topics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="loading">Loading topics...</div>;

  const colors = [
    '#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe',
    '#43e97b', '#fa709a', '#fee140', '#30cfd0', '#330867',
  ];

  const chartData = timeseries
    ? {
        labels: timeseries.dates.map((d) => {
          const date = new Date(d);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }),
        datasets: timeseries.topics.map((topic, index) => ({
          label: topic,
          data: timeseries.dailyData[topic].map((d) => d.count),
          borderColor: colors[index % colors.length],
          backgroundColor: colors[index % colors.length] + '20',
          tension: 0.4,
        })),
      }
    : null;

  return (
    <div className="topics">
      <div className="topics-header">
        <h2>Topics Analysis</h2>
        <div className="controls">
          <label>
            Days:
            <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
              <option value={7}>7</option>
              <option value={30}>30</option>
              <option value={90}>90</option>
            </select>
          </label>
          <label>
            Top N:
            <input
              type="number"
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              min={1}
              max={20}
            />
          </label>
          <a
            href={`/api/export/topics.xlsx?days=${days}`}
            className="export-btn"
            download
          >
            Export XLSX
          </a>
        </div>
      </div>

      <div className="topics-grid">
        <div className="chart-card">
          <h3>Topic Counts and Share</h3>
          <table>
            <thead>
              <tr>
                <th>Topic</th>
                <th>Count</th>
                <th>Share (%)</th>
              </tr>
            </thead>
            <tbody>
              {topics.map((topic) => (
                <tr key={topic.topic}>
                  <td>{topic.topic}</td>
                  <td>{topic.count.toLocaleString()}</td>
                  <td>{topic.share.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="chart-card">
          <h3>Top Topics Timeseries (Last {days} Days)</h3>
          {chartData && (
            <div className="chart-container">
              <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

