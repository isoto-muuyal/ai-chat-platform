import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ConversationDetail.css';

interface Message {
  id: string;
  sender: string;
  content: string;
  createdAt: string;
  isTroll: boolean;
  sourceClient?: string | null;
}

interface Conversation {
  id: string;
  robloxUserId: string;
  robloxUsername: string;
  startedAt: string;
  lastMessageAt: string;
  topic: string | null;
  sentiment: string | null;
}

export default function ConversationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const response = await fetch(`/api/conversations/${id}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setConversation(data.conversation);
      setMessages(data.messages);
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="loading">Loading conversation...</div>;
  if (!conversation) return <div className="error">Conversation not found</div>;

  return (
    <div className="conversation-detail">
      <div className="detail-header">
        <button onClick={() => navigate('/conversations')} className="back-btn">
          ← Back to Conversations
        </button>
        <h2>Conversation Details</h2>
      </div>

      <div className="info-card">
        <h3>Conversation Information</h3>
        <div className="info-grid">
          <div className="info-item">
            <label>ID</label>
            <div>{conversation.id}</div>
          </div>
          <div className="info-item">
            <label>User</label>
            <div>{conversation.robloxUsername || conversation.robloxUserId}</div>
          </div>
          <div className="info-item">
            <label>Started</label>
            <div>{new Date(conversation.startedAt).toLocaleString()}</div>
          </div>
          <div className="info-item">
            <label>Last Message</label>
            <div>{new Date(conversation.lastMessageAt).toLocaleString()}</div>
          </div>
          <div className="info-item">
            <label>Topic</label>
            <div>{conversation.topic || '-'}</div>
          </div>
          <div className="info-item">
            <label>Sentiment</label>
            <div>{conversation.sentiment || '-'}</div>
          </div>
        </div>
      </div>

      <div className="messages-container">
        <h3>Message Timeline ({messages.length} messages)</h3>
        <div className="messages-list">
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.isTroll ? 'troll' : ''}`}>
              <div className="message-header">
                <span className="sender">{message.sender}</span>
                <span className="time">{new Date(message.createdAt).toLocaleString()}</span>
                {message.sourceClient && <span className="badge">{message.sourceClient}</span>}
                {message.isTroll && <span className="badge">Troll</span>}
              </div>
              <div className="message-content">{message.content}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
