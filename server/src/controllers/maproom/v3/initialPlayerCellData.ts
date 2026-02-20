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

export const initialPlayerCellData: KoaController = async (ctx) => {
  try {
    const user: User = ctx.authUser;
    await postgres.em.populate(user, ["save", "save.cell"]);

    const save = user.save ?? (await Save.createMainSave(postgres.em, user));

    if (!save.worldid || !save.cell) {
      await joinOrCreateWorld(user, save);
      await postgres.em.populate(user, ["save", "save.cell"]);
    }

    const refreshedSave = user.save ?? save;
    const homeCell =
      refreshedSave.cell ??
      (await postgres.em.findOne(WorldMapCell, {
        baseid: refreshedSave.baseid,
        world_id: refreshedSave.worldid,
      }));

    if (!homeCell) {
      ctx.status = Status.NOT_FOUND;
      ctx.body = { error: "Home cell not found for current user." };
      return;
    }

    ctx.status = Status.OK;
    ctx.body = {
      error: 0,
      celldata: [mapCellToV3Payload(homeCell, refreshedSave, user)],
      bookmarks: user.bookmarks ?? [],
    };
  } catch (error) {
    logger.error("Failed to init worldmap v3 data", error);
    ctx.status = Status.INTERNAL_SERVER_ERROR;
    ctx.body = { error: "Failed to initialize worldmap v3 data." };
  }
};

function mapCellToV3Payload(cell: WorldMapCell, save: Save, owner: User) {
  const currentTime = getCurrentDateTime();
  const level = calculateBaseLevel(save.points, save.basevalue);

  return {
    n: owner.username,
    uid: owner.userid,
    bid: cell.baseid,
    tid: 0,
    x: cell.x,
    y: cell.y,
    aid: 0,
    l: level,
    pl: 0,
    r: save.resources ?? {},
    dm: save.damage ?? 0,
    rel: 7,
    lo: save.locked ?? 0,
    fr: 0,
    p: save.protected > currentTime ? 1 : 0,
    d: save.destroyed ?? 0,
    t: cell.terrainHeight ?? 0,
    fbid: "",
    b: cell.base_type,
    i: cell.terrainHeight ?? 0,
    m: save.monsters ?? {},
  };
}
