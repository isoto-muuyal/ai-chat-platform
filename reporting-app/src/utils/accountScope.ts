import { Request } from 'express';

export function applyAccountScope(
  req: Request,
  conditions: string[],
  params: unknown[],
  paramIndex: number,
  column: string
): number {
  if (req.session?.role === 'sysadmin') {
    return paramIndex;
  }

  if (req.session?.accountNumber === undefined) {
    throw new Error('Missing account scope');
  }

  conditions.push(`${column} = $${paramIndex}`);
  params.push(req.session.accountNumber);
  return paramIndex + 1;
}
