// src/app/api/users/search/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query');

  if (!query || query.trim().length < 3) {
    return NextResponse.json({ error: 'Arama için en az 3 karakter girmelisiniz.' }, { status: 400 });
  }

  // Kullanıcıları kullanıcı adına göre ara, kendini ve zaten arkadaş olanları hariç tut.
  // Not: Daha karmaşık senaryolar için (örneğin bekleyen istekleri de hariç tutmak) bir RPC fonksiyonu daha mantıklı olabilir.
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, username, chat_color')
    .ilike('username', `%${query}%`) // Büyük/küçük harf duyarsız arama
    .neq('id', user.id) // Arama sonuçlarında kendini gösterme
    .limit(10); // Sonuçları sınırla

  if (error) {
    console.error('Kullanıcı arama hatası:', error);
    return NextResponse.json({ error: 'Kullanıcı aranırken bir hata oluştu.' }, { status: 500 });
  }

  return NextResponse.json(users);
}