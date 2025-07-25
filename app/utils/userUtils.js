export async function getUser(token, userId, fields = []) {
    try {
      const res = await fetch('http://localhost:3000/api/user/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          fields
        })
      });
  
      const data = await res.json();
  
      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch user');
      }
  
      return {
        viewerId: data.viewerId,
        user: data.user
      };
    } catch (err) {
      console.error( err); 
      return null;
    }
  }

export async function getRoomParticipant(token, userId, fields = []) {
    try {
        const res = await fetch('http://localhost:3000/api/room/participant', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ userId, fields })
        });

        if (!res.ok) {
            throw new Error('Failed to fetch room participant');
        }

        return await res.json();
    } catch (err) {
        console.error(err);
        return null;
    }
}
  