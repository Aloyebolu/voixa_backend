export type RoomActionType =
  | 'set_as_speaker'
  | 'set_as_viewer'
  | 'set_as_holder'
  | 'remove_from_room'
  | 'send_invite'
  | 'send_join_request'
  | 'set_as_host'
  | 'remove_from_host'
  | 'follow_room_holder'
  | 'change_room_type'
  | 'toggle_messaging'
  | 'entrance'
  | 'message'
  | 'leave'
  | 'receive_voice'
  | 'toggle_mic'
  | 'send_request';

  export interface RoomPayload{
    message? : string,
    id? : string,
    senderId? : string,
    error? : string,
    token? : string
  }

  export interface UserRoleData {
    id: string;
    role?: string;
    status?: string;
    position?: number;
    [key: string]: any;
  }
  
  export type RoomType = 'music' | 'game' | 'love' | 'class' | 'default';
  
  export interface RoomData {
  id?: string;
  [key: string]: any;
  type?: RoomType;
  description?: string;
  tag? : string;
  max_participants?: string;
  messaging_status?: string;

}
