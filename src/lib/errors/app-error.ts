export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "ALREADY_JOINED"
  | "TOURNAMENT_NOT_JOINABLE"
  | "MATCH_NOT_READY"
  | "SESSION_NOT_FOUND"
  | "DUPLICATE_ACTION"
  | "CONFLICT"
  | "INTERNAL_ERROR";

const DEFAULT_MESSAGES: Record<AppErrorCode, string> = {
  UNAUTHORIZED: "ログインが必要です。",
  FORBIDDEN: "この操作を行う権限がありません。",
  NOT_FOUND: "データが見つかりませんでした。",
  VALIDATION_ERROR: "入力内容を確認してください。",
  ALREADY_JOINED: "すでにこのトーナメントに参加しています。",
  TOURNAMENT_NOT_JOINABLE: "現在このトーナメントには参加できません。",
  MATCH_NOT_READY: "この対戦はまだ開始できません。",
  SESSION_NOT_FOUND: "対戦セッションが見つかりませんでした。",
  DUPLICATE_ACTION: "この選択はすでに送信されています。",
  CONFLICT: "処理が競合しました。もう一度お試しください。",
  INTERNAL_ERROR: "予期しないエラーが発生しました。時間をおいて再度お試しください。",
};

/** User-safe error carried through the API boundary; message is always safe to render as-is. */
export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message?: string) {
    super(message ?? DEFAULT_MESSAGES[code]);
    this.code = code;
    this.name = "AppError";
  }
}
