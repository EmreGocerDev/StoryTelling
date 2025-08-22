import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
  }

  const { error } = await supabase.rpc('clear_global_chat');

  if (error) {
    return NextResponse.json({ error: 'Sohbet temizlenirken bir hata oluştu.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}