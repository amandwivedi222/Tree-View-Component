import { useEffect, useState } from 'react';
import { supabase, TreeNode as TreeNodeType } from '../lib/supabase';
import { TreeNode } from './TreeNode';
import { Loader2 } from 'lucide-react';

const COLORS = [
  '#3b82f6',
  '#84cc16',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
];

const AVATARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function TreeView() {
  const [nodes, setNodes] = useState<TreeNodeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedNode, setDraggedNode] = useState<TreeNodeType | null>(null);

  useEffect(() => {
    loadRootNodes();
  }, []);

  const loadRootNodes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tree_nodes')
      .select('*')
      .is('parent_id', null)
      .order('order_index');

    if (!error && data) {
      const nodesWithChildren = await Promise.all(
        data.map(async (node) => {
          if (node.is_expanded) {
            const children = await loadChildren(node.id);
            return { ...node, children };
          }
          return node;
        })
      );
      setNodes(nodesWithChildren);
    }
    setLoading(false);
  };

  const loadChildren = async (parentId: string): Promise<TreeNodeType[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const { data, error } = await supabase
      .from('tree_nodes')
      .select('*')
      .eq('parent_id', parentId)
      .order('order_index');

    if (error || !data) return [];

    return Promise.all(
      data.map(async (node) => {
        if (node.is_expanded) {
          const children = await loadChildren(node.id);
          return { ...node, children };
        }
        return node;
      })
    );
  };

  const handleToggle = async (nodeId: string) => {
    const toggleNodeRecursive = async (
      nodes: TreeNodeType[]
    ): Promise<TreeNodeType[]> => {
      return Promise.all(
        nodes.map(async (node) => {
          if (node.id === nodeId) {
            const newExpandedState = !node.is_expanded;

            await supabase
              .from('tree_nodes')
              .update({ is_expanded: newExpandedState })
              .eq('id', nodeId);

            if (newExpandedState && !node.children) {
              const children = await loadChildren(nodeId);
              return { ...node, is_expanded: newExpandedState, children };
            }

            return { ...node, is_expanded: newExpandedState };
          }

          if (node.children) {
            const updatedChildren = await toggleNodeRecursive(node.children);
            return { ...node, children: updatedChildren };
          }

          return node;
        })
      );
    };

    const updatedNodes = await toggleNodeRecursive(nodes);
    setNodes(updatedNodes);
  };

  const handleAdd = async (parentId: string) => {
    const { data: parentNode } = await supabase
      .from('tree_nodes')
      .select('*')
      .eq('id', parentId)
      .single();

    const { data: siblings } = await supabase
      .from('tree_nodes')
      .select('*')
      .eq('parent_id', parentId)
      .order('order_index', { ascending: false })
      .limit(1);

    const nextOrderIndex = siblings && siblings.length > 0
      ? siblings[0].order_index + 1
      : 0;

    let nextAvatar = 'A';
    let nextColor = COLORS[0];

    if (parentNode) {
      const parentAvatarCode = parentNode.avatar.charCodeAt(0);
      const nextAvatarCode = parentAvatarCode + 1;

      if (nextAvatarCode <= AVATARS.charCodeAt(AVATARS.length - 1)) {
        nextAvatar = String.fromCharCode(nextAvatarCode);
      }

      const colorIndex = COLORS.indexOf(parentNode.color);
      if (colorIndex !== -1 && colorIndex + 1 < COLORS.length) {
        nextColor = COLORS[colorIndex + 1];
      } else {
        nextColor = COLORS[0];
      }
    }

    const { data, error } = await supabase
      .from('tree_nodes')
      .insert({
        name: 'Level A',
        avatar: nextAvatar,
        color: nextColor,
        parent_id: parentId,
        order_index: nextOrderIndex,
        has_children: false,
        is_expanded: false,
      })
      .select()
      .single();

    if (!error && data) {
      await supabase
        .from('tree_nodes')
        .update({ has_children: true })
        .eq('id', parentId);

      const addNodeRecursive = (nodes: TreeNodeType[]): TreeNodeType[] => {
        return nodes.map((node) => {
          if (node.id === parentId) {
            const updatedNode = {
              ...node,
              has_children: true,
              is_expanded: true,
              children: [...(node.children || []), data]
            };
            return updatedNode;
          }

          if (node.children) {
            return { ...node, children: addNodeRecursive(node.children) };
          }

          return node;
        });
      };

      const updatedNodes = addNodeRecursive(nodes);
      setNodes(updatedNodes);
    }
  };

  const handleEdit = async (nodeId: string, newName: string) => {
    const { error } = await supabase
      .from('tree_nodes')
      .update({ name: newName })
      .eq('id', nodeId);

    if (!error) {
      const editNodeRecursive = (nodes: TreeNodeType[]): TreeNodeType[] => {
        return nodes.map((node) => {
          if (node.id === nodeId) {
            return { ...node, name: newName };
          }

          if (node.children) {
            return { ...node, children: editNodeRecursive(node.children) };
          }

          return node;
        });
      };

      setNodes(editNodeRecursive(nodes));
    }
  };

  const handleDelete = async (nodeId: string) => {
    if (!confirm('Are you sure you want to delete this node and all its children?')) {
      return;
    }

    const { error } = await supabase
      .from('tree_nodes')
      .delete()
      .eq('id', nodeId);

    if (!error) {
      const deleteNodeRecursive = (nodes: TreeNodeType[]): TreeNodeType[] => {
        return nodes
          .filter((node) => node.id !== nodeId)
          .map((node) => {
            if (node.children) {
              const updatedChildren = deleteNodeRecursive(node.children);
              return {
                ...node,
                children: updatedChildren,
                has_children: updatedChildren.length > 0,
              };
            }
            return node;
          });
      };

      const updatedNodes = deleteNodeRecursive(nodes);
      setNodes(updatedNodes);

      const parentNodes = await findParentNodes(nodeId);
      for (const parentNode of parentNodes) {
        const { data: remainingChildren } = await supabase
          .from('tree_nodes')
          .select('id')
          .eq('parent_id', parentNode.id);

        if (!remainingChildren || remainingChildren.length === 0) {
          await supabase
            .from('tree_nodes')
            .update({ has_children: false })
            .eq('id', parentNode.id);
        }
      }
    }
  };

  const findParentNodes = async (nodeId: string): Promise<TreeNodeType[]> => {
    const { data } = await supabase
      .from('tree_nodes')
      .select('*')
      .eq('id', nodeId)
      .single();

    if (!data || !data.parent_id) return [];

    const { data: parent } = await supabase
      .from('tree_nodes')
      .select('*')
      .eq('id', data.parent_id)
      .single();

    return parent ? [parent] : [];
  };

  const handleDragStart = (node: TreeNodeType) => {
    setDraggedNode(node);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetNode: TreeNodeType) => {
    if (!draggedNode || draggedNode.id === targetNode.id) {
      return;
    }

    if (isDescendant(draggedNode, targetNode.id)) {
      alert('Cannot move a node to its own descendant');
      setDraggedNode(null);
      return;
    }

    const { data: targetChildren } = await supabase
      .from('tree_nodes')
      .select('order_index')
      .eq('parent_id', targetNode.id)
      .order('order_index', { ascending: false })
      .limit(1);

    const nextOrderIndex = targetChildren && targetChildren.length > 0
      ? targetChildren[0].order_index + 1
      : 0;

    const { error } = await supabase
      .from('tree_nodes')
      .update({
        parent_id: targetNode.id,
        order_index: nextOrderIndex,
      })
      .eq('id', draggedNode.id);

    if (!error) {
      await supabase
        .from('tree_nodes')
        .update({ has_children: true })
        .eq('id', targetNode.id);

      await loadRootNodes();
    }

    setDraggedNode(null);
  };

  const isDescendant = (node: TreeNodeType, targetId: string): boolean => {
    if (node.id === targetId) return true;
    if (!node.children) return false;
    return node.children.some((child) => isDescendant(child, targetId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Tree View Component</h1>
        <div className="space-y-1">
          {nodes.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              onToggle={handleToggle}
              onAdd={handleAdd}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              level={0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
