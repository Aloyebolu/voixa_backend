
---

### 🔹 `docs/actions.md`

Documentation of all room actions:

```md
# Permit Actions

| Action Name             |
|-------------------------|
| set_as_host             |
| remove_from_host        |
| set_as_viewer           |
| remove_from_room        |
| grant_camera_access     |
| transfer_holder_role    |



## Explanation of each actions

# set_as_host 
This function is to give a user the host role by setting the `role` to `host` in `room_roles`
- `the initiator is a holder`
- `the target is not a host`

# remove_from_host 
This function is to remove the host role from a user by setting the `role` to `participant` in `room_roles`
- `the initiator is a holder`
- `the target is a host`

# set_as_viewer
This action is to set a user as a viewer by setting their `position` to `0` in `room_roles`

# remove_from_room
This function is to  remove the host role from a user by setting the `status` to `removed` in `room_roles`
- `the initiator is a holder`

# disable_messaging
Role based denial from sending messages in rooms by changing the `messaging_status` in `room_roles`
- `the initiator must be a holder`
it sets the messaging status for that room to either 
    `disabled` - No one in the room can send a message
    `holder-only` - Only the room holder can send a message
    `host-only` - The holder and hosts only can send messages

# close_room
This action is to close the room by setting the `status` to `closed` in `rooms`
The initiator must be the holder.
The room would automaticaly close if there is no one present