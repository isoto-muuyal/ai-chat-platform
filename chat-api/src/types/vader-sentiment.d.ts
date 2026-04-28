declare module 'vader-sentiment' {
  const SentimentIntensityAnalyzer: {
    polarity_scores: (
      text: string,
      options?: { lexicon?: Record<string, number> }
    ) => { compound?: number };
  };
  export { SentimentIntensityAnalyzer };
}
