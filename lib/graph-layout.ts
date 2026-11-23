"use client";

import { useMemo } from "react";
import dagre from "dagre";
import type { Node, Edge } from "reactflow";
import type { ParseResult, ParsedFile, ImportEdge } from "@/lib/parse-result";

export interface GraphNodeData {
    id: string;
    label: string;
    folder: string;
    color: string;
    fileCount?: number;
    fanIn: number;
    fanOut: number;
    files?: Array<{ path: string; fanIn: number; fanOut: number }>;
    expanded?: boolean;
}

export interface GraphData {
    nodes: Array<{ id: string; data: GraphNodeData }>;
    edges: Array<{ from: string; to: string }>;
}

const CATEGORY_COLORS = [
    "#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00",
    "#ffff33", "#a65628", "#f781bf", "#999999", "#66c2a5",
    "#fc8d62", "#8da0cb", "#e78ac3", "#a6d854", "#ffd92f",
];

function getFolderColor(folder: string): string {
    let hash = 0;
    for (let i = 0; i < folder.length; i++) {
        hash = ((hash << 5) - hash) + folder.charCodeAt(i);
        hash |= 0;
    }
    return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length];
}

function getFolderName(filePath: string): string {
    const parts = filePath.split("/");
    if (parts.length <= 1) return "root";
    return parts.slice(0, -1).join("/");
}

function buildFolderTree(files: ParsedFile[]): Map<string, Set<string>> {
    const folderMap = new Map<string, Set<string>>();

    for (const file of files) {
        const folder = getFolderName(file.relativePath);
        if (!folderMap.has(folder)) {
            folderMap.set(folder, new Set());
        }
        folderMap.get(folder)!.add(file.relativePath);
    }

    return folderMap;
}

function computeFolding(
    folderMap: Map<string, Set<string>>,
    maxNodes: number = 24,
    minFilesPerNode: number = 2
): Map<string, string> {
    // Build folder hierarchy
    const folders = Array.from(folderMap.keys()).sort((a, b) => {
        const depthA = a === "root" ? 0 : a.split("/").length;
        const depthB = b === "root" ? 0 : b.split("/").length;
        return depthB - depthA; // Deepest first
    });

    // Start with each folder as its own node
    const folderToNode = new Map<string, string>();
    for (const folder of folders) {
        folderToNode.set(folder, folder);
    }

    // Merge small folders into parents, working from deepest
    let threshold = minFilesPerNode;
    let nodeCount = folders.length;

    while (nodeCount > maxNodes && threshold <= 10) {
        const merged = new Set<string>();

        for (const folder of folders) {
            if (merged.has(folder)) continue;
            if (folder === "root") continue;

            const currentNode = folderToNode.get(folder);
            if (!currentNode) continue;

            const filesInNode = folderMap.get(currentNode) || new Set();
            if (filesInNode.size < threshold) {
                // Find parent
                const parts = folder.split("/");
                if (parts.length > 1) {
                    parts.pop();
                    const parent = parts.join("/") || "root";
                    const parentNode = folderToNode.get(parent) || parent;

                    // Merge into parent
                    if (parentNode !== currentNode) {
                        const parentFiles = folderMap.get(parentNode) || new Set();
                        for (const f of filesInNode) {
                            parentFiles.add(f);
                        }
                        folderMap.set(parentNode, parentFiles);
                        folderMap.delete(currentNode);
                        folderToNode.set(folder, parentNode);
                        merged.add(folder);
                    }
                }
            }
        }

        // Recount unique nodes
        const uniqueNodes = new Set(folderToNode.values());
        nodeCount = uniqueNodes.size;

        if (merged.size === 0) {
            threshold++;
        }
    }

    // Ensure we don't exceed maxNodes by raising threshold further
    while (nodeCount > maxNodes && threshold <= 20) {
        threshold++;
        const merged = new Set<string>();

        for (const folder of folders) {
            if (merged.has(folder)) continue;
            if (folder === "root") continue;

            const currentNode = folderToNode.get(folder);
            if (!currentNode) continue;

            const filesInNode = folderMap.get(currentNode) || new Set();
            if (filesInNode.size < threshold) {
                const parts = folder.split("/");
                if (parts.length > 1) {
                    parts.pop();
                    const parent = parts.join("/") || "root";
                    const parentNode = folderToNode.get(parent) || parent;

                    if (parentNode !== currentNode) {
                        const parentFiles = folderMap.get(parentNode) || new Set();
                        for (const f of filesInNode) {
                            parentFiles.add(f);
                        }
                        folderMap.set(parentNode, parentFiles);
                        folderMap.delete(currentNode);
                        folderToNode.set(folder, parentNode);
                        merged.add(folder);
                    }
                }
            }
        }

        const uniqueNodes = new Set(folderToNode.values());
        nodeCount = uniqueNodes.size;

        if (merged.size === 0) break;
    }

    return folderToNode;
}

function buildGraphNodes(
    files: ParsedFile[],
    edges: ImportEdge[],
    fanIn: Record<string, number>,
    fanOut: Record<string, number>,
    folderToNode: Map<string, string>,
    expandedFolders: Set<string>
): Array<{ id: string; data: GraphNodeData }> {
    const nodeFiles = new Map<string, ParsedFile[]>();

    // Group files by their assigned node
    for (const file of files) {
        const folder = getFolderName(file.relativePath);
        const nodeId = folderToNode.get(folder) || folder;

        if (!nodeFiles.has(nodeId)) {
            nodeFiles.set(nodeId, []);
        }
        nodeFiles.get(nodeId)!.push(file);
    }

    const nodes: Array<{ id: string; data: GraphNodeData }> = [];

    for (const [nodeId, fileList] of nodeFiles.entries()) {
        const isExpanded = expandedFolders.has(nodeId);
        const folder = fileList[0] ? getFolderName(fileList[0].relativePath) : "root";
        const color = getFolderColor(nodeId);

        if (isExpanded && fileList.length > 1) {
            // Expanded: create a panel node with file rows inside
            const fileRows = fileList.map(f => ({
                path: f.relativePath,
                fanIn: fanIn[f.relativePath] || 0,
                fanOut: fanOut[f.relativePath] || 0,
            }));

            nodes.push({
                id: nodeId,
                data: {
                    id: nodeId,
                    label: folder === "root" ? "(root)" : folder.split("/").pop() || folder,
                    folder: nodeId,
                    color,
                    fileCount: fileList.length,
                    fanIn: fileList.reduce((sum, f) => sum + (fanIn[f.relativePath] || 0), 0),
                    fanOut: fileList.reduce((sum, f) => sum + (fanOut[f.relativePath] || 0), 0),
                    files: fileRows,
                    expanded: true,
                },
            });
        } else {
            // Collapsed: single node
            nodes.push({
                id: nodeId,
                data: {
                    id: nodeId,
                    label: folder === "root" ? "(root)" : folder.split("/").pop() || folder,
                    folder: nodeId,
                    color,
                    fileCount: fileList.length,
                    fanIn: fileList.reduce((sum, f) => sum + (fanIn[f.relativePath] || 0), 0),
                    fanOut: fileList.reduce((sum, f) => sum + (fanOut[f.relativePath] || 0), 0),
                    expanded: false,
                },
            });
        }
    }

    return nodes;
}

function buildGraphEdges(
    edges: ImportEdge[],
    folderToNode: Map<string, string>,
    expandedFolders: Set<string>,
    nodes: Array<{ id: string; data: GraphNodeData }>
): Array<{ from: string; to: string }> {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const edgeSet = new Set<string>();
    const result: Array<{ from: string; to: string }> = [];

    for (const edge of edges) {
        if (!edge.resolved) continue;

        const fromFolder = getFolderName(edge.from);
        const toFolder = getFolderName(edge.to);

        const fromNode = folderToNode.get(fromFolder) || fromFolder;
        const toNode = folderToNode.get(toFolder) || toFolder;

        if (fromNode === toNode) continue; // Internal edge

        const fromExpanded = expandedFolders.has(fromNode);
        const toExpanded = expandedFolders.has(toNode);
        const fromNodeData = nodeMap.get(fromNode);
        const toNodeData = nodeMap.get(toNode);

        let sourceId = fromNode;
        let targetId = toNode;

        // If source is expanded, edge connects to the file row
        if (fromExpanded && fromNodeData?.data.files) {
            const file = fromNodeData.data.files.find(f => f.path === edge.from);
            if (file) {
                sourceId = `${fromNode}::${edge.from}`;
            }
        }

        // If target is expanded, edge connects to the file row
        if (toExpanded && toNodeData?.data.files) {
            const file = toNodeData.data.files.find(f => f.path === edge.to);
            if (file) {
                targetId = `${toNode}::${edge.to}`;
            }
        }

        const edgeKey = `${sourceId}->${targetId}`;
        if (!edgeSet.has(edgeKey)) {
            edgeSet.add(edgeKey);
            result.push({ from: sourceId, to: targetId });
        }
    }

    return result;
}

function applyDagreLayout(
    nodes: Array<{ id: string; data: GraphNodeData }>,
    edges: Array<{ from: string; to: string }>
): { nodes: Node[]; edges: Edge[] } {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: "LR", nodesep: 50, ranksep: 80, edgesep: 20 });
    g.setDefaultEdgeLabel(() => ({}));

    // Add nodes with estimated dimensions
    for (const node of nodes) {
        const data = node.data;
        const width = Math.max(120, (data.label.length * 7) + 40);
        const height = data.expanded && data.files
            ? Math.min(400, 60 + data.files.length * 28)
            : 40;
        g.setNode(node.id, { width, height });
    }

    // Add edges
    for (const edge of edges) {
        if (g.hasNode(edge.from) && g.hasNode(edge.to)) {
            g.setEdge(edge.from, edge.to);
        }
    }

    dagre.layout(g);

    // Build React Flow nodes
    const rfNodes: Node[] = nodes.map(node => {
        const dagreNode = g.node(node.id);
        return {
            id: node.id,
            type: "custom",
            position: { x: dagreNode.x - (dagreNode.width / 2), y: dagreNode.y - (dagreNode.height / 2) },
            data: node.data,
            draggable: false,
            selectable: false,
        };
    });

    // Build React Flow edges
    const rfEdges: Edge[] = edges.map((edge, i) => ({
        id: `edge-${i}`,
        source: edge.from,
        target: edge.to,
        type: "smoothstep" as const,
        style: { stroke: "#888", strokeWidth: 1 },
        markerEnd: "arrowclosed",
    }));

    return { nodes: rfNodes, edges: rfEdges };
}

export function useGraphLayout(graphData: GraphData, expandedFolders: Set<string> = new Set()) {
    return useMemo(() => {
        return applyDagreLayout(graphData.nodes, graphData.edges);
    }, [graphData.nodes, graphData.edges, expandedFolders]);
}

export function useParseResult(parseResult: ParseResult, expandedFolders: Set<string> = new Set()): GraphData {
    return useMemo(() => {
        const folderMap = buildFolderTree(parseResult.files);
        const folderToNode = computeFolding(folderMap);
        const nodes = buildGraphNodes(
            parseResult.files,
            parseResult.edges,
            parseResult.fanIn,
            parseResult.fanOut,
            folderToNode,
            expandedFolders
        );
        const edges = buildGraphEdges(
            parseResult.edges,
            folderToNode,
            expandedFolders,
            nodes
        );

        return { nodes, edges };
    }, [parseResult, expandedFolders]);
}

