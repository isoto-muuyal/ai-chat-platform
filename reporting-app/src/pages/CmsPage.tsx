import { useEffect, useState } from 'react';
import PublicNav from '../components/PublicNav';
import './PublicPages.css';

type CmsContent = {
  title: string;
  content: string;
};

export default function CmsPage({ slug }: { slug: string }) {
  const [page, setPage] = useState<CmsContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`/api/cms/${slug}`)
      .then((response) => {
        if (!response.ok) throw new Error('Page not found');
        return response.json();
      })
      .then((data) => setPage({ title: data.title, content: data.content }))
      .catch(() => setError('This page is not available right now.'))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <main className="public-page">
      <PublicNav />
      <section className="public-band">
        {loading && <div>Loading...</div>}
        {error && <div>{error}</div>}
        {page && (
          <>
            <h1>{page.title}</h1>
            <div className="cms-content" dangerouslySetInnerHTML={{ __html: page.content }} />
          </>
        )}
      </section>
    </main>
  );
}
