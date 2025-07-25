# Permit System

## Purpose
A JWT-based system to allow permission-driven actions across the app (room entry, speaker request, group join, etc).

## Format
- `action`: string (e.g. "request_join_room")
- `by`: sender ID
- `to`: receiver ID
- `data`: custom payload
- `expiresIn`: optional (default: 10m)

## Sample Permit Payload
```json
{
  "action": "request_join_speakers",
  "by": "user123",
  "to": "host456",
  "data": { "room_id": "abc123" },
  "exp": 1234567890
}
