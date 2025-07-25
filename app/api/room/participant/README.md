📦 POST /api/user/participant
This API endpoint allows you to fetch detailed participant/user data dynamically — including standard fields (like name, role, country) and advanced badge-powered display logic (like top_badges, name_style, etc).

✨ Features
✅ Custom field querying

🔐 Authenticated using token (getUserIdFromRequest)

🚀 Badge-based power fields (vip, early_adopter, dev, etc.)

⚡️ Integrated with Redis cache for speed

🧠 Auto-detects active badges and applies styling logic

🖼️ Image support via user_images table

🛠️ Request Format
http
Copy
Edit
POST /api/user/participant
Headers
json
Copy
Edit
Authorization: Bearer <token>
Content-Type: application/json
Body
json
Copy
Edit
{
  "userId": "abc123",
  "fields": ["id", "name", "image_path", "top_badges", "name_style"]
}
🔐 Authentication
The viewer must be authenticated — their token will be used to determine if they can view the requested data.

📥 Available Fields
Field Name	Description
id	User ID (always returned)
name	Username
role	Role in the room
raised_hand	If the hand is raised in room
is_muted	Mute status
status	Online/offline/away
position	Position in room grid
image_path	Active profile image
country	User's country
top_badges	Array of top 3 displayed badges
name_style	Style object (color/font) for displaying name
bubble_style	Style object for their message bubble
entrance_style	Animation/effect for room entrance

🧠 Badge-Based Computed Fields
top_badges: Top 3 badges based on ordering

name_style: Derived from badge priority (e.g. VIP → yellow, Early → gradient)

bubble_style: Special bubble theme from badges

entrance_style: Entrance animation/effect triggered on join

These are powered by logic from:

ts
Copy
Edit
getNameStyleFromBadges()
getBubbleStyleFromBadges()
getRoomEntranceStyleFromBadges()
✅ Sample Response
json
Copy
Edit
{
  "participant": {
    "id": "abc123",
    "name": "Breakthrough",
    "image_path": "/uploads/profile/abc123.jpg",
    "top_badges": [
      { "type": "vip", "expires_at": "2025-08-01T00:00:00Z" },
      { "type": "verified", "expires_at": null }
    ],
    "name_style": {
      "color": "#FFD700",
      "fontWeight": "bold"
    }
  }
}
⚠️ Notes
If no fields are provided, all allowed fields will be returned.

Invalid or unauthorized tokens return 401 Unauthorized

CORS is handled via setCorsHeaders()

📁 Related Files
lib/badgeService.ts – Fetches badge data from DB

lib/redis/userBadges.ts – Caches badge data

lib/badgeDisplay.ts – Converts badge info into display styles

🔥 Future Upgrades
Add fallback badges for new users

Track badge usage analytics

Add badge_effects field for special UI rendering