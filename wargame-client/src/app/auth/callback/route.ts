import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { sanitizeRedirectPath } from '@/lib/security';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const sanitizedPath = sanitizeRedirectPath(next);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(sanitizedPath, origin));
    }
  }

  // return the user to an error page with some instructions
  return NextResponse.redirect(new URL('/login?error=Could not authenticate user', origin));
}
