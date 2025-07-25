export async function removeRoomParticipant(token, userId , roomId) {
    try {
        const res = await fetch('http://localhost:3000/api/room/participant/remove', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ userId, roomId })
        });

        if (!res.ok) {
            throw new Error('Failed to remove room participant');
        }

        return await res.json();
    } catch (err) {
        console.error(err);
        return null;
    }
}
export async function roomAction(token, roomId, targetId, action, extra = {}) {
    const permitToken = extra.permitToken || null; // Optional permit token for actions like "permit" or "unpermit"
    console.log('roomAction', { token, roomId, targetId, action, permitToken });
    try {
        const res = await fetch('http://localhost:3000/api/room/action', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({targetId,  roomId, action, permitToken })
        });

        if (!res.ok) {
            throw new Error('Failed to perform room action');
        }

        return await res.json();
    } catch (err) {
        console.error(err);
        return null;
    }
}