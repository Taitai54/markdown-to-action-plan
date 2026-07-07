import { NextRequest, NextResponse } from "next/server";
import { YoutubeTranscript } from "@danielxceron/youtube-transcript";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    const videoIdMatch = (url as string).match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    if (!videoIdMatch) {
      return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
    }

    const videoId = videoIdMatch[1];

    // Fetch human-friendly title via YouTube OEmbed
    let title = `YouTube Video (${videoId})`;
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        if (oembedData.title) title = oembedData.title as string;
      }
    } catch {
      // ignore — fall back to ID-based title
    }

    const segments = await YoutubeTranscript.fetchTranscript(videoId);
    const transcript = segments.map((s) => s.text).join(" ");

    return NextResponse.json({ title, transcript });
  } catch (err) {
    console.error("Transcript fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch transcript" }, { status: 500 });
  }
}
