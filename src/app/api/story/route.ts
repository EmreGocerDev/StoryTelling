// app/api/story/route.ts

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { supabase } from '@/lib/supabaseClient';

const MODEL_NAME = "gemini-1.5-flash-latest";
const API_KEY = process.env.GOOGLE_API_KEY || "";

// Sistem talimatı: Yapay zekanın rolünü belirliyoruz
const systemInstruction = `Sen, metin tabanlı bir macera oyununun gizemli anlatıcısısın. Görevin, oyuncunun kararlarına göre hikayeyi sürdürmektir. Asla bir yapay zeka olduğunu belli etme. "Harika fikir!", "Elbette" gibi ifadeler kullanma. Sadece hikayeyi anlat. Anlatımın ikinci tekil şahıs ağzından olsun ("Gidiyorsun", "Görüyorsun" gibi). Her cevabın sonunda oyuncuya ne yapacağını sorarak bitir. Hikaye karanlık ve gizemli bir tonda olsun. Oyuna başlarken ilgi çekici bir giriş yap.`;

async function runChat(history: { role: 'user' | 'model'; parts: { text: string }[] }[]) {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME, systemInstruction });

  // Güvenlik ayarları
  const generationConfig = {
    temperature: 0.9,
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048,
  };

  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    // Diğer güvenlik ayarları...
  ];
  
  const chat = model.startChat({
    generationConfig,
    safetySettings,
    history: history.slice(0, -1),
  });

  const lastMessage = history[history.length - 1];
  const result = await chat.sendMessage(lastMessage.parts[0].text);

  const response = result.response;
  return response.text();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const historyForApi = body.history.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    // --- YENİ DÜZELTME KODU BURADA ---
    // Eğer oyun yeni başlıyorsa, bu `if` bloğu çalışır.
    if (historyForApi.length === 0) {
        historyForApi.push({ role: 'user', parts: [{ text: 'Oyunu başlat.' }] });
    } 
    // Eğer konuşma geçmişi bir 'model' mesajıyla başlıyorsa, bu `else if` bloğu çalışır.
    else if (historyForApi.length > 0 && historyForApi[0].role === 'model') {
        // Gemini API'nin "ilk mesaj user olmalı" kuralını karşılamak için,
        // başına yapay zekanın ilk cevabına neden olan orijinal kullanıcı komutunu ekliyoruz.
        historyForApi.unshift({ role: 'user', parts: [{ text: 'Oyunu başlat.' }] });
    }
    // --- DÜZELTME KODU BİTTİ ---

    const responseMessage = await runChat(historyForApi);

    if (responseMessage) {
        const finalHistoryForDb = [
            ...body.history, 
            { role: 'assistant', content: responseMessage }
        ];
        
        const { error } = await supabase
          .from('games')
          .insert([{ history: finalHistoryForDb }]);

        if (error) {
          console.error('Supabase kaydetme hatası:', error.message);
        }
    }
    
    return NextResponse.json({ message: responseMessage });

  } catch (error) {
    console.error("API rotasında bir hata yakalandı:", error);
    return NextResponse.json({ error: 'Hikaye oluşturulurken bir hata oluştu.' }, { status: 500 });
  }
}