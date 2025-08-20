// app/api/story/route.ts

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { supabase } from '@/lib/supabaseClient'; // Yolun 'src' içerdiğinden emin ol

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
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ];
  
  // Hatanın olduğu satır burasıydı. Geçmişi ve son mesajı doğru şekilde ayırarak gönderiyoruz.
  const chat = model.startChat({
    generationConfig,
    safetySettings,
    history: history.slice(0, -1), // Son kullanıcı mesajı hariç tüm geçmiş
  });

  const lastMessage = history[history.length - 1];
  const result = await chat.sendMessage(lastMessage.parts[0].text); // Sadece son mesajı gönder

  const response = result.response;
  return response.text();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Frontend'den gelen 'assistant' rolünü Gemini'nin anladığı 'model' rolüne çeviriyoruz
    const incomingHistoryForGemini = body.history.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    // Eğer oyun yeni başlıyorsa, Gemini'ye ilk komutu göndermek için bir başlangıç mesajı ekliyoruz
    if (incomingHistoryForGemini.length === 0) {
        incomingHistoryForGemini.push({ role: 'user', parts: [{ text: 'Oyunu başlat.' }] });
    }

    // --- YENİ EKLENEN KONTROL KODU ---
    // Bu satır, Gemini'ye gönderdiğimiz verinin son halini terminale güzel bir formatta yazdırır.
    console.log("Gemini'ye gönderilen geçmiş:", JSON.stringify(incomingHistoryForGemini, null, 2));
    // ------------------------------------

    // Gemini'den cevabı al
    const responseMessage = await runChat(incomingHistoryForGemini);

    if (responseMessage) {
        // Frontend'in anlayacağı formatta tam geçmişi oluştur
        const finalHistoryForDb = [
            ...body.history, 
            { role: 'assistant', content: responseMessage }
        ];
        
        // Veritabanına kaydet
        const { error } = await supabase
          .from('games')
          .insert([{ history: finalHistoryForDb }]);

        if (error) {
          console.error('Supabase kaydetme hatası:', error.message);
        }
    }
    
    return NextResponse.json({ message: responseMessage });

  } catch (error) {
    // Gerçek hatayı terminale yazdırıyoruz
    console.error("API rotasında bir hata yakalandı:", error);
    // Kullanıcıya genel bir hata mesajı gönderiyoruz
    return NextResponse.json({ error: 'Hikaye oluşturulurken bir hata oluştu.' }, { status: 500 });
  }
}