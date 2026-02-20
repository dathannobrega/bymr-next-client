import z from "zod";

import { Save } from "../../../models/save.model.js";
import { User } from "../../../models/user.model.js";
import { WorldMapCell } from "../../../models/worldmapcell.model.js";
import { Status } from "../../../enums/StatusCodes.js";
import type { KoaController } from "../../../utils/KoaController.js";
import { postgres } from "../../../server.js";
import { joinOrCreateWorld } from "../../../services/maproom/v2/joinOrCreateWorld.js";
import { getCurrentDateTime } from "../../../utils/getCurrentDateTime.js";
import { calculateBaseLevel } from "../../../services/base/calculateBaseLevel.js";
import { logger } from "../../../utils/logger.js";

const GetCellsSchema = z.object({
  x: z
    .union([z.number().int(), z.string()])
    .optional()
    .transform((value) => clampInt(value, 0, 0, 799)),
  y: z
    .union([z.number().int(), z.string()])
    .optional()
    .transform((value) => clampInt(value, 0, 0, 799)),
  width: z
    .union([z.number().int(), z.string()])
    .optional()
    .transform((value) => clampInt(value, 10, 1, 50)),
  height: z
    .union([z.number().int(), z.string()])
    .optional()
    .transform((value) => clampInt(value, 10, 1, 50)),
});

export const getMapRoomCells: KoaController = async (ctx) => {
  try {
    const { x, y, width, height } = GetCellsSchema.parse(ctx.request.body ?? {});
    const user: User = ctx.authUser;

    await postgres.em.populate(user, ["save", "save.cell"]);
    const save = user.save ?? (await Save.createMainSave(postgres.em, user));

    if (!save.worldid || !save.cell) {
      await joinOrCreateWorld(user, save);
      await postgres.em.populate(user, ["save", "save.cell"]);
    }

    const refreshedSave = user.save ?? save;
    if (!refreshedSave.worldid) {
      ctx.status = Status.BAD_REQUEST;
      ctx.body = { error: "User is not attached to a world." };
      return;
    }

    const worldCells = await postgres.em.find(
      WorldMapCell,
      {
        world_id: refreshedSave.worldid,
        x: { $gte: x, $lte: x + width },
        y: { $gte: y, $lte: y + height },
      },
      { populate: ["save"] }
    );

    const ownerIds = [...new Set(worldCells.map((cell) => cell.uid).filter(Boolean))];
    const owners = await postgres.em.find(
      User,
      { userid: { $in: ownerIds } },
      { populate: ["save"] }
    );
    const ownerMap = new Map<number, User>(owners.map((owner) => [owner.userid, owner]));
    ownerMap.set(user.userid, user);

    const celldata = worldCells.map((cell) => {
      const owner = ownerMap.get(cell.uid);
      return mapCellToV3Payload(cell, owner);
    });

    ctx.status = Status.OK;
    ctx.body = {
      error: 0,
      x,
      y,
      width,
      height,
      celldata,
    };
  } catch (error) {
    logger.error("Failed to get worldmap v3 cells", error);
    ctx.status = Status.INTERNAL_SERVER_ERROR;
    ctx.body = { error: "Failed to load worldmap v3 cells." };
  }
};

function mapCellToV3Payload(cell: WorldMapCell, owner?: User) {
  const save = owner?.save ?? cell.save;
  const currentTime = getCurrentDateTime();

  const level =
    save && typeof save.points === "string" && typeof save.basevalue === "string"
      ? calculateBaseLevel(save.points, save.basevalue)
      : 1;

  return {
    n: owner?.username ?? save?.name ?? "Unknown",
    uid: cell.uid ?? 0,
    bid: cell.baseid,
    tid: 0,
    x: cell.x,
    y: cell.y,
    aid: 0,
    l: level,
    pl: 0,
    r: save?.resources ?? {},
    dm: save?.damage ?? 0,
    rel: 7,
    lo: save?.locked ?? 0,
    fr: 0,
    p: (save?.protected ?? 0) > currentTime ? 1 : 0,
    d: save?.destroyed ?? 0,
    t: cell.terrainHeight ?? 0,
    fbid: "",
    b: cell.base_type ?? 0,
    i: cell.terrainHeight ?? 0,
  };
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;

  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}
