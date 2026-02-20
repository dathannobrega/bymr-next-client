import { Save } from "../../../models/save.model.js";
import { User } from "../../../models/user.model.js";
import { Status } from "../../../enums/StatusCodes.js";
import type { KoaController } from "../../../utils/KoaController.js";
import { BASE_URL, PORT, getApiVersion, postgres } from "../../../server.js";
import { joinOrCreateWorld } from "../../../services/maproom/v2/joinOrCreateWorld.js";
import { leaveWorld } from "../../../services/maproom/v2/leaveWorld.js";
import { logger } from "../../../utils/logger.js";
import { relocateOutpostErr } from "../../../errors/errors.js";
import { ClientSafeError } from "../../../middleware/clientSafeError.js";

export const relocate: KoaController = async (ctx) => {
  try {
    const user: User = ctx.authUser;
    await postgres.em.populate(user, ["save"]);

    const save = user.save ?? (await Save.createMainSave(postgres.em, user));

    if (Array.isArray(save.outposts) && save.outposts.length > 0) {
      throw relocateOutpostErr();
    }

    await leaveWorld(user, save);
    await joinOrCreateWorld(user, save, postgres.em, true);
    await postgres.em.populate(user, ["save", "save.cell"]);

    const refreshedSave = user.save ?? save;
    const [x, y] = (refreshedSave.homebase ?? ["0", "0"]).map((n) => Number.parseInt(String(n), 10));
    const baseUrl = BASE_URL ?? "http://localhost";

    ctx.status = Status.OK;
    ctx.body = {
      error: 0,
      mapheaderurl: `${baseUrl}:${PORT}/api/${getApiVersion()}/bm/getnewmap`,
      coords: [Number.isFinite(x) ? x : 0, Number.isFinite(y) ? y : 0],
    };
  } catch (error) {
    if (error instanceof ClientSafeError) throw error;

    logger.error("Error relocating user in worldmap v3", error);
    ctx.status = Status.INTERNAL_SERVER_ERROR;
    ctx.body = { error: "Failed to relocate user in worldmap v3." };
  }
};
