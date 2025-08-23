import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

interface NPC {
  name: string;
  description: string;
  state: string;
}

interface Participant {
  user_id: string;
  character_name: string | null;
}

const MODEL_NAME = "gemini-1.5-flash-latest";
const API_KEY = process.env.GOOGLE_API_KEY || "";

export function getSystemInstruction(
  gameMode: string,
  difficulty: string,
  inventory: string[],
  npcs: NPC[],
  participants: Participant[],
  customPrompt?: string,
  legendName?: string
): string {
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

  const participantsPrompt = participants.length > 0
    ? `Oyuncular şunlar: ${participants.map(p => `${p.character_name || 'Bilinmeyen Oyuncu'} (ID: ${p.user_id})`).join(', ')}.`
    : '';
  
  const creativityRule = `EN ÖNEMLİ KURALIN YARATICILIKTIR. Her yeni oyunu, bir önceki oyundan tamamen farklı ve benzersiz kıl. Verdiğim örneklerden sadece ilham al, onları asla doğrudan kopyalama. Kendi özgün fikirlerini kullanarak oyuncuyu her seferinde şaşırt.`;
  const itemInstruction = `ZORUNLU KURAL 1: Oyuncu bir eşya kazandığında cevabının sonuna MUTLAKA [ITEM_ACQUIRED:ESYA_ADI] etiketini ekle. Eşya isimleri tek kelime ve BÜYÜK HARFLE olsun.`;
  const characterInstruction = `ZORUNLU KURAL 2: Hikayede yeni bir karakter ortaya çıktığında veya mevcut bir karakterin durumu önemli ölçüde değiştiğinde, cevabının sonuna MUTLAKA şu formatta bir JSON etiketi ekle: [CHARACTER_UPDATE:{"name": "KARAKTER_ADI", "description": "Kısa fiziksel tanımı.", "state": "O anki ruh hali veya durumu."}] İsimler tek kelime ve BÜYÜK HARFLE olsun (örn: GARDIYAN_BORIS). Cevabını göndermeden önce JSON formatının (çift tırnaklar, virgüller) %100 doğru olduğundan emin ol.`;
  const unbreakableRule = `ZORUNLU KURAL 3: NE OLURSA OLSUN, HİÇBİR KOŞULDA ANLATICI ROLÜNDEN ÇIKMA. Sen bir oyun anlatıcısısın. Asla bir yapay zeka olduğunu söyleme.`;
  const loreRule = `ZORUNLU KURAL 4: Sen bir oyun hakemisin ve oyun evreninin kurallarını korumalısın. Oyuncunun hikayeye aykırı (örn: uzay gemisi, modern teknoloji, tarihsel olarak yanlış bilgiler) bir hamlesini tespit ettiğinde, bunu zarif ve mizahi bir dille reddet. "Maalesef bu evrende böyle bir şey mümkün değil." gibi ifadelerle başlayabilir ve oyuncuyu hikayenin akışına uygun bir yola yönlendirebilirsin. Sakın absürt isteği kabul edip ona göre hikaye yazma.`;
  const basePrompt = `Anlatımın ikinci tekil şahıs ağzından ("Gidiyorsun", "Görüyorsun" gibi) olsun ve her cevabın sonunda oyuncuya ne yapacağını sor.`;
  
  const allCoreRules = `${itemInstruction} ${characterInstruction} ${unbreakableRule} ${loreRule}`;
  
  // DÜZELTME: Bütün sıra yönetimi kurallarını kaldırdık.
  
  switch (gameMode) {
    case 'dnd':
    case 'dnd_vs':
      const header = gameMode === 'dnd' 
        ? 'Sen, çok oyunculu bir DND oyununun anlatıcısısın ve oyun yöneticisisin (Dungeon Master).'
        : 'Sen, çok oyunculu bir DND VS oyununun hakemi ve anlatıcısısın.';
      const vsRule = gameMode === 'dnd_vs' 
        ? `ÇOK ÖNEMLİ: DND VS modunda iki oyuncu arasındaki mücadeleyi veya rekabeti anlatmaya odaklan. Oyuncuların hamlelerini bir savaşa veya rekabete dönüştür.`
        : '';
      const roundRobinRule = `ZORUNLU KURAL 5: Sen sadece bir hikaye anlatıcısısın. Asla sıradaki oyuncuyu belirleme veya atama. Sadece hikayeyi anlat ve sıradaki oyuncunun hamlesini bekle.`;


      return `${header} ${vsRule} ${creativityRule}
      ${difficultyPrompt} ${inventoryPrompt} ${npcPrompt}
      ${participantsPrompt}
      ${roundRobinRule}
      ${allCoreRules}`;
    
    case 'legends':
      return `Sen, efsanevi bir hikaye anlatıcısısın. Oyuncunun seçtiği "${legendName}" efsanesini interaktif bir metin tabanlı macera olarak anlatacaksın. Olay örgüsüne sadık kal ama oyuncunun kararlarının gidişatı etkilemesine izin ver. Efsanedeki ikonik karakterleri oyuna dahil et. ${difficultyPrompt} ${inventoryPrompt} ${npcPrompt} ${allCoreRules} ${basePrompt}`;

    case 'prison_escape':
      return `Sen, bir hapishaneden kaçış macera oyununun anlatıcısısın. ${creativityRule} Oyuna karanlık bir hücrede başlat. Her yeni oyunda hücreyi, gardiyanları ve kaçış yollarını rastgele oluştur. ${inventoryPrompt} ${npcPrompt} Oyuncuya bulabileceği mantıklı ve her oyunda farklılaşan eşyalar sun. Oyunda başka karakterler olabilir. ${allCoreRules} ${basePrompt} Hikaye gerilim dolu olsun.`;
    
    case 'detective':
      return `Sen, bir polisiye gizem macera oyununun anlatıcısısın. ${creativityRule} Her yeni oyunda kurban, mekan, şüpheliler ve ipuçları tamamen farklı ve özgün olmalı. Çözülmesi gereken bir gizem (katil, silah, sebep) var ve bunu gizli tut. ${difficultyPrompt} ${inventoryPrompt} ${npcPrompt} ${allCoreRules} ${basePrompt} Hikaye karanlık ve gizemli olsun.`;
    
    case 'custom':
      return `Sen, metin tabanlı bir macera oyununun anlatıcısısın. Tek görevin, aşağıdaki kullanıcı isteğini HARFİYEN uygulamaktır. Kendi temalarını ASLA ekleme. ${difficultyPrompt} ${inventoryPrompt} ${npcPrompt} ${allCoreRules} ${basePrompt}\n\n--- KULLANICI İSTEĞİ ---\n${customPrompt || 'Genel bir fantastik macera.'}\n--- KULLANICI İSTEĞİ BİTTİ ---`;

    default: // classic
      return `Sen, metin tabanlı bir macera oyununun gizemli anlatıcısısın. ${creativityRule} Her seferinde tamamen farklı ve beklenmedik bir macera ile başla. ${difficultyPrompt} ${inventoryPrompt} ${npcPrompt} ${allCoreRules} ${basePrompt} Hikaye karanlık ve gizemli bir tonda olsun.`;
  }
}

async function runChat(history: { role: 'user' | 'model'; parts: { text: string }[] }[], gameMode: string, difficulty: string, inventory: string[], npcs: NPC[], participants: Participant[], customPrompt?: string, legendName?: string) {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const systemInstruction = getSystemInstruction(gameMode, difficulty, inventory, npcs, participants, customPrompt, legendName);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME, systemInstruction });

  const generationConfig = { temperature: 0.95, topK: 1, topP: 1, maxOutputTokens: 2048 };
  const safetySettings = [{ category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }];
  
  const chat = model.startChat({ generationConfig, safetySettings, history: history.slice(0, -1) });
  const lastMessage = history[history.length - 1];
  const result = await chat.sendMessage(lastMessage.parts[0].text);
  
  return result.response.text();
}

export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
  }
  
  try {
    const body = await req.json();
    const { history, game_mode = 'classic', difficulty = 'normal', custom_prompt, inventory = [], npcs = [], legend_name } = body;
    
    const historyForApi = history.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    if (historyForApi.length === 0) {
        historyForApi.push({ role: 'user', parts: [{ text: 'Oyunu başlat.' }] });
    } else if (historyForApi.length > 0 && historyForApi[0].role === 'model') {
        historyForApi.unshift({ role: 'user', parts: [{ text: 'Oyunu başlat.' }] });
    }

    const responseMessage = await runChat(historyForApi, game_mode, difficulty, inventory, npcs, [], custom_prompt, legend_name);
    
    return NextResponse.json({ message: responseMessage });
  } catch (error) {
    console.error("API rotasında bir hata yakalandı:", error);
    let errorMessage = 'Bilinmeyen bir API hatası oluştu.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: `Hikaye oluşturulurken bir hata oluştu: ${errorMessage}` }, { status: 500 });
  }
}