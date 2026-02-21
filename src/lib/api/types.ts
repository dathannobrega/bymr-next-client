export {
  InitResponseSchema,
  GetNewMapResponseSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  type InitResponse,
  type GetNewMapResponse,
  type LoginRequest,
  type LoginResponse,
} from "../contracts/compat";

export {
  CmdEnvelopeSchema,
  CmdResponseSchema,
  CmdOperationSchema,
  type CmdEnvelope,
  type CmdResponse,
  type CmdOperation,
  type PlaceBuildingArgs,
  type MoveBuildingArgs,
  type UpgradeBuildingArgs,
  type CancelUpgradeArgs,
  type CancelAcademyUpgradeArgs,
  type CollectHarvesterArgs,
  type FinishAcademyUpgradeNowArgs,
  type PurchaseStoreItemArgs,
  type ApplyYardPlannerTemplateArgs,
  type StartRepairBuildingArgs,
  type StartRepairAllBuildingsArgs,
  type StartAcademyUpgradeArgs,
} from "../contracts/cmd";

export {
  StoreCatalogItemSchema,
  StoreInventoryEntrySchema,
  StoreCatalogResponseSchema,
  type StoreCatalogItem,
  type StoreInventoryEntry,
  type StoreCatalogResponse,
} from "../contracts/store";

export {
  YardPlannerTemplateSchema,
  YardPlannerTemplatesResponseSchema,
  YardPlannerSaveTemplateRequestSchema,
  type YardPlannerTemplate,
  type YardPlannerTemplatesResponse,
  type YardPlannerSaveTemplateRequest,
} from "../contracts/yardPlanner";

export {
  BaseLoadRequestSchema,
  BaseLoadResponseSchema,
  BaseSaveRequestSchema,
  BaseSaveResponseSchema,
  NonCriticalBaseSaveActionSchema,
  type BaseLoadRequest,
  type BaseLoadResponse,
  type BaseSaveRequest,
  type BaseSaveResponse,
  type NonCriticalBaseSaveAction,
} from "../contracts/base";
