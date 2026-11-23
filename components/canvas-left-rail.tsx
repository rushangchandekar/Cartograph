"use client";

import { useMemo } from "react";
import type { GraphData } from "@/lib/graph-layout";

interface Category {
    folder: string;
    fileCount: number;
    color: string;
    expanded: boolean;
}

interface CanvasLeftRailProps {
    graphData: GraphData;
    expandedFolders: Set<string>;
    onToggleFolder: (folder: string) => void;
}

export function CanvasLeftRail({ graphData, expandedFolders, onToggleFolder }: CanvasLeftRailProps) {
    const categories = useMemo((): Category[] => {
        const folderMap = new Map<string, { count: number; color: string }>();

        for (const node of graphData.nodes) {
            const folder = node.data.folder || "root";
            const existing = folderMap.get(folder);
            if (existing) {
                existing.count += 1;
            } else {
                folderMap.set(folder, {
                    count: 1,
                    color: node.data.color || "#888"
                });
            }
        }

        return Array.from(folderMap.entries())
            .map(([folder, { count, color }]) => ({
                folder,
                fileCount: count,
                color,
                expanded: expandedFolders.has(folder),
            }))
            .sort((a, b) => b.fileCount - a.fileCount);
    }, [graphData.nodes, expandedFolders]);

    if (categories.length === 0) {
        return (
            <div className="w-48 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-3 overflow-y-auto">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                    No categories
                </p>
            </div>
        );
    }

    return (
        <div className="w-48 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-3 overflow-y-auto">
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3 font-mono">
                Categories
            </h3>
            <div className="space-y-2">
                {categories.map((cat) => (
                    <div key={cat.folder} className="group">
                        <button
                            onClick={() => onToggleFolder(cat.folder)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                            aria-expanded={cat.expanded}
                        >
                            <span
                                className="w-3 h-3 rounded flex-shrink-0"
                                style={{ backgroundColor: cat.color }}
                            />
                            <span className="text-sm font-mono text-zinc-900 dark:text-zinc-100 truncate flex-1">
                                {cat.folder === "root" ? "(root)" : cat.folder}
                            </span>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                                {cat.fileCount}
                            </span>
                        </button>
                        {cat.expanded && (
                            <div className="ml-6 mt-1 space-y-1 border-l border-zinc-300 dark:border-zinc-700 pl-2">
                                {graphData.nodes
                                    .filter(n => n.data.folder === cat.folder)
                                    .slice(0, 10)
                                    .map((node) => (
                                        <div key={node.id} className="text-xs text-zinc-600 dark:text-zinc-300 font-mono truncate">
                                            {node.data.label}
                                        </div>
                                    ))}
                                {graphData.nodes.filter(n => n.data.folder === cat.folder).length > 10 && (
                                    <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                                        +{graphData.nodes.filter(n => n.data.folder === cat.folder).length - 10} more
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}