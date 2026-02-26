import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface TreeNode {
  id: string;
  name: string;
  avatar: string;
  color: string;
  parent_id: string | null;
  order_index: number;
  has_children: boolean;
  is_expanded: boolean;
  created_at: string;
  updated_at: string;
  children?: TreeNode[];
}
