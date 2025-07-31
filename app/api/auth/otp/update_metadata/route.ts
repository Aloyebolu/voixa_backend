import { supabase } from "@/app/lib/supabase"


async function updateUserMetadata(userId, newMetadata) {
  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: newMetadata,
  })

  if (error) {
    console.error('Error updating user metadata:', error)
    return null
  }
  return data
}
