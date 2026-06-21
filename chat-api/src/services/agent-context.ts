import { pool } from '../../config/db.js';

export const buildAgentPrompt = async (params: {
  accountNumber: number;
  sourceName: string | null;
  basePrompt: string | null;
}): Promise<string | null> => {
  const result = await pool.query(
    `SELECT title, content
     FROM agent_contexts
     WHERE account_number = $1
       AND enabled = true
       AND (source_name IS NULL OR source_name = $2)
     ORDER BY source_name NULLS FIRST, updated_at DESC
     LIMIT 10`,
    [params.accountNumber, params.sourceName]
  );

  const context = (result?.rows || [])
    .map((row) => `# ${row.title}\n${row.content}`)
    .join('\n\n')
    .trim();

  const pieces = [
    params.basePrompt?.trim() || '',
    context ? `Use this customer-provided context when answering:\n\n${context}` : '',
  ].filter(Boolean);

  return pieces.length > 0 ? pieces.join('\n\n') : null;
};
