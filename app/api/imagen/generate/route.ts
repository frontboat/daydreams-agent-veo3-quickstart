import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompt = (body?.prompt as string) || "";
    const model = (body?.model as string) || "imagen-4.0-fast-generate-001";
    const numberOfImages = body?.numberOfImages || 1;
    const aspectRatio = body?.aspectRatio || "1:1";

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const resp = await ai.models.generateImages({
      model,
      prompt,
      config: {
        aspectRatio,
        numberOfImages,
      },
    });

    // Handle multiple images
    const images = resp.generatedImages?.map(img => ({
      imageBytes: img.image?.imageBytes,
      mimeType: img.image?.mimeType || "image/png",
    })).filter(img => img.imageBytes);

    if (!images || images.length === 0) {
      return NextResponse.json({ error: "No images returned" }, { status: 500 });
    }

    // Return multiple images if generated, or single for backward compatibility
    return NextResponse.json({
      images,
      // Keep backward compatibility
      image: images[0],
    });
  } catch (error) {
    console.error("Error generating image:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
