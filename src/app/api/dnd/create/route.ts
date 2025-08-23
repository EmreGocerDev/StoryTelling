// src/app/api/dnd/create/route.ts
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
  }

  const { game_mode, difficulty, customPrompt, player_ids, host_character_name, ai_role_id } = await req.json();

  if (!game_mode || !difficulty || !player_ids || !host_character_name) {
    return NextResponse.json({ error: 'Gerekli bilgiler eksik.' }, { status: 400 });
  }

  try {
    const { data: newGame, error: gameError } = await supabase.rpc('create_dnd_game_transaction', {
      host_id: user.id,
      game_mode: game_mode,
      difficulty: difficulty,
      player_ids: player_ids,
      host_character_name: host_character_name,
      custom_prompt: customPrompt,
      ai_role_id: ai_role_id
    }).single();

    if (gameError || !newGame) {
      console.error('Oyun oluşturma RPC hatası:', gameError);
      return NextResponse.json({ error: `Oyun oluşturulamadı. Hata: ${gameError?.message || 'Bilinmeyen hata'}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, game: newGame });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen bir API hatası oluştu.';
    console.error('API hatası:', error);
    return NextResponse.json({ error: `Bir API hatası oluştu: ${errorMessage}` }, { status: 500 });
  }
}