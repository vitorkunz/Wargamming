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

  const fetchProfiles = async () => {
    const { data, error } = await supabase.from('Profiles').select('*');
    if (!error && data) {
      setProfiles(data as Profile[]);
    }
    setLoading(false);
  };

  const updateRole = async (id: string, newRole: string) => {
    await supabase.from('Profiles').update({ role: newRole }).eq('id', id);
  };

  if (loading) return <div>Loading players...</div>;

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-slate-200 mb-6 w-full max-w-4xl">
      <h2 className="text-xl font-bold mb-4 text-slate-700">Team Assignment</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-slate-100 border-b">
            <tr>
              <th className="text-left py-2 px-4 text-slate-600 font-semibold">User Email</th>
              <th className="text-left py-2 px-4 text-slate-600 font-semibold">Current Role</th>
              <th className="text-left py-2 px-4 text-slate-600 font-semibold">Assign Role</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr key={profile.id} className="border-b hover:bg-slate-50">
                <td className="py-2 px-4 text-slate-800">{profile.email || 'Anonymous'}</td>
                <td className="py-2 px-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    profile.role === 'Moderator' ? 'bg-purple-100 text-purple-700' :
                    profile.role === 'Player A' ? 'bg-red-100 text-red-700' :
                    profile.role === 'Player B' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {profile.role}
                  </span>
                </td>
                <td className="py-2 px-4">
                  <select 
                    className="border border-slate-300 rounded p-1 text-sm bg-white text-slate-700"
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
