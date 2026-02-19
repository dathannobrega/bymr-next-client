export {
  InitResponseSchema,
  GetNewMapResponseSchema,
  type InitResponse,
  type GetNewMapResponse,
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
} from "../contracts/cmd";

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
