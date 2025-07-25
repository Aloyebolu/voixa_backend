// apiClient.ts
const API_BASE_URL = 'http://localhost:3000/api';

export async function apiFetch(
  endpoint,
  { 
    token, 
    method = 'POST', 
    body 
  }
){
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      throw new Error(`API request failed: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    console.error(`API Error at ${endpoint}:`, err);
    throw err; // Re-throw to let caller handle
  }
}