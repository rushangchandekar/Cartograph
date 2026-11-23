"use client";

import { useState, useMemo } from "react";
import { ReactFlow, Background, Controls, MiniMap, type Node } from "reactflow";
import "reactflow/dist/style.css";
import { CanvasLeftRail } from "./canvas-left-rail";
import { CanvasRightPane } from "./canvas-right-pane";
import { FolderPanelNode } from "./canvas-nodes/FolderPanelNode";
import { useGraphLayout, type GraphData } from "@/lib/graph-layout";
import { useParseResult } from "@/lib/use-parse-result";
import type { ParseResult } from "@/lib/parse-result";

const nodeTypes = {
    custom: FolderPanelNode,
};

export function CanvasShell({ parseResult }: { parseResult: ParseResult }) {
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const graphData = useParseResult(parseResult, expandedFolders);
    const layout = useGraphLayout(graphData, expandedFolders);

    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    const handleNodeClick = (event: React.MouseEvent, node: Node) => {
        event.stopPropagation();
        const folder = node.data?.folder;
        if (folder) {
            setExpandedFolders(prev => {
                const next = new Set(prev);
                if (next.has(folder)) {
                    next.delete(folder);
                } else {
                    next.add(folder);
                }
                return next;
            });
        }
        setSelectedNodeId(node.id);
    };

    const handlePaneClick = () => {
        setSelectedNodeId(null);
    };

    return (
        <div className="flex h-full w-full overflow-hidden bg-zinc-50 dark:bg-zinc-950" onClick={handlePaneClick}>
            {/* Left Rail - Categories */}
            <CanvasLeftRail
                graphData={graphData}
                expandedFolders={expandedFolders}
                onToggleFolder={(folder) => {
                    setExpandedFolders(prev => {
                        const next = new Set(prev);
                        if (next.has(folder)) next.delete(folder);
                        else next.add(folder);
                        return next;
                    });
                }}
            />

            {/* Center - Canvas */}
            <div className="flex-1 flex h-full w-full relative min-w-0">
                <ReactFlow
                    nodes={layout.nodes}
                    edges={layout.edges}
                    nodeTypes={nodeTypes}
                    onNodeClick={handleNodeClick}
                    onClick={handlePaneClick}
                    fitView={false}
                    nodesDraggable={false}
                    elementsSelectable={false}
                    defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                    className="h-full w-full"
                >
                    <Background
                        color="var(--border-color)"
                        gap={16}
                        size={1}
                        style={{ opacity: 0.3 }}
                    />
                    <Controls />
                    <MiniMap
                        nodeColor={(node) => node.data?.color || "#888"}
                        maskColor="rgba(0,0,0,0.1)"
                    />
                </ReactFlow>
            </div>

            {/* Right Pane - Details */}
            <CanvasRightPane
                selectedNodeId={selectedNodeId}
                graphData={graphData}
                layout={layout}
            />
        </div>
    );
}