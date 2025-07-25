export type MessageActionType =
  | "send_message"
  | "delete_message"
  | "mark_read"
  | "edit_message"

export type MessageData = {
    message? : string,
}