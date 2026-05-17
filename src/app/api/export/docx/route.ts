import { NextRequest, NextResponse } from "next/server";
import HTMLToDocx from "html-to-docx";
import { requireApiSecret } from "@/lib/api-auth";
import { MAX_DOCX_HTML_CHARS, formatCharLimit } from "@/lib/limits";

export async function POST(req: NextRequest) {
  const authError = requireApiSecret(req);
  if (authError) return authError;

  try {
    const { html, title } = await req.json();

    if (typeof html !== "string" || !html) {
      return NextResponse.json({ error: "Missing html" }, { status: 400 });
    }

    if (html.length > MAX_DOCX_HTML_CHARS) {
      return NextResponse.json(
        {
          error: `HTML payload too large. Maximum is ${formatCharLimit(MAX_DOCX_HTML_CHARS)} characters.`,
        },
        { status: 413 }
      );
    }

    const safeTitle =
      typeof title === "string" && title.trim()
        ? title.replace(/[^\w\s.-]/g, "_").slice(0, 120)
        : "action-plan";

    const docxBlob = await HTMLToDocx(html, undefined, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
    });

    return new NextResponse(docxBlob, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeTitle}.docx"`,
      },
    });
  } catch (err) {
    console.error("Docx export error:", err);
    return NextResponse.json({ error: "Failed to generate Word document" }, { status: 500 });
  }
}
