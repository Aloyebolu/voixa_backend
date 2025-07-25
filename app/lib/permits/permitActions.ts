export async function handlePermitAction(decodedPermit) {
    const { action, by, to, data } = decodedPermit;
  
    switch (action) {
      case "joinRoom":
        // return joinRoom(data.room_id, to);
  
      case "grantCamera":
        // return updateCameraPermission(data.room_id, to, true);
  
      case "addToSpeakers":
        return addToFriendsList(by, to);
  
      default:
        throw new Error("Unknown permit action");
    }
  }
  