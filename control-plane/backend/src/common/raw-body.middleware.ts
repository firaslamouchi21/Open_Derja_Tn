import type { NextFunction, Request, Response } from 'express';

export function rawBody(limitBytes: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const chunks: Buffer[] = [];
    let total = 0;
    let aborted = false;

    req.on('data', (chunk: Buffer) => {
      if (aborted) {
        return;
      }
      total += chunk.length;
      if (total > limitBytes) {
        aborted = true;
        res.status(413).json({ error: 'Upload exceeds the size limit' });
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (!aborted) {
        (req as Request & { body: Buffer }).body = Buffer.concat(chunks);
        next();
      }
    });

    req.on('error', next);
  };
}
