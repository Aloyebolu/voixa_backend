/* eslint-disable @typescript-eslint/no-explicit-any */
export async function handlePermitAction(decodedPermit: { action: any; by: any; to: any; }) {
    const { action } = decodedPermit;

    switch (action) {
      case "joinRoom":
        // return joinRoom(data.room_id, to);
  
      case "grantCamera":
        // return updateCameraPermission(data.room_id, to, true);
  
      case "addToSpeakers":
        // return addToFriendsList(by, to);
  
      default:
        throw new Error("Unknown permit action");
    }
  }
  