// src/app/api/generate-title/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_NAME = "gemini-1.5-flash-latest";
const API_KEY = process.env.GOOGLE_API_KEY || "";

export async function POST(req: Request) {
  try {
    const { storyText } = await req.json();

    if (!storyText) {
      return NextResponse.json({ error: 'Hikaye metni gerekli.' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    
    // Yapay zekaya özel olarak başlık üretme talimatı veriyoruz
    const prompt = `Aşağıdaki hikaye paragrafı için 4 kelimeyi geçmeyen, kısa ve ilgi çekici bir başlık oluştur:\n\n"${storyText}"`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    let title = response.text().trim().replace(/"/g, ''); // Tırnak işaretlerini temizle

    return NextResponse.json({ title });

  } catch (error) {
    console.error("Başlık üretilirken hata:", error);
    return NextResponse.json({ error: 'Başlık üretilirken bir hata oluştu.' }, { status: 500 });
  }
}