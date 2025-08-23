import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getSystemInstruction } from '@/app/api/story/route';
import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_NAME = "gemini-1.5-flash-latest";
const API_KEY = process.env.GOOGLE_API_KEY || "";

const parseResponseForItems = (message: string): { cleanedMessage: string, newItems: string[] } => {
  const itemRegex = /\[ITEM_ACQUIRED:([^\]]+)\]/g;
  const newItems: string[] = [];
  const matches = message.matchAll(itemRegex);
  for (const match of matches) {
    newItems.push(match[1].replace(/_/g, ' '));
  }
  const cleanedMessage = message.replace(itemRegex, "").trim();
  return { cleanedMessage, newItems };
};

interface NPC {
  name: string;
  description: string;
  state: string;
}

const parseResponseForCharacters = (message: string): { cleanedMessage: string, updatedNpcs: NPC[] } => {
  const characterRegex = /\[CHARACTER_UPDATE:({.*?)\]/g;
  const updatedNpcs: NPC[] = [];
  const matches = message.matchAll(characterRegex);
  for (const match of matches) {
    try {
      const jsonString = match[1];
      const npcData = JSON.parse(jsonString);
      if (npcData.name && npcData.description && npcData.state) {
        updatedNpcs.push(npcData);
      }
    } catch (e) {
      console.error("Karakter JSON'u parse edilemedi:", match[1], e);
    }
  }
  const cleanedMessage = message.replace(characterRegex, "").trim();
  return { cleanedMessage, updatedNpcs };
};

export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
  }

  const {
    game_id,
    history,
    game_mode,
    difficulty,
    customPrompt,
    inventory = [],
    npcs = [],
    legend_name
  } = await req.json();

  const lastMessage = history[history.length - 1];

  if (!game_id || !lastMessage || lastMessage.role !== 'user') {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
  }

  try {
    const { data: game, error: gameError } = await supabase.from('games').select('*, turn_order').eq('id', game_id).single();
    if (gameError || !game) {
      return NextResponse.json({ error: 'Oyun bulunamadı.' }, { status: 404 });
    }

    if (game.current_player_turn_id !== user.id) {
      return NextResponse.json({ error: 'Sıra sizde değil.' }, { status: 403 });
    }

    const { data: participantsData, error: participantsError } = await supabase
      .from('game_participants')
      .select('user_id, character_name, ai_role')
      .eq('game_id', game.id);

    if (participantsError) {
      return NextResponse.json({ error: 'Katılımcılar çekilemedi.' }, { status: 500 });
    }

    let aiMessage = '';

    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const systemInstruction = getSystemInstruction(game_mode, difficulty, inventory, npcs, participantsData, customPrompt, legend_name);
      const model = genAI.getGenerativeModel({ model: MODEL_NAME, systemInstruction });
      const result = await model.generateContent(lastMessage.content);
      aiMessage = result.response.text();
    } catch (aiError) {
      console.error('Yapay Zeka API hatası:', aiError);
      let errorMessage = 'Bilinmeyen bir AI hatası oluştu.';
      if (aiError instanceof Error) {
        errorMessage = aiError.message;
      }
      return NextResponse.json({ error: `Yapay Zeka yanıt verirken bir hata oluştu. Hata: ${errorMessage}` }, { status: 500 });
    }

    const nextPlayerId = (game.turn_order && game.turn_order.length > 0) ?
      game.turn_order[(game.turn_order.indexOf(user.id) + 1) % game.turn_order.length] :
      null;

    const itemParseResult = parseResponseForItems(aiMessage);
    const finalParseResult = parseResponseForCharacters(itemParseResult.cleanedMessage);
    aiMessage = finalParseResult.cleanedMessage;

    const { newItems } = itemParseResult;
    const { updatedNpcs } = finalParseResult;

    const currentInventory = game.inventory || [];
    const currentNpcs = game.npcs || [];

    if (newItems.length > 0) {
      const uniqueNewItems = newItems.filter(item => !currentInventory.includes(item));
      if (uniqueNewItems.length > 0) { currentInventory.push(...uniqueNewItems); }
    }

    if (updatedNpcs.length > 0) {
      updatedNpcs.forEach((updatedNpc: NPC) => {
        const existingNpcIndex = currentNpcs.findIndex((npc: NPC) => npc.name === updatedNpc.name);
        if (existingNpcIndex !== -1) { currentNpcs[existingNpcIndex] = updatedNpc; }
        else { currentNpcs.push(updatedNpc); }
      });
    }

    const nextPlayer = participantsData.find(p => p.user_id === nextPlayerId);
    const announcementName = nextPlayer?.character_name || (nextPlayerId === participantsData.find(p => p.ai_role === 'monster')?.user_id ? 'Yapay Zeka' : 'Bilinmeyen');
    if (announcementName) {
      aiMessage += `\n\nSıra ${announcementName}'da.`;
    }

    const updatedHistory = [...(game.history || []), lastMessage, { role: 'assistant', content: aiMessage }];

    const { error: updateError } = await supabase.from('games').update({
      history: updatedHistory,
      current_player_turn_id: nextPlayerId,
      inventory: currentInventory,
      npcs: currentNpcs
    }).eq('id', game_id);

    if (updateError) {
      console.error('Veritabanı güncelleme hatası:', updateError);
      return NextResponse.json({ error: `Oyun durumu güncellenirken bir hata oluştu: ${updateError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: aiMessage });

  } catch (error) {
    console.error('Genel API hatası:', error);
    let errorMessage = 'Bilinmeyen bir API hatası oluştu.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: `Bir API hatası oluştu: ${errorMessage}` }, { status: 500 });
  }
}