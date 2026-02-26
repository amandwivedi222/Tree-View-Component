import { useState } from 'react';
import { ChevronRight, ChevronDown, Plus, Trash2, Edit2 } from 'lucide-react';
import { TreeNode as TreeNodeType } from '../lib/supabase';

interface TreeNodeProps {
  node: TreeNodeType;
  onToggle: (nodeId: string) => void;
  onAdd: (parentId: string) => void;
  onDelete: (nodeId: string) => void;
  onEdit: (nodeId: string, newName: string) => void;
  onDragStart: (node: TreeNodeType) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (targetNode: TreeNodeType) => void;
  level: number;
}

export function TreeNode({
  node,
  onToggle,
  onAdd,
  onDelete,
  onEdit,
  onDragStart,
  onDragOver,
  onDrop,
  level,
}: TreeNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.name);

  const handleEdit = () => {
    if (isEditing && editValue.trim() !== node.name) {
      onEdit(node.id, editValue.trim());
    }
    setIsEditing(!isEditing);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEdit();
    } else if (e.key === 'Escape') {
      setEditValue(node.name);
      setIsEditing(false);
    }
  };

  return (
    <div className="relative">
      <div
        className="flex items-center gap-2 py-2 px-3 hover:bg-gray-50 rounded-lg cursor-move transition-colors"
        draggable
        onDragStart={() => onDragStart(node)}
        onDragOver={onDragOver}
        onDrop={() => onDrop(node)}
        style={{ paddingLeft: `${level * 40 + 12}px` }}
      >
        {node.has_children && (
          <button
            onClick={() => onToggle(node.id)}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
          >
            {node.is_expanded ? (
              <ChevronDown size={16} className="text-gray-600" />
            ) : (
              <ChevronRight size={16} className="text-gray-600" />
            )}
          </button>
        )}
        {!node.has_children && <div className="w-6" />}

        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shadow-md"
          style={{ backgroundColor: node.color }}
        >
          {node.avatar}
        </div>

        {isEditing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleEdit}
            onKeyDown={handleKeyDown}
            className="flex-1 px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        ) : (
          <span
            className="flex-1 text-gray-700 font-medium"
            onDoubleClick={() => setIsEditing(true)}
          >
            {node.name}
          </span>
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            title="Edit node"
          >
            <Edit2 size={14} className="text-gray-500" />
          </button>
          <button
            onClick={() => onAdd(node.id)}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            title="Add child node"
          >
            <Plus size={16} className="text-gray-500" />
          </button>
          <button
            onClick={() => onDelete(node.id)}
            className="p-1.5 hover:bg-red-100 rounded transition-colors"
            title="Delete node"
          >
            <Trash2 size={14} className="text-red-500" />
          </button>
        </div>
      </div>

      {node.is_expanded && node.children && node.children.length > 0 && (
        <div className="relative">
          <div
            className="absolute left-0 top-0 bottom-0 border-l-2 border-dotted border-gray-300"
            style={{ left: `${level * 40 + 32}px` }}
          />
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              onToggle={onToggle}
              onAdd={onAdd}
              onDelete={onDelete}
              onEdit={onEdit}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
