// src/app/login/page.tsx
'use client';

import { Auth } from '@supabase/auth-ui-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { VT323 } from 'next/font/google';

const vt323 = VT323({
  subsets: ["latin"],
  weight: "400",
});

export default function LoginPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push('/');
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase, router]);

  return (
    <main className={vt323.className} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'black' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        <h1 style={{ color: 'white', textAlign: 'center', fontSize: '3rem', marginBottom: '2rem', letterSpacing: '0.1em' }}>
          STORYTELLING
        </h1>
        <Auth
          supabaseClient={supabase}
          // DÜZELTME: theme="dark" prop'u çakışmaya neden olduğu için tamamen kaldırıldı.
          // Bizim 'appearance' içindeki özel ayarlarımız zaten temayı oluşturuyor.
          appearance={{
            variables: {
              default: {
                colors: {
                  brand: '#FFFFFF',
                  brandAccent: '#CCCCCC',
                  brandButtonText: '#000000',
                  defaultButtonBackground: 'transparent',
                  defaultButtonBackgroundHover: '#333333',
                  defaultButtonBorder: '#FFFFFF',
                  defaultButtonText: '#FFFFFF',
                  inputBackground: 'transparent',
                  inputBorder: '#FFFFFF',
                  inputBorderHover: '#CCCCCC',
                  inputText: '#FFFFFF',
                  inputLabelText: '#CCCCCC',
                  inputPlaceholder: '#666666',
                  messageText: '#CCCCCC',
                  messageTextDanger: '#ff4d4d',
                  anchorTextColor: '#FFFFFF',
                  anchorTextHoverColor: '#CCCCCC',
                },
                fonts: {
                  bodyFontFamily: 'inherit',
                  buttonFontFamily: 'inherit',
                  inputFontFamily: 'inherit',
                  labelFontFamily: 'inherit',
                },
                fontSizes: {
                  baseBodySize: '16px',
                  baseInputSize: '16px',
                  baseButtonSize: '16px',
                  baseLabelSize: '16px',
                },
                space: {
                  buttonPadding: '12px 15px',
                  inputPadding: '12px 15px',
                },
                radii: {
                  borderRadiusButton: '2px',
                  inputBorderRadius: '2px',
                }
              },
            },
          }}
          view="sign_in"
          showLinks={false}
          providers={[]}
        />
      </div>
    </main>
  );
}