import { SentimentIntensityAnalyzer } from 'vader-sentiment';

type SentimentLabel = 'positive' | 'neutral' | 'negative';

type LexiconOverrides = Record<string, number>;

export class SentimentAnalyzer {
  private readonly positiveThreshold: number;
  private readonly negativeThreshold: number;
  private readonly lexiconOverrides: LexiconOverrides;

  constructor(config?: {
    positiveThreshold?: number;
    negativeThreshold?: number;
    lexiconOverrides?: LexiconOverrides;
  }) {
    this.positiveThreshold = config?.positiveThreshold ?? 0.05;
    this.negativeThreshold = config?.negativeThreshold ?? -0.05;
    this.lexiconOverrides = config?.lexiconOverrides ?? {};
  }

  analyze(message: string): SentimentLabel | null {
    const text = message.trim();
    if (!text) return null;

    const hasOverrides = Object.keys(this.lexiconOverrides).length > 0;
    const scores = hasOverrides
      ? SentimentIntensityAnalyzer.polarity_scores(text, { lexicon: this.lexiconOverrides })
      : SentimentIntensityAnalyzer.polarity_scores(text);

    const compound = typeof scores.compound === 'number' ? scores.compound : 0;

    if (compound >= this.positiveThreshold) return 'positive';
    if (compound <= this.negativeThreshold) return 'negative';
    return 'neutral';
  }
}

const parseNumericEnv = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseLexiconOverrides = (raw: string | undefined): LexiconOverrides => {
  if (!raw?.trim()) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    const entries = Object.entries(parsed);
    return entries.reduce<LexiconOverrides>((acc, [token, score]) => {
      if (typeof score === 'number' && Number.isFinite(score)) {
        acc[token] = score;
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
};

export const sentimentAnalyzer = new SentimentAnalyzer({
  positiveThreshold: parseNumericEnv(process.env.SENTIMENT_POSITIVE_THRESHOLD, 0.05),
  negativeThreshold: parseNumericEnv(process.env.SENTIMENT_NEGATIVE_THRESHOLD, -0.05),
  lexiconOverrides: parseLexiconOverrides(process.env.SENTIMENT_VADER_LEXICON_OVERRIDES),
});

export type { SentimentLabel };
