"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Profile {
  id: string;
  email: string;
  role: string;
}

export default function TeamAssignment() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = async () => {
    const { data, error } = await supabase.from('Profiles').select('*');
    if (!error && data) {
      setProfiles(data as Profile[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
    
    const channel = supabase
      .channel('profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Profiles' }, () => {
        fetchProfiles();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateRole = async (id: string, newRole: string) => {
    await supabase.from('Profiles').update({ role: newRole }).eq('id', id);
  };

  if (loading) return <div>Loading players...</div>;

  return (
    <div className="bg-surface-card p-4 rounded-xl shadow-sm border border-border-parchment mb-6 w-full max-w-4xl">
      <h2 className="text-xl font-bold mb-4 text-on-surface font-headline-sm">Team Assignment</h2>
      <div className="overflow-x-auto rounded-lg border border-border-parchment">
        <table className="min-w-full bg-surface-container">
          <thead className="bg-surface-container-high border-b border-border-parchment/60">
            <tr>
              <th className="text-left py-3 px-4 text-on-surface-variant font-bold font-tag-overline uppercase tracking-wider text-[11px]">User Email</th>
              <th className="text-left py-3 px-4 text-on-surface-variant font-bold font-tag-overline uppercase tracking-wider text-[11px]">Current Role</th>
              <th className="text-left py-3 px-4 text-on-surface-variant font-bold font-tag-overline uppercase tracking-wider text-[11px]">Assign Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-parchment/60">
            {profiles.map((profile) => (
              <tr key={profile.id} className="hover:bg-surface-container-high/50 transition-colors">
                <td className="py-3 px-4 text-on-surface font-label-md">{profile.email || 'Anonymous'}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider border ${
                    profile.role === 'Moderator' ? 'bg-primary/20 text-primary border-primary/30' :
                    profile.role === 'Player A' ? 'bg-faction-hostile/20 text-faction-hostile border-faction-hostile/30' :
                    profile.role === 'Player B' ? 'bg-faction-friendly/20 text-faction-friendly border-faction-friendly/30' :
                    'bg-surface-dim text-on-surface-variant border-outline-variant/30'
                  }`}>
                    {profile.role}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <select 
                    className="border border-border-parchment rounded-lg p-1.5 text-sm bg-surface-card text-on-surface outline-none font-semibold shadow-inner"
                    value={profile.role}
                    onChange={(e) => updateRole(profile.id, e.target.value)}
                  >
                    <option value="Unassigned">Unassigned</option>
                    <option value="Player A">Player A</option>
                    <option value="Player B">Player B</option>
                    <option value="Moderator">Moderator</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
