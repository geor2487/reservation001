import { Router } from "express";
import { authenticateStaff, AuthRequest } from "../middleware/auth";
import { container } from "../../infrastructure/container";
import { handleRoute } from "./handle-route";
import { ListTablesUseCase } from "../../application/usecases/tables/list-tables";
import { CreateTableUseCase } from "../../application/usecases/tables/create-table";
import { UpdateTableUseCase } from "../../application/usecases/tables/update-table";
import { DeleteTableUseCase } from "../../application/usecases/tables/delete-table";

const router = Router();

const listTables = new ListTablesUseCase(container.tableRepo);
const createTable = new CreateTableUseCase(container.tableRepo);
const updateTable = new UpdateTableUseCase(container.tableRepo);
const deleteTable = new DeleteTableUseCase(container.tableRepo);

router.get("/", handleRoute("テーブル一覧取得エラー", async (_req, res) => {
  const data = await listTables.execute();
  res.json(data);
}));

router.post("/", authenticateStaff, handleRoute("テーブル追加エラー", async (req, res) => {
  const data = await createTable.execute(req.body);
  res.status(201).json(data);
}));

router.put("/:id", authenticateStaff, handleRoute("テーブル更新エラー", async (req, res) => {
  const data = await updateTable.execute(parseInt(req.params.id), req.body);
  res.json(data);
}));

router.delete("/:id", authenticateStaff, handleRoute("テーブル削除エラー", async (req, res) => {
  const data = await deleteTable.execute(parseInt(req.params.id));
  res.json(data);
}));

export default router;
