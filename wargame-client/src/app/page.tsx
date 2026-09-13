import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import ModeratorDashboard from '@/components/ModeratorDashboard';
import PlayerDashboard from '@/components/PlayerDashboard';
import Link from 'next/link';

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
    <div className="flex flex-col h-screen">
      {/* Top Navigation */}
      <header className="bg-slate-900 text-white p-4 flex items-center justify-between shadow-md z-50">
        <div className="font-bold text-xl tracking-widest uppercase">Wargaming</div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-slate-300 font-semibold">
            Logged in as: <span className="text-blue-400">{user.email}</span> ({role})
          </span>
          <form action={handleSignOut}>
            <button type="submit" className="text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded">
              Sign Out
            </button>
          </form>
        </div>
      </header>

      {/* Render the correct dashboard based on selected role */}
      <div className="flex-1 overflow-hidden">
        {role === 'Moderator' ? (
          <ModeratorDashboard />
        ) : role === 'Player A' || role === 'Player B' ? (
          <PlayerDashboard role={role} />
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-100 flex-col">
            <h2 className="text-2xl font-bold text-slate-700 mb-2">Awaiting Assignment</h2>
            <p className="text-slate-500">The moderator has not assigned you to a team yet. Please wait.</p>
          </div>
        )}
      </div>
    </div>
  );
}
