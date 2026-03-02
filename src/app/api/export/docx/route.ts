import { NextRequest, NextResponse } from "next/server";
import HTMLToDocx from "html-to-docx";

export async function POST(req: NextRequest) {
  try {
    const { html, title } = await req.json();

    const docxBlob = await HTMLToDocx(html, undefined, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
    });

    return new NextResponse(docxBlob, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${title || "action-plan"}.docx"`,
      },
    });
  } catch (err) {
    console.error("Docx export error:", err);
    return NextResponse.json({ error: "Failed to generate Word document" }, { status: 500 });
  }
}
