export const TOPICS = [
  'general',
  'seguridad',
  'empleo',
  'economia',
  'educacion',
  'salud',
  'informacion de candidatos',
  'senado',
  'presidencia',
] as const;

export type Topic = (typeof TOPICS)[number];

export const TOPIC_PROMPT_FRAGMENT =
  `Pick EXACTLY ONE topic from: ${TOPICS.join(', ')}. If not identifiable, use "general".`;

export function normalizeTopic(raw: string | null | undefined): Topic {
  if (!raw) return 'general';
  const trimmed = raw.trim().toLowerCase();
  return (TOPICS as readonly string[]).includes(trimmed)
    ? (trimmed as Topic)
    : 'general';
}
