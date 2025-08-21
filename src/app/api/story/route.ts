import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const MODEL_NAME = "gemini-1.5-flash-latest";
const API_KEY = process.env.GOOGLE_API_KEY || "";

// Zorluk seviyesine göre prompt'ları ayarlayan fonksiyon
function getSystemInstruction(gameMode: string, difficulty: string, customPrompt?: string): string {
  
  let difficultyPrompt = '';
  switch (difficulty) {
    case 'easy':
      difficultyPrompt = 'Oyuncuya karşı cömert ol, ipuçlarını açıkça ver ve sıkıştığında ona yardım et.';
      break;
    case 'hard':
      difficultyPrompt = 'Oyuncuya karşı ketum ve gizemli ol. İpuçlarını sadece dolaylı yoldan, metaforlarla veya şifreli bir dille ver. Oyuncuyu yanıltmaktan çekinme.';
      break;
    default: // normal
      difficultyPrompt = 'Dengeli bir anlatım sun. İpuçları ne çok açık ne de çok kapalı olsun.';
      break;
  }

  switch (gameMode) {
    case 'detective':
      return `Sen, bir polisiye gizem macera oyununun anlatıcısısın. Oyuna bir cinayet mahali ve bir kurban sunarak başla. Çözülmesi gereken bir gizem var: Katil kim, cinayet silahı ne ve cinayetin sebebi ne? Bu üç bilgiyi oyunun başında gizli tut ve asla doğrudan söyleme. Oyuncu sana sorular sorduğunda, hikayedeki detayları hatırlayarak tutarlı cevaplar ver. ${difficultyPrompt} Anlatımın ikinci tekil şahıs ağzından olsun ("Gidiyorsun", "Görüyorsun" gibi) ve her cevabın sonunda oyuncuya ne yapacağını sor. Asla bir yapay zeka olduğunu belli etme. Hikaye karanlık ve gizemli bir tonda olsun.`;
    
    case 'custom':
      return `Sen, metin tabanlı bir macera oyununun anlatıcısısın. Anlatımın ikinci tekil şahıs ağzından olsun ve her cevabın sonunda oyuncuya ne yapacağını sor. ${difficultyPrompt} Hikayeyi aşağıdaki evrende, kurallarda ve tonda anlatacaksın:\n\n--- KULLANICI İSTEĞİ ---\n${customPrompt || 'Genel bir fantastik macera.'}\n--- KULLANICI İSTEĞİ BİTTİ ---`;

    default: // classic
      return `Sen, metin tabanlı bir macera oyununun gizemli anlatıcısısın. Görevin, oyuncunun kararlarına göre hikayeyi sürdürmektir. ${difficultyPrompt} Anlatımın ikinci tekil şahıs ağzından olsun ve her cevabın sonunda oyuncuya ne yapacağını sor. Asla bir yapay zeka olduğunu belli etme. Hikaye karanlık ve gizemli bir tonda olsun. Oyuna başlarken ilgi çekici bir giriş yap.`;
  }
}

// ... runChat ve POST fonksiyonları bir önceki cevaptaki ile aynı kalabilir
// ama netlik için tam dosyayı veriyorum.

async function runChat(history: { role: 'user' | 'model'; parts: { text: string }[] }[], gameMode: string, difficulty: string, customPrompt?: string) {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const systemInstruction = getSystemInstruction(gameMode, difficulty, customPrompt);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME, systemInstruction });

  const generationConfig = { temperature: 0.9, topK: 1, topP: 1, maxOutputTokens: 2048 };
  const safetySettings = [{ category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }];
  
  const chat = model.startChat({ generationConfig, safetySettings, history: history.slice(0, -1) });
  const lastMessage = history[history.length - 1];
  const result = await chat.sendMessage(lastMessage.parts[0].text);
  
  return result.response.text();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { history, game_mode = 'classic', difficulty = 'normal', custom_prompt } = body;
    
    const historyForApi = history.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    if (historyForApi.length === 0) {
        historyForApi.push({ role: 'user', parts: [{ text: 'Oyunu başlat.' }] });
    } else if (historyForApi.length > 0 && historyForApi[0].role === 'model') {
        historyForApi.unshift({ role: 'user', parts: [{ text: 'Oyunu başlat.' }] });
    }

    const responseMessage = await runChat(historyForApi, game_mode, difficulty, custom_prompt);
    
    return NextResponse.json({ message: responseMessage });
  } catch (error) {
    console.error("API rotasında bir hata yakalandı:", error);
    return NextResponse.json({ error: 'Hikaye oluşturulurken bir hata oluştu.' }, { status: 500 });
  }
}