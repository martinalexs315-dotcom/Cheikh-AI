import { app, startServer } from '../server.ts';
import { Request, Response } from 'express';

let initialized = false;

export default async function handler(req: Request, res: Response) {
  if (!initialized) {
    await startServer();
    initialized = true;
  }
  return app(req, res);
}
