"use client";

import { useMemo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { GraphNodeData } from "@/lib/graph-layout";

interface FolderPanelNodeProps extends NodeProps<GraphNodeData> {}

export function FolderPanelNode({ data, selected }: FolderPanelNodeProps) {
    const { label, folder, color, fileCount, fanIn, fanOut, files, expanded } = data;

    const handleStyle = useMemo(() => ({
        width: 8,
        height: 8,
        backgroundColor: color,
        border: "none",
        borderRadius: "50%",
    }), [color]);

    if (!expanded || !files || files.length === 0) {
        // Collapsed folder node
        return (
            <div
                className={`relative w-[140px] h-10 rounded border-2 flex items-center justify-between px-3 font-mono text-xs ${
                    selected
                        ? "border-zinc-900 dark:border-zinc-100 shadow-[0_0_0_2px_rgb(0,0,0)]"
                        : "border-transparent"
                }`}
                style={{ backgroundColor: color + "15", borderColor: color }}
            >
                <Handle type="source" position={Position.Right} style={handleStyle} />
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-2 h-2 rounded" style={{ backgroundColor: color }} />
                    <span className="truncate text-zinc-900 dark:text-zinc-100">{label}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                    <span>{fileCount} files</span>
                    <span>↑{fanIn}</span>
                    <span>↓{fanOut}</span>
                </div>
                <Handle type="target" position={Position.Left} style={handleStyle} />
            </div>
        );
    }

    // Expanded folder panel
    const panelHeight = Math.min(400, 50 + files.length * 26);

    return (
        <div
            className="relative"
            style={{
                width: 320,
                minHeight: panelHeight,
                maxHeight: panelHeight,
            }}
        >
            {/* Panel background */}
            <div
                className="rounded border-2 overflow-hidden"
                style={{
                    borderColor: color,
                    backgroundColor: color + "08",
                    minHeight: panelHeight,
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-3 py-2 cursor-pointer border-b"
                    style={{
                        borderColor: color + "40",
                        backgroundColor: color + "15",
                    }}
                >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-2 h-2 rounded" style={{ backgroundColor: color }} />
                        <span className="truncate text-sm font-mono text-zinc-900 dark:text-zinc-100 font-medium">
                            {label}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                        <span>{fileCount} files</span>
                        <span>↑{fanIn}</span>
                        <span>↓{fanOut}</span>
                    </div>
                </div>

                {/* File rows */}
                <div className="p-2 overflow-y-auto" style={{ maxHeight: panelHeight - 50 }}>
                    {files.slice(0, 50).map((file, index) => (
                        <FileRowNode
                            key={`${folder}::${file.path}`}
                            data={{
                                id: `${folder}::${file.path}`,
                                label: file.path.split("/").pop() || file.path,
                                folder,
                                color,
                                fanIn: file.fanIn,
                                fanOut: file.fanOut,
                            }}
                        />
                    ))}
                    {files.length > 50 && (
                        <div className="px-2 py-1 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono text-center border-t" style={{ borderColor: color + "40" }}>
                            +{files.length - 50} more files
                        </div>
                    )}
                </div>
            </div>

            {/* Connection handles on the panel */}
            <Handle type="source" position={Position.Right} style={handleStyle} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2" />
            <Handle type="target" position={Position.Left} style={handleStyle} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2" />
        </div>
    );
}

function FileRowNode({ data }: { data: GraphNodeData }) {
    const { label, fanIn, fanOut, color } = data;
    const isSelected = false; // Selection handled at panel level for now

    return (
        <div
            className={`flex items-center justify-between px-2 py-1.5 rounded text-[11px] font-mono transition-colors ${
                isSelected ? "bg-zinc-200 dark:bg-zinc-800" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
        >
            <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-1.5 h-1.5 rounded flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="truncate text-zinc-900 dark:text-zinc-100">{label}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 dark:text-zinc-400 font-mono">
                {fanIn > 0 && <span>↑{fanIn}</span>}
                {fanOut > 0 && <span>↓{fanOut}</span>}
            </div>
        </div>
    );
}