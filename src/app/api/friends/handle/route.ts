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

  const { request_id, action } = await req.json();

  if (!request_id || !action) {
    return NextResponse.json({ error: 'İstek ID\'si ve eylem gerekli.' }, { status: 400 });
  }

  const { error } = await supabase.rpc('handle_friend_request', { 
    p_request_id: request_id, 
    p_action: action 
  });

  if (error) {
    console.error('İstek yanıtlama hatası:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}