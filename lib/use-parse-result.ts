"use client";

import { useMemo } from "react";
import { useParseResult as useParseResultCore, useGraphLayout, type GraphData } from "@/lib/graph-layout";
import type { ParseResult } from "@/lib/parse-result";

export function useParseResult(parseResult: ParseResult, expandedFolders: Set<string> = new Set()): GraphData {
    return useParseResultCore(parseResult, expandedFolders);
}