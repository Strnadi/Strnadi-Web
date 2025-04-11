export interface Notification {
  kind: "info" | "warning" | "error";
  message: string;
  title?: string;
}
