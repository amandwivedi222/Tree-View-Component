/*
  # Create Tree Nodes Table

  1. New Tables
    - `tree_nodes`
      - `id` (uuid, primary key) - Unique identifier for each node
      - `name` (text) - Display name of the node
      - `avatar` (text) - Letter/identifier for the node badge
      - `color` (text) - Color for the node badge
      - `parent_id` (uuid, nullable) - Reference to parent node (null for root)
      - `order_index` (integer) - Position among siblings
      - `has_children` (boolean) - Flag for lazy loading
      - `is_expanded` (boolean) - Expansion state
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `tree_nodes` table
    - Add policies for public access (demo purposes)

  3. Indexes
    - Index on parent_id for faster queries
    - Index on order_index for sorting
*/

CREATE TABLE IF NOT EXISTS tree_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  avatar text NOT NULL DEFAULT 'A',
  color text NOT NULL DEFAULT '#3b82f6',
  parent_id uuid REFERENCES tree_nodes(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  has_children boolean DEFAULT false,
  is_expanded boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tree_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tree nodes"
  ON tree_nodes FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert tree nodes"
  ON tree_nodes FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update tree nodes"
  ON tree_nodes FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete tree nodes"
  ON tree_nodes FOR DELETE
  TO anon
  USING (true);

CREATE INDEX IF NOT EXISTS idx_tree_nodes_parent_id ON tree_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_tree_nodes_order_index ON tree_nodes(order_index);

-- Insert sample data
INSERT INTO tree_nodes (name, avatar, color, parent_id, order_index, has_children, is_expanded) VALUES
  ('Level A', 'A', '#3b82f6', NULL, 0, true, true);

DO $$
DECLARE
  root_id uuid;
  node_b_id uuid;
  node_c_id uuid;
BEGIN
  SELECT id INTO root_id FROM tree_nodes WHERE avatar = 'A' AND parent_id IS NULL;
  
  INSERT INTO tree_nodes (name, avatar, color, parent_id, order_index, has_children, is_expanded)
  VALUES ('Level A', 'B', '#84cc16', root_id, 0, true, false)
  RETURNING id INTO node_b_id;
  
  INSERT INTO tree_nodes (name, avatar, color, parent_id, order_index, has_children, is_expanded)
  VALUES ('Level A', 'B', '#84cc16', root_id, 1, false, false);
END $$;