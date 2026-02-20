import { Request, Response } from "express";
import { DomainError } from "../../shared/errors";

export function handleRoute(
  label: string,
  handler: (req: Request, res: Response) => Promise<void>
) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      await handler(req, res);
    } catch (error) {
      if (error instanceof DomainError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error(`${label}:`, error);
      res.status(500).json({ error: "サーバーエラーが発生しました" });
    }
  };
}
