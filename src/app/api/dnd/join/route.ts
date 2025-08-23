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

  const { gameId, characterName } = await req.json();

  if (!gameId || !characterName) {
    return NextResponse.json({ error: 'Gerekli bilgiler eksik.' }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from('game_participants')
      .update({ character_name: characterName })
      .eq('game_id', gameId)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Oyuna katılma hatası:', error);
      return NextResponse.json({ error: 'Oyuna katılırken bir hata oluştu.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('API hatası:', error);
    return NextResponse.json({ error: 'Bir hata oluştu.' }, { status: 500 });
  }
}