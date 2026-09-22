import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import ModeratorDashboard from '@/components/ModeratorDashboard';
import PlayerDashboard from '@/components/PlayerDashboard';

import WaitingRoom from '@/components/WaitingRoom';

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
        <WaitingRoom userEmail={user.email || ''} userId={user.id} onSignOut={handleSignOut} />
      )}
    </div>
  );
}
