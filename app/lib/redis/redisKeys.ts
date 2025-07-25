type Type = 
  | 'convo' // Cache messages in a conversation
  | 'room'  // Cache RoomData + Room Paricipants
  | 'badge' // Caching badge for each users
  | 'profile'   // Used together with 'view' | 'own' to log user profiles  
  | 'user'


export const getRedisKey = (type: Type, value1: string, value2?: string): string =>
    value2 ? `${type}:${value1}:${value2}` : `${type}:${value1}`;
