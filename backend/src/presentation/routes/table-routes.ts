import { Router, Request, Response } from "express";
import { authenticateStaff, AuthRequest } from "../middleware/auth";
import { container } from "../../infrastructure/container";
import { DomainError } from "../../shared/errors";
import { ListTablesUseCase } from "../../application/usecases/tables/list-tables";
import { CreateTableUseCase } from "../../application/usecases/tables/create-table";
import { UpdateTableUseCase } from "../../application/usecases/tables/update-table";
import { DeleteTableUseCase } from "../../application/usecases/tables/delete-table";

const router = Router();

const listTables = new ListTablesUseCase(container.tableRepo);
const createTable = new CreateTableUseCase(container.tableRepo);
const updateTable = new UpdateTableUseCase(container.tableRepo);
const deleteTable = new DeleteTableUseCase(container.tableRepo);

router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await listTables.execute();
    res.json(data);
  } catch (error) {
    if (error instanceof DomainError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("テーブル一覧取得エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

router.post("/", authenticateStaff, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await createTable.execute(req.body);
    res.status(201).json(data);
  } catch (error) {
    if (error instanceof DomainError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("テーブル追加エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

router.put("/:id", authenticateStaff, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await updateTable.execute(parseInt(req.params.id), req.body);
    res.json(data);
  } catch (error) {
    if (error instanceof DomainError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("テーブル更新エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

router.delete("/:id", authenticateStaff, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await deleteTable.execute(parseInt(req.params.id));
    res.json(data);
  } catch (error) {
    if (error instanceof DomainError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("テーブル削除エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

export default router;
