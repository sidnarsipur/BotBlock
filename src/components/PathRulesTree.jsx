import React, { useState, useMemo } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  File, 
  Check, 
  X, 
  Minus,
  CornerDownRight
} from 'lucide-react';

// Helper to build tree from flat paths
const buildPathTree = (paths) => {
  const root = { children: {} };

  // Sort paths to ensure parents are processed before children if possible, 
  // but the logic handles any order.
  paths.forEach(path => {
    const cleanPath = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
    if (!cleanPath || cleanPath === '/') return;

    const parts = cleanPath.split('/').filter(Boolean);
    let current = root;

    parts.forEach((part, index) => {
      if (!current.children[part]) {
        current.children[part] = {
          segment: part,
          fullPath: '/' + parts.slice(0, index + 1).join('/'),
          children: {},
          isExplicit: false // True if this path was in the original list
        };
      }
      current = current.children[part];
      if (index === parts.length - 1) {
        current.isExplicit = true;
      }
    });
  });

  function toArray(node) {
    return Object.values(node.children).map(child => ({
      ...child,
      children: toArray(child)
    })).sort((a, b) => a.segment.localeCompare(b.segment));
  }

  return toArray(root);
};

// Helper to determine effective status based on parent rules
const getEffectiveStatus = (fullPath, rules) => {
  if (rules[fullPath]) return { status: rules[fullPath], source: 'explicit' };

  // Check root rule first
  if (rules['/']) return { status: rules['/'], source: 'inherited' };

  const parts = fullPath.split('/').filter(Boolean);
  // Check from longest parent down to root
  for (let i = parts.length - 1; i >= 0; i--) {
    const parentPath = '/' + parts.slice(0, i + 1).join('/');
    if (rules[parentPath]) {
      return { status: rules[parentPath], source: 'inherited' };
    }
  }
  
  return { status: 'allow', source: 'default' };
};

const PathNode = ({ node, rules, onToggleRule, depth = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed
  const hasChildren = node.children.length > 0;
  
  const currentRule = rules[node.fullPath];
  const { status: effectiveStatus, source } = getEffectiveStatus(node.fullPath, rules);
  
  const isBlocked = effectiveStatus === 'block';
  const isInheritedAllow = !currentRule && effectiveStatus === 'allow' && source === 'inherited';
  const isInheritedBlock = !currentRule && effectiveStatus === 'block' && source === 'inherited';
  
  // Visual styles based on state
  const rowBg = currentRule === 'block' ? 'bg-red-50/80 dark:bg-red-900/20 border-red-100 dark:border-red-900/30' : 
                currentRule === 'allow' ? 'bg-emerald-50/80 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30' : 
                isInheritedAllow ? 'bg-emerald-50/30 dark:bg-emerald-900/10 border-emerald-50/50 dark:border-emerald-900/10' :
                'hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent';
                
  const textStyle = currentRule === 'block' ? 'text-red-700 dark:text-red-400 font-medium' :
                    currentRule === 'allow' ? 'text-emerald-700 dark:text-emerald-400 font-medium' :
                    isBlocked ? 'text-red-400/70 dark:text-red-400/50' : // Inherited block
                    isInheritedAllow ? 'text-emerald-600/70 dark:text-emerald-400/70' :
                    'text-slate-600 dark:text-slate-400';

  return (
    <div className="select-none">
      <div 
        className={`
          flex items-center justify-between py-2 px-3 rounded-lg mb-1 border transition-all duration-200 group
          ${rowBg}
        `}
        style={{ marginLeft: `${depth * 24}px` }}
      >
        <div className="flex items-center flex-1 min-w-0 cursor-pointer" onClick={() => hasChildren && setIsExpanded(!isExpanded)}>
          {/* Expand Toggle */}
          <div className={`mr-1 p-1 rounded-md text-slate-400 dark:text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors ${!hasChildren && 'invisible'}`}>
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>

          {/* Icon */}
          <div className={`mr-3 ${currentRule ? (currentRule === 'block' ? 'text-red-500 dark:text-red-400' : 'text-emerald-500 dark:text-emerald-400') : 'text-slate-400 dark:text-slate-500'}`}>
            {hasChildren ? <Folder className="w-4 h-4" /> : <File className="w-4 h-4" />}
          </div>

          {/* Path Segment */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center">
                <span className={`text-sm truncate ${textStyle}`}>
                /{node.segment}
                </span>
                {source === 'inherited' && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded border border-slate-200 dark:border-slate-700 flex items-center">
                        <CornerDownRight className="w-3 h-3 mr-1" />
                        {isBlocked ? 'Blocked by parent' : 'Allowed by parent'}
                    </span>
                )}
            </div>
            {/* Full path hint on hover or if needed */}
            {/* <span className="text-[10px] text-slate-300 hidden group-hover:block">{node.fullPath}</span> */}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onToggleRule(node.fullPath, 'allow')}
            disabled={isInheritedAllow}
            className={`
              p-1.5 rounded-md transition-all
              ${currentRule === 'allow' 
                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 shadow-sm ring-1 ring-emerald-200 dark:ring-emerald-900/50' 
                : isInheritedAllow
                  ? 'opacity-30 cursor-not-allowed text-slate-300 dark:text-slate-600'
                  : 'text-slate-400 dark:text-slate-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400'}
            `}
            title={isInheritedAllow ? "Allowed by parent" : "Allow Path"}
          >
            <Check className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => onToggleRule(node.fullPath, 'block')}
            disabled={isInheritedBlock}
            className={`
              p-1.5 rounded-md transition-all
              ${currentRule === 'block' 
                ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 shadow-sm ring-1 ring-red-200 dark:ring-red-900/50' 
                : isInheritedBlock
                  ? 'opacity-30 cursor-not-allowed text-slate-300 dark:text-slate-600'
                  : 'text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400'}
            `}
            title={isInheritedBlock ? "Blocked by parent" : "Block Path"}
          >
            <X className="w-4 h-4" />
          </button>

          {currentRule && (
            <button
                onClick={() => onToggleRule(node.fullPath, null)}
                className="p-1.5 rounded-md text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-all"
                title="Clear Rule"
            >
                <Minus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="relative">
            {/* Vertical guide line */}
            <div 
                className="absolute left-0 top-0 bottom-0 border-l border-slate-200/50 dark:border-slate-700/50" 
                style={{ left: `${(depth * 24) + 27}px` }} 
            />
            {node.children.map(child => (
                <PathNode 
                key={child.fullPath} 
                node={child} 
                rules={rules} 
                onToggleRule={onToggleRule} 
                depth={depth + 1} 
                />
            ))}
        </div>
      )}
    </div>
  );
};

export default function PathRulesTree({ paths, rules, onToggleRule }) {
  const treeData = useMemo(() => buildPathTree(paths), [paths]);

  if (paths.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-slate-500">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-full mb-3">
                <Folder className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <p>No paths detected yet.</p>
        </div>
    );
  }

  return (
    <div className="py-2">
      {treeData.map(node => (
        <PathNode 
          key={node.fullPath} 
          node={node} 
          rules={rules} 
          onToggleRule={onToggleRule} 
        />
      ))}
    </div>
  );
}
