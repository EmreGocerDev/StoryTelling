// src/app/api/dnd/start/route.ts
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

  const { gameId } = await req.json();

  if (!gameId) {
    return NextResponse.json({ error: 'Oyun ID\'si gerekli.' }, { status: 400 });
  }

  try {
    // Önce oyunun mevcut durumunu ve host'unu kontrol edelim.
    const { data: game, error: fetchError } = await supabase.from('games').select('*').eq('id', gameId).single();

    if (fetchError || !game) {
      return NextResponse.json({ error: 'Oyun bulunamadı.' }, { status: 404 });
    }

    // Yalnızca ev sahibi oyunu başlatabilir.
    if (game.host_id !== user.id) {
      return NextResponse.json({ error: 'Yalnızca oyunun ev sahibi oyunu başlatabilir.' }, { status: 403 });
    }

    // Oyun zaten başlamışsa hata verelim.
    if (game.status !== 'pending') {
      return NextResponse.json({ error: 'Oyun zaten başlatıldı.' }, { status: 400 });
    }

    // Oyuncu listesini alalım ve ilk oyuncunun ID'sini belirleyelim.
    const { data: participants, error: participantsError } = await supabase
      .from('game_participants')
      .select('user_id')
      .eq('game_id', gameId)
      .order('created_at', { ascending: true }); // Katılımcı eklenme sırasına göre sıralama

    if (participantsError || !participants || participants.length === 0) {
      return NextResponse.json({ error: 'Oyuncu bulunamadı.' }, { status: 500 });
    }

    const firstPlayerId = participants[0].user_id;

    // Oyunu başlatıp ilk sırayı belirleyelim.
    const { data: updatedGame, error: updateError } = await supabase.from('games').update({
      status: 'in_progress',
      current_player_turn_id: firstPlayerId
    }).eq('id', gameId).select().single();

    if (updateError || !updatedGame) {
      console.error('Oyun başlatma hatası:', updateError);
      return NextResponse.json({ error: 'Oyun başlatılırken bir hata oluştu.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, game: updatedGame });

  } catch (error) {
    console.error('API hatası:', error);
    return NextResponse.json({ error: 'Bir hata oluştu.' }, { status: 500 });
  }
}