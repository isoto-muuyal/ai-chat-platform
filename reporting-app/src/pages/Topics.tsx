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
import { useSettings } from '../contexts/SettingsContext';

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
  const { t } = useSettings();
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

  if (loading) return <div className="loading">{t('loadingTopics')}</div>;

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

  const dayLabel = days === 7 ? t('last7') : days === 30 ? t('last30') : t('last90');

  return (
    <div className="topics">
      <div className="topics-header">
        <h2>{t('topicsAnalysis')}</h2>
        <div className="controls">
          <label>
            {t('days')}:
            <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
              <option value={7}>7</option>
              <option value={30}>30</option>
              <option value={90}>90</option>
            </select>
          </label>
          <label>
            {t('topN')}:
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
            {t('exportXlsx')}
          </a>
        </div>
      </div>

      <div className="topics-grid">
        <div className="chart-card">
          <h3>{t('topicCountsShare')}</h3>
          <table>
            <thead>
              <tr>
                <th>{t('topic')}</th>
                <th>{t('count')}</th>
                <th>{t('share')}</th>
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
          <h3>
            {t('topTopicsTimeseries')} ({dayLabel})
          </h3>
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
