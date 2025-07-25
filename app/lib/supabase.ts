import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL! || 'https://vfwvvednpjtigysckvhq.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmd3Z2ZWRucGp0aWd5c2NrdmhxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQyMTkyMiwiZXhwIjoyMDY4OTk3OTIyfQ.oJfsLoNSRiaayfuMkT2VrgDEjHWfpyQq4UGpKzpLPtM'  // Use service role key securely
export const supabase = createClient(supabaseUrl, supabaseKey)
