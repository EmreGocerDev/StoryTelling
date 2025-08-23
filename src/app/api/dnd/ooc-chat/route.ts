// src/app/api/dnd/ooc-chat/route.ts
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

  const { gameId, content } = await req.json();
  if (!gameId || !content || typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'Oyun ID\'si veya mesaj içeriği eksik.' }, { status: 400 });
  }

  // Kullanıcının gerçekten bu oyuna ait olup olmadığını kontrol edelim (RLS ile de kontrol ediliyor ama bu ek bir güvenlik katmanı)
  const { data: participant, error: participantError } = await supabase
    .from('game_participants')
    .select('user_id')
    .eq('game_id', gameId)
    .eq('user_id', user.id)
    .single();

  if (participantError || !participant) {
    return NextResponse.json({ error: 'Bu oyun için yetkiniz yok.' }, { status: 403 });
  }

  const { error } = await supabase.from('game_ooc_messages').insert({
    game_id: gameId,
    user_id: user.id,
    content: content.trim()
  });

  if (error) {
    console.error('OOC mesaj gönderme hatası:', error);
    return NextResponse.json({ error: 'Mesaj gönderilirken bir hata oluştu.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}