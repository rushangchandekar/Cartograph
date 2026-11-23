"use client";

import { useMemo } from "react";
import type { GraphData } from "@/lib/graph-layout";
import type { Node, Edge } from "reactflow";

interface CanvasRightPaneProps {
    selectedNodeId: string | null;
    graphData: GraphData;
    layout: { nodes: Node[]; edges: Edge[] };
}

export function CanvasRightPane({ selectedNodeId, graphData, layout }: CanvasRightPaneProps) {
    const selectedNode = useMemo(() => {
        if (!selectedNodeId) return null;
        return layout.nodes.find(n => n.id === selectedNodeId) || null;
    }, [selectedNodeId, layout.nodes]);

    const connectedEdges = useMemo(() => {
        if (!selectedNode) return { incoming: [] as Edge[], outgoing: [] as Edge[] };
        return {
            incoming: layout.edges.filter(e => e.target === selectedNode.id),
            outgoing: layout.edges.filter(e => e.source === selectedNode.id),
        };
    }, [selectedNode, layout.edges]);

    if (!selectedNode) {
        return (
            <div className="w-72 flex-shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 overflow-y-auto">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">
                    Click a node to inspect
                </p>
            </div>
        );
    }

    const isFolder = !!selectedNode.data.folder;
    const data = selectedNode.data;

    return (
        <div className="w-72 flex-shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 overflow-y-auto">
            <div className="space-y-4">
                <div>
                    <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 font-mono">
                        {isFolder ? "Folder" : "File"}
                    </h3>
                    <div className="flex items-center gap-2">
                        <span
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: data.color || "#888" }}
                        />
                        <span className="text-sm font-mono text-zinc-900 dark:text-zinc-100 truncate">
                            {data.label}
                        </span>
                    </div>
                    {data.folder && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-1">
                            {data.folder}
                        </p>
                    )}
                </div>

                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-3">
                    <div>
                        <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 font-mono">
                            Stats
                        </h4>
                        <dl className="space-y-1 text-xs font-mono">
                            <div className="flex justify-between">
                                <dt className="text-zinc-500 dark:text-zinc-400">Files</dt>
                                <dd className="text-zinc-900 dark:text-zinc-100">{data.fileCount ?? 1}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-zinc-500 dark:text-zinc-400">Fan-in</dt>
                                <dd className="text-zinc-900 dark:text-zinc-100">{data.fanIn ?? 0}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-zinc-500 dark:text-zinc-400">Fan-out</dt>
                                <dd className="text-zinc-900 dark:text-zinc-100">{data.fanOut ?? 0}</dd>
                            </div>
                        </dl>
                    </div>

                    {connectedEdges.incoming.length > 0 && (
                        <div>
                            <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 font-mono">
                                Imports ({connectedEdges.incoming.length})
                            </h4>
                            <ul className="space-y-1 max-h-40 overflow-y-auto">
                                {connectedEdges.incoming.slice(0, 20).map((edge) => (
                                    <li key={edge.id} className="text-xs text-zinc-600 dark:text-zinc-300 font-mono truncate">
                                        {edge.sourceHandle || edge.source} →
                                    </li>
                                ))}
                                {connectedEdges.incoming.length > 20 && (
                                    <li className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                                        +{connectedEdges.incoming.length - 20} more
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}

                    {connectedEdges.outgoing.length > 0 && (
                        <div>
                            <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 font-mono">
                                Imported by ({connectedEdges.outgoing.length})
                            </h4>
                            <ul className="space-y-1 max-h-40 overflow-y-auto">
                                {connectedEdges.outgoing.slice(0, 20).map((edge) => (
                                    <li key={edge.id} className="text-xs text-zinc-600 dark:text-zinc-300 font-mono truncate">
                                        → {edge.targetHandle || edge.target}
                                    </li>
                                ))}
                                {connectedEdges.outgoing.length > 20 && (
                                    <li className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                                        +{connectedEdges.outgoing.length - 20} more
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}