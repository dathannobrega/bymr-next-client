import { Status } from "../../enums/StatusCodes.js";
import { Save } from "../../models/save.model.js";
import { User } from "../../models/user.model.js";
import { postgres } from "../../server.js";
import { storeItems } from "../../data/store/storeItems.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";
import type { KoaController } from "../../utils/KoaController.js";

export const getStoreCatalog: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  await postgres.em.populate(user, ["save"]);
  const save = user.save ?? (await Save.createMainSave(postgres.em, user));

  ctx.status = Status.OK;
  ctx.body = {
    error: 0,
    serverTime: getCurrentDateTime(),
    credits: Math.max(0, Number(save.credits) || 0),
    items: { ...storeItems },
    storeData: { ...(save.storedata ?? {}) },
  };
};
