import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dadkxmojstykieektslw.supabase.co';
const supabaseKey = 'sb_publishable_1HtHVDyrGDjssxxv6g1UOg_6tpuzV_j';

export const supabase = createClient(supabaseUrl, supabaseKey);
