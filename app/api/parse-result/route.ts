import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export async function GET() {
    try {
        const outputPath = path.resolve("parser/output.json");

        if (!fs.existsSync(outputPath)) {
            return NextResponse.json(
                { error: "Parse result not found. Run the parser first." },
                { status: 404 }
            );
        }

        const content = fs.readFileSync(outputPath, "utf-8");
        const data = JSON.parse(content);

        return NextResponse.json(data);
    } catch (error) {
        console.error("[api/parse-result] Error:", error);
        return NextResponse.json(
            { error: "Failed to read parse result" },
            { status: 500 }
        );
    }
}