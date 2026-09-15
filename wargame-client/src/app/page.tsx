import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import ModeratorDashboard from '@/components/ModeratorDashboard';
import PlayerDashboard from '@/components/PlayerDashboard';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch the user's role from the Profiles table
  const { data: profile } = await supabase
    .from('Profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role || 'Unassigned';

  const handleSignOut = async () => {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      {/* Render the correct dashboard based on selected role */}
      {role === 'Moderator' ? (
        <ModeratorDashboard userEmail={user.email || ''} role={role} onSignOut={handleSignOut} />
      ) : role === 'Player A' || role === 'Player B' ? (
        <PlayerDashboard userEmail={user.email || ''} role={role} onSignOut={handleSignOut} />
      ) : (
        <div className="flex h-full items-center justify-center bg-[var(--color-canvas-bg)] flex-col">
          <h2 className="text-2xl font-bold text-white mb-2">Awaiting Assignment</h2>
          <p className="text-slate-400">The moderator has not assigned you to a team yet. Please wait.</p>
          <form action={handleSignOut} className="mt-4">
            <button type="submit" className="text-sm bg-black/20 hover:bg-black/40 text-white px-3 py-1 rounded transition-colors font-sans">
              Sign Out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
