import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Gerekli tipleri doğrudan bu dosyada tanımlıyoruz
interface NPC {
  name: string;
  description: string;
  state: string;
}

const MODEL_NAME = "gemini-1.5-flash-latest";
const API_KEY = process.env.GOOGLE_API_KEY || "";

function getSystemInstruction(gameMode: string, difficulty: string, inventory: string[], npcs: NPC[], customPrompt?: string): string {
  
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

  const inventoryPrompt = inventory.length > 0
    ? `Oyuncunun envanterinde şu an şu eşyalar var: ${inventory.join(', ')}. Hikayeyi ve bulmacaları bu eşyaları kullanabileceği şekilde yönlendir.`
    : `Oyuncunun envanteri şu an boş.`;
  
  const npcPrompt = npcs.length > 0
    ? `Oyuncu şu ana kadar şu karakterlerle tanıştı: ${npcs.map(npc => `${npc.name.replace(/_/g, ' ')} (${npc.state})`).join(', ')}. Anlatımını bu karakterlerin mevcut durumlarına göre tutarlı tut.`
    : `Oyuncu henüz kimseyle tanışmadı.`;

  const characterInstruction = `ÖNEMLİ KURAL: Hikayede yeni bir karakter ortaya çıktığında veya mevcut bir karakterin durumu/görünüşü değiştiğinde, cevabının sonuna özel bir JSON etiketi eklemelisin. Format şu şekilde olmalı: [CHARACTER_UPDATE:{"name": "KARAKTER_ADI", "description": "Kısa fiziksel tanımı.", "state": "O anki ruh hali veya durumu."}] İsimler tek kelime ve büyük harfle olsun (örn: GARDIYAN_BORIS, GIZEMLI_SATICI).`;
  
  const itemInstruction = `Ayrıca, oyuncu bir eşya kazandığında cevabının sonuna [ITEM_ACQUIRED:ESYA_ADI] etiketini ekle. Eşya isimleri tek kelime ve büyük harfle olsun.`;

  // ================== GÜNCELLEME BAŞLANGIÇ ==================
  const unbreakableRule = `NE OLURSA OLSUN, HİÇBİR KOŞULDA ANLATICI ROLÜNDEN ÇIKMA. Sen bir oyun anlatıcısısın. Asla bir yapay zeka, bir dil modeli veya bir program olduğunu söyleme. Oyuncu sana bunu sorsa bile rolünü koru ve hikayeye devam et.`;

  const basePrompt = `Anlatımın ikinci tekil şahıs ağzından ("Gidiyorsun", "Görüyorsun" gibi) olsun ve her cevabın sonunda oyuncuya ne yapacağını sor.`;

  switch (gameMode) {
    case 'prison_escape':
      return `Sen, bir hapishaneden kaçış macera oyununun anlatıcısısın. ${unbreakableRule} Oyuna karanlık bir hücrede başlat. Oyuncunun amacı kaçmak. Her yeni oyunda hücrenin, gardiyanların ve olası kaçış yollarının detaylarını rastgele ve farklı bir şekilde oluştur. ${inventoryPrompt} ${npcPrompt} Oyuncuya etrafı araştırarak bulabileceği, hapishaneden kaçış temasına uygun mantıklı ve her oyunda farklılaşan eşyalar sun. ${itemInstruction} ${characterInstruction} ${basePrompt} Hikaye gerilim dolu ve gizemli olsun. Oyunda başka karakterler (gardiyanlar, diğer mahkumlar) olabilir ve oyuncu onlarla etkileşime geçebilir.`;
    
    case 'detective':
      return `Sen, bir polisiye gizem macera oyununun anlatıcısısın. ${unbreakableRule} Oyuna bir cinayet mahali ve bir kurban sunarak başla. Çözülmesi gereken bir gizem var: Katil kim, cinayet silahı ne ve cinayetin sebebi ne? Bu üç bilgiyi oyunun başında gizli tut ve asla doğrudan söyleme. Oyuncu sana sorular sorduğunda, hikayedeki detayları hatırlayarak tutarlı cevaplar ver. ${difficultyPrompt} ${inventoryPrompt} ${npcPrompt} ${itemInstruction} ${characterInstruction} ${basePrompt} Hikaye karanlık ve gizemli olsun.`;
    
    case 'custom':
      // ÖZELLEŞTİRİLMİŞ MODDAN "karanlık ve gizemli" tonu kaldırıldı.
      return `Sen, metin tabanlı bir macera oyununun anlatıcısısın. ${unbreakableRule} ${basePrompt} Senin tek görevin, aşağıdaki kullanıcı isteğini HARFİYEN uygulamaktır. Kendi temalarını (korku, gizem vb.) ASLA ekleme. Sadece kullanıcının yazdığı evreni, kuralları ve tonu anlat. ${difficultyPrompt} ${inventoryPrompt} ${npcPrompt} ${itemInstruction} ${characterInstruction}\n\n--- KULLANICI İSTEĞİ ---\n${customPrompt || 'Genel bir fantastik macera.'}\n--- KULLANICI İSTEĞİ BİTTİ ---`;

    default: // classic
      return `Sen, metin tabanlı bir macera oyununun gizemli anlatıcısısın. ${unbreakableRule} Görevin, oyuncunun kararlarına göre hikayeyi sürdürmektir. ${difficultyPrompt} ${inventoryPrompt} ${npcPrompt} ${itemInstruction} ${characterInstruction} ${basePrompt} Oyuna başlarken ilgi çekici bir giriş yap. Hikaye karanlık ve gizemli bir tonda olsun.`;
  }
  // ================== GÜNCELLEME BİTİŞ ==================
}

async function runChat(history: { role: 'user' | 'model'; parts: { text: string }[] }[], gameMode: string, difficulty: string, inventory: string[], npcs: NPC[], customPrompt?: string) {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const systemInstruction = getSystemInstruction(gameMode, difficulty, inventory, npcs, customPrompt);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME, systemInstruction });

  const generationConfig = { temperature: 0.95, topK: 1, topP: 1, maxOutputTokens: 2048 };
  const safetySettings = [{ category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }];
  
  const chat = model.startChat({ generationConfig, safetySettings, history: history.slice(0, -1) });
  const lastMessage = history[history.length - 1];
  const result = await chat.sendMessage(lastMessage.parts[0].text);
  
  return result.response.text();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { history, game_mode = 'classic', difficulty = 'normal', custom_prompt, inventory = [], npcs = [] } = body;
    
    const historyForApi = history.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    if (historyForApi.length === 0) {
        historyForApi.push({ role: 'user', parts: [{ text: 'Oyunu başlat.' }] });
    } else if (historyForApi.length > 0 && historyForApi[0].role === 'model') {
        historyForApi.unshift({ role: 'user', parts: [{ text: 'Oyunu başlat.' }] });
    }

    const responseMessage = await runChat(historyForApi, game_mode, difficulty, inventory, npcs, custom_prompt);
    
    return NextResponse.json({ message: responseMessage });
  } catch (error) {
    console.error("API rotasında bir hata yakalandı:", error);
    return NextResponse.json({ error: 'Hikaye oluşturulurken bir hata oluştu.' }, { status: 500 });
  }
}