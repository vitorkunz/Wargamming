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

  // UI States
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<'details' | 'logs'>('details');
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [factionFilter, setFactionFilter] = useState<'all' | 'team-a' | 'team-b' | 'lobby'>('all');

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isAddModModalOpen, setIsAddModModalOpen] = useState(false);

  const [factionSettings, setFactionSettings] = useState({
    team_a_name: 'Força Azul Marítima',
    team_a_icon: 'directions_boat',
    team_b_name: 'Força Vermelha Costeira',
    team_b_icon: 'shield'
  });
  const [editingFaction, setEditingFaction] = useState<'team-a' | 'team-b' | null>(null);
  const [editFactionForm, setEditFactionForm] = useState({ name: '', icon: '' });

  const fetchProfiles = async () => {
    const { data, error } = await supabase.from('Profiles').select('*');
    if (!error && data) {
      setProfiles(data as Profile[]);
    }
    setLoading(false);
  };

  const fetchGameState = async () => {
    const { data, error } = await supabase.from('Game_State').select('*').eq('id', 1).single();
    if (!error && data) {
      setFactionSettings({
        team_a_name: data.team_a_name || 'Força Azul Marítima',
        team_a_icon: data.team_a_icon || 'directions_boat',
        team_b_name: data.team_b_name || 'Força Vermelha Costeira',
        team_b_icon: data.team_b_icon || 'shield'
      });
    }
  };

  useEffect(() => {
    fetchProfiles();
    fetchGameState();
    
    const channel = supabase
      .channel('profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Profiles' }, () => {
        fetchProfiles();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Game_State' }, () => {
        fetchGameState();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const saveFactionSettings = async () => {
    if (!editingFaction) return;
    const updates = editingFaction === 'team-a' 
      ? { team_a_name: editFactionForm.name, team_a_icon: editFactionForm.icon }
      : { team_b_name: editFactionForm.name, team_b_icon: editFactionForm.icon };
    
    await supabase.from('Game_State').update(updates).eq('id', 1);
    setEditingFaction(null);
    fetchGameState();
  };

  const updateRole = async (id: string, newRole: string) => {
    await supabase.from('Profiles').update({ role: newRole }).eq('id', id);
    if (selectedProfile?.id === id) {
      setSelectedProfile(prev => prev ? { ...prev, role: newRole } : null);
    }
  };

  const removeUser = async (id: string) => {
    if (window.confirm('Tem certeza que deseja revogar o acesso deste usuário? Ele voltará para Unassigned.')) {
      await updateRole(id, 'Unassigned');
    }
  };

  const handleSelectPlayer = (profile: Profile) => {
    setSelectedProfile(profile);
    setIsRightPanelOpen(true);
  };

  // Filtragem
  const matchesSearch = (p: Profile) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.email?.toLowerCase().includes(q) || p.role.toLowerCase().includes(q);
  };

  const teamA = profiles.filter(p => p.role === 'Player A' && matchesSearch(p));
  const teamB = profiles.filter(p => p.role === 'Player B' && matchesSearch(p));
  const moderators = profiles.filter(p => p.role === 'Moderator' && matchesSearch(p));
  const unassigned = profiles.filter(p => p.role === 'Unassigned' && matchesSearch(p));

  const totalFiltered = teamA.length + teamB.length + moderators.length + unassigned.length;

  if (loading) {
    return <div className="flex h-full items-center justify-center text-primary">Loading players...</div>;
  }

  return (
    <div className="relative w-full h-full flex overflow-hidden bg-surface-canvas-void select-none">
      {/* FLANK ESQUERDO: Equipes, Mesa Arbitral & Lobby */}
      <aside 
        className={`relative h-full flex flex-col bg-surface-parchment/95 backdrop-blur-md text-on-surface z-20 border-r border-border-parchment shadow-[4px_0_20px_rgba(0,0,0,0.12)] transition-all duration-300 ease-in-out ${isLeftPanelOpen ? 'w-[320px] min-w-[320px]' : 'w-0 min-w-0 border-r-0 overflow-hidden'}`}
      >
        <div className="bg-primary-container px-3 py-3 flex items-center justify-between shadow-sm border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-fixed-dim text-[20px]">shield_person</span>
            <div className="flex flex-col">
              <span className="font-headline-sm text-[13px] font-bold text-text-on-dark uppercase tracking-wider leading-tight">
                Equipes &<br/>Estrutura
              </span>
              <span className="font-tag-overline text-[9px] text-primary-fixed-dim leading-none mt-1">Mesa Arbitral C2</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" className="bg-primary hover:bg-chrome-hover px-2 py-1 rounded text-text-on-dark transition-colors flex items-center shadow-sm text-[11px] font-bold border border-primary-fixed-dim/20" onClick={() => setIsInviteModalOpen(true)} title="Convidar Novo Participante">
              + Convidar
            </button>
            <button type="button" className="p-1 rounded text-primary-fixed-dim hover:text-white hover:bg-white/10 transition-colors flex-shrink-0" onClick={() => setIsLeftPanelOpen(false)} title="Recolher Painel Esquerdo">
              <span className="material-symbols-outlined text-[18px]">keyboard_double_arrow_left</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-on-surface">
          {/* Mesa de Arbitragem */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[16px]">gavel</span>
                <span className="font-tag-overline text-[10px] text-primary uppercase font-bold tracking-wider">Mesa de Arbitragem</span>
              </div>
              <span className="bg-primary/90 text-text-on-dark text-[9px] font-tag-overline px-1.5 py-0.5 rounded-full font-bold">{moderators.length} Juízes</span>
            </div>
            
            {moderators.map(mod => (
              <div key={mod.id} className="bg-surface-card rounded-lg p-2.5 border border-border-parchment border-l-4 border-l-primary-container shadow-xs space-y-1.5 hover:bg-surface-parchment-dim transition-colors group cursor-pointer" onClick={() => handleSelectPlayer(mod)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-headline-sm text-[12px] font-bold text-primary truncate max-w-[120px]">{mod.email.split('@')[0]}</span>
                    <span className="px-1 py-0.5 rounded bg-surface-parchment-dim text-secondary text-[8px] font-tag-overline font-bold">L4</span>
                  </div>
                </div>
                <div className="text-[10px] font-tag-overline text-primary-container font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[13px] text-tertiary-fixed-dim">verified_user</span>Moderador</span>
                </div>
                <p className="text-[10px] font-body-ui text-on-surface-variant truncate">{mod.email}</p>
                <div className="pt-1.5 border-t border-border-parchment/60 flex items-center justify-between gap-1">
                  <span className="text-[9px] font-tag-overline text-outline uppercase font-bold">Gestão:</span>
                  <div className="flex items-center gap-1">
                    <button type="button" className="p-1 rounded bg-surface-parchment-dim hover:bg-status-critical/10 text-outline hover:text-status-critical border border-border-parchment transition-colors" onClick={(e) => { e.stopPropagation(); removeUser(mod.id); }}>
                      <span className="material-symbols-outlined text-[12px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <button type="button" className="w-full py-1 bg-surface-card hover:bg-surface-container text-primary font-tag-overline text-[10px] rounded border border-border-parchment transition-colors flex items-center justify-center gap-1 font-bold" onClick={() => setIsAddModModalOpen(true)}>
              <span className="material-symbols-outlined text-[14px]">add_moderator</span> + Novo Juiz de Jogo
            </button>
          </div>

          {/* Lobby */}
          <div className="space-y-2 pt-2 border-t border-border-parchment">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-status-degraded text-[16px]">hourglass_top</span>
                <span className="font-tag-overline text-[10px] text-primary uppercase font-bold tracking-wider">Lobby de Espera</span>
              </div>
              <span className="bg-status-degraded/20 text-status-degraded text-[9px] font-tag-overline px-1.5 py-0.5 rounded-full font-bold">{unassigned.length} Pendentes</span>
            </div>

            {unassigned.map(user => (
              <div key={user.id} className="bg-surface-card rounded-lg p-2.5 border border-border-parchment border-l-4 border-l-status-degraded shadow-xs space-y-2 cursor-pointer" onClick={() => handleSelectPlayer(user)}>
                <div className="flex items-start justify-between">
                  <div className="flex flex-col truncate w-full">
                    <div className="font-headline-sm text-[12px] font-bold text-primary truncate">{user.email.split('@')[0]}</div>
                    <div className="text-[9px] font-tag-overline text-outline truncate">{user.email}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1 pt-1">
                  <button type="button" className="py-1 px-1.5 bg-faction-friendly/15 hover:bg-faction-friendly/25 text-faction-friendly text-[9px] font-tag-overline font-bold rounded transition-colors" onClick={(e) => { e.stopPropagation(); updateRole(user.id, 'Player A'); }}>
                    + Time A
                  </button>
                  <button type="button" className="py-1 px-1.5 bg-faction-hostile/15 hover:bg-faction-hostile/25 text-faction-hostile text-[9px] font-tag-overline font-bold rounded transition-colors" onClick={(e) => { e.stopPropagation(); updateRole(user.id, 'Player B'); }}>
                    + Time B
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 bg-surface-parchment-dim/90 border-t border-border-parchment text-[11px] font-tag-overline text-on-surface-variant flex flex-col gap-1">
          <div className="flex items-center justify-between font-bold text-primary">
            <span>Total no Teatro:</span>
            <span>{profiles.length} Participantes</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-on-surface-variant">
            <span>{profiles.filter(p => p.role === 'Player A').length} Time A • {profiles.filter(p => p.role === 'Player B').length} Time B</span>
            <span>{profiles.filter(p => p.role === 'Moderator').length} Juízes • {profiles.filter(p => p.role === 'Unassigned').length} Lobby</span>
          </div>
        </div>
      </aside>

      {/* ÁREA CENTRAL */}
      <main className="flex-1 relative flex flex-col h-full overflow-hidden transition-all duration-300 bg-surface-parchment">
        {!isLeftPanelOpen && (
          <button type="button" className="absolute top-4 left-4 z-40 bg-surface-parchment/90 hover:bg-white text-primary px-3 py-2 rounded-lg border border-white/40 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md flex items-center gap-1.5 transition-all text-label-md font-bold" onClick={() => setIsLeftPanelOpen(true)}>
            <span className="material-symbols-outlined text-[18px]">keyboard_double_arrow_right</span>
            <span className="text-xs uppercase tracking-wider">Equipes</span>
          </button>
        )}
        {!isRightPanelOpen && (
          <button type="button" className="absolute top-4 right-4 z-40 bg-surface-parchment/90 hover:bg-white text-primary px-3 py-2 rounded-lg border border-white/40 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md flex items-center gap-1.5 transition-all text-label-md font-bold" onClick={() => setIsRightPanelOpen(true)}>
            <span className="text-xs uppercase tracking-wider">Dossiê</span>
            <span className="material-symbols-outlined text-[18px]">keyboard_double_arrow_left</span>
          </button>
        )}

        {/* Top HUD */}
        <div className="absolute top-4 left-0 right-0 z-30 flex items-center justify-center pointer-events-none px-8">
          <div className="pointer-events-auto flex items-center gap-2 bg-primary-container/85 text-text-on-dark rounded-xl p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-lg border border-white/15">
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-2.5 text-primary-fixed-dim text-[18px]">search</span>
              <input 
                type="text" 
                placeholder="Filtrar..." 
                className="w-48 md:w-64 pl-9 pr-3 py-1 bg-surface-canvas-void/80 text-text-on-dark text-[12px] font-body-ui rounded-lg border border-white/10 focus:outline-none focus:ring-1 focus:ring-secondary-fixed placeholder-text-on-dark/50"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="h-6 w-[1px] bg-white/20"></div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setFactionFilter('all')} className={`px-2.5 py-1 rounded-md text-[11px] font-label-md transition-colors ${factionFilter === 'all' ? 'bg-surface-card text-primary font-bold shadow-sm' : 'text-text-on-dark/80 hover:bg-white/10'}`}>Todos ({totalFiltered})</button>
              <button type="button" onClick={() => setFactionFilter('team-a')} className={`px-2.5 py-1 rounded-md text-[11px] font-label-md transition-colors ${factionFilter === 'team-a' ? 'bg-surface-card text-primary font-bold shadow-sm' : 'text-text-on-dark/80 hover:bg-white/10'}`}>Time A ({teamA.length})</button>
              <button type="button" onClick={() => setFactionFilter('team-b')} className={`px-2.5 py-1 rounded-md text-[11px] font-label-md transition-colors ${factionFilter === 'team-b' ? 'bg-surface-card text-primary font-bold shadow-sm' : 'text-text-on-dark/80 hover:bg-white/10'}`}>Time B ({teamB.length})</button>
              <button type="button" onClick={() => setFactionFilter('lobby')} className={`px-2.5 py-1 rounded-md text-[11px] font-label-md transition-colors ${factionFilter === 'lobby' ? 'bg-surface-card text-primary font-bold shadow-sm' : 'text-text-on-dark/80 hover:bg-white/10'}`}>Lobby ({unassigned.length})</button>
            </div>
          </div>
        </div>

        {/* Viewport content */}
        <div className="relative w-full flex-1 overflow-y-auto pt-20 pb-6 px-6">
          {/* Tactical Grid Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30 bg-surface-parchment-dim z-0">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="tacticalGridPlayers" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#2d7d74" strokeWidth="0.35" strokeDasharray="3 3"/>
                  <circle cx="0" cy="0" r="1.5" fill="#2d7d74" opacity="0.6"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#tacticalGridPlayers)" />
            </svg>
          </div>

          <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* TIME A */}
            {(factionFilter === 'all' || factionFilter === 'team-a') && (
              <div className="flex flex-col gap-3">
                <div className="bg-surface-card/95 rounded-xl p-3 border-l-4 border-l-faction-friendly border border-border-parchment shadow-md flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-faction-friendly text-text-on-dark flex items-center justify-center shadow-sm">
                      <span className="material-symbols-outlined text-[20px]">{factionSettings.team_a_icon}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-tag-overline text-[10px] text-faction-friendly font-bold uppercase tracking-wider">{factionSettings.team_a_name}</span>
                        <button 
                          onClick={() => { 
                            setEditingFaction('team-a'); 
                            setEditFactionForm({ name: factionSettings.team_a_name, icon: factionSettings.team_a_icon }); 
                          }} 
                          className="text-faction-friendly/60 hover:text-faction-friendly flex items-center"
                          title="Editar Facção"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                        </button>
                      </div>
                      <h3 className="font-headline-sm text-[14px] font-bold text-primary">Time A</h3>
                    </div>
                  </div>
                  <span className="bg-faction-friendly/15 text-faction-friendly font-label-md text-[11px] font-bold px-2.5 py-1 rounded-full border border-faction-friendly/20">
                    {teamA.length} Conectados
                  </span>
                </div>
                
                <div className="flex flex-col gap-2.5">
                  {teamA.map(player => (
                    <div 
                      key={player.id} 
                      className={`cursor-pointer bg-surface-card/95 hover:bg-white rounded-xl p-3 border-l-4 shadow-sm transition-all ${selectedProfile?.id === player.id ? 'border-status-objective border-2 border-l-faction-friendly' : 'border border-border-parchment border-l-faction-friendly'}`}
                      onClick={() => handleSelectPlayer(player)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-faction-friendly text-text-on-dark flex items-center justify-center font-bold text-[13px] font-headline-sm shadow-xs uppercase">
                            {player.email.substring(0, 2)}
                          </div>
                          <div className="max-w-[200px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-headline-sm text-[13px] font-bold text-primary leading-tight truncate">{player.email.split('@')[0]}</span>
                              <span className="px-1.5 py-0.5 rounded bg-faction-friendly/20 text-faction-friendly text-[8px] font-tag-overline font-bold shrink-0">PLAYER A</span>
                            </div>
                            <div className="font-headline-sm text-[12px] text-faction-friendly font-semibold truncate">Oficial Tático</div>
                            <div className="font-body-ui text-[11px] text-on-surface-variant truncate">{player.email}</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-border-parchment/60">
                        <div className="flex items-center gap-1 text-[11px] font-label-md">
                          <span className="font-tag-overline text-[9px] text-outline uppercase font-bold">Facção:</span>
                          <span className="bg-surface-parchment-dim px-2 py-0.5 rounded font-bold text-primary text-[11px]">Time A</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button type="button" className="px-2 py-1 bg-surface-parchment-dim hover:bg-faction-hostile/10 text-faction-hostile rounded text-[10px] font-tag-overline font-bold flex items-center gap-0.5 transition-colors" onClick={(e) => { e.stopPropagation(); updateRole(player.id, 'Player B'); }}>
                            <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                            Mover Time B
                          </button>
                          <button type="button" className="p-1 hover:bg-status-critical/10 text-outline hover:text-status-critical rounded transition-colors" onClick={(e) => { e.stopPropagation(); removeUser(player.id); }}>
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {teamA.length === 0 && <div className="text-center p-4 text-on-surface-variant text-xs uppercase font-bold tracking-wider opacity-60">Nenhum operador</div>}
                </div>
              </div>
            )}

            {/* TIME B */}
            {(factionFilter === 'all' || factionFilter === 'team-b') && (
              <div className="flex flex-col gap-3">
                <div className="bg-surface-card/95 rounded-xl p-3 border-l-4 border-l-faction-hostile border border-border-parchment shadow-md flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-faction-hostile text-text-on-dark flex items-center justify-center shadow-sm">
                      <span className="material-symbols-outlined text-[20px]">{factionSettings.team_b_icon}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-tag-overline text-[10px] text-faction-hostile font-bold uppercase tracking-wider">{factionSettings.team_b_name}</span>
                        <button 
                          onClick={() => { 
                            setEditingFaction('team-b'); 
                            setEditFactionForm({ name: factionSettings.team_b_name, icon: factionSettings.team_b_icon }); 
                          }} 
                          className="text-faction-hostile/60 hover:text-faction-hostile flex items-center"
                          title="Editar Facção"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                        </button>
                      </div>
                      <h3 className="font-headline-sm text-[14px] font-bold text-primary">Time B</h3>
                    </div>
                  </div>
                  <span className="bg-faction-hostile/15 text-faction-hostile font-label-md text-[11px] font-bold px-2.5 py-1 rounded-full border border-status-critical/30">
                    {teamB.length} Conectados
                  </span>
                </div>

                <div className="flex flex-col gap-2.5">
                  {teamB.map(player => (
                    <div 
                      key={player.id} 
                      className={`cursor-pointer bg-surface-card/95 hover:bg-white rounded-xl p-3 border-l-4 shadow-sm transition-all ${selectedProfile?.id === player.id ? 'border-status-objective border-2 border-l-faction-hostile' : 'border border-border-parchment border-l-faction-hostile'}`}
                      onClick={() => handleSelectPlayer(player)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-faction-hostile text-text-on-dark flex items-center justify-center font-bold text-[13px] font-headline-sm shadow-xs uppercase">
                            {player.email.substring(0, 2)}
                          </div>
                          <div className="max-w-[200px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-headline-sm text-[13px] font-bold text-primary leading-tight truncate">{player.email.split('@')[0]}</span>
                              <span className="px-1.5 py-0.5 rounded bg-faction-hostile/20 text-faction-hostile text-[8px] font-tag-overline font-bold shrink-0">PLAYER B</span>
                            </div>
                            <div className="font-headline-sm text-[12px] text-faction-hostile font-semibold truncate">Oficial Tático</div>
                            <div className="font-body-ui text-[11px] text-on-surface-variant truncate">{player.email}</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-border-parchment/60">
                        <div className="flex items-center gap-1 text-[11px] font-label-md">
                          <span className="font-tag-overline text-[9px] text-outline uppercase font-bold">Facção:</span>
                          <span className="bg-surface-parchment-dim px-2 py-0.5 rounded font-bold text-primary text-[11px]">Time B</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button type="button" className="px-2 py-1 bg-surface-parchment-dim hover:bg-faction-friendly/10 text-faction-friendly rounded text-[10px] font-tag-overline font-bold flex items-center gap-0.5 transition-colors" onClick={(e) => { e.stopPropagation(); updateRole(player.id, 'Player A'); }}>
                            <span className="material-symbols-outlined text-[13px]">arrow_back</span>
                            Mover Time A
                          </button>
                          <button type="button" className="p-1 hover:bg-status-critical/10 text-outline hover:text-status-critical rounded transition-colors" onClick={(e) => { e.stopPropagation(); removeUser(player.id); }}>
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {teamB.length === 0 && <div className="text-center p-4 text-on-surface-variant text-xs uppercase font-bold tracking-wider opacity-60">Nenhum operador</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* FLANK DIREITO: Dossiê */}
      <aside 
        className={`relative h-full flex flex-col bg-surface-parchment/95 backdrop-blur-md text-on-surface z-20 border-l border-border-parchment shadow-[-4px_0_20px_rgba(0,0,0,0.12)] transition-all duration-300 ease-in-out ${isRightPanelOpen ? 'w-[340px] min-w-[340px]' : 'w-0 min-w-0 border-l-0 overflow-hidden'}`}
      >
        <div className="bg-primary-container p-2 flex items-center gap-1.5 shadow-sm border-b border-white/10 whitespace-nowrap">
          <button type="button" onClick={() => setActiveRightTab('details')} className={`flex-1 py-1.5 px-2 text-center font-label-md text-[12px] rounded-lg shadow-sm flex items-center justify-center gap-1.5 ${activeRightTab === 'details' ? 'bg-surface-card text-primary font-bold' : 'text-text-on-dark/80 hover:bg-chrome-hover'}`}>
            <span className="material-symbols-outlined text-[15px]">badge</span>
            Detalhes
          </button>
          <button type="button" onClick={() => setActiveRightTab('logs')} className={`flex-1 py-1.5 px-2 text-center font-label-md text-[12px] rounded-lg shadow-sm flex items-center justify-center gap-1.5 ${activeRightTab === 'logs' ? 'bg-surface-card text-primary font-bold' : 'text-text-on-dark/80 hover:bg-chrome-hover'}`}>
            <span className="material-symbols-outlined text-[15px]">history</span>
            Logs
          </button>
          <button type="button" className="p-1 rounded text-primary-fixed-dim hover:text-white hover:bg-white/10 transition-colors ml-1" onClick={() => setIsRightPanelOpen(false)}>
            <span className="material-symbols-outlined text-[18px]">keyboard_double_arrow_right</span>
          </button>
        </div>

        {selectedProfile ? (
          <div className="flex-1 overflow-y-auto">
            {activeRightTab === 'details' && (
              <div className="p-4 space-y-3.5">
                <div className="bg-surface-card/95 p-4 rounded-xl border border-border-parchment shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="font-tag-overline text-[10px] text-primary uppercase font-bold tracking-wider">{selectedProfile.role}</span>
                      <h3 className="font-headline-md text-[17px] font-bold text-primary tracking-tight leading-tight mt-0.5 truncate max-w-[200px]">{selectedProfile.email.split('@')[0]}</h3>
                      <span className="font-tag-overline text-[11px] text-outline font-bold mt-1">Patente Desconhecida</span>
                    </div>
                    <div className={`w-10 h-10 rounded-lg text-text-on-dark flex items-center justify-center shadow-md flex-shrink-0 ${
                      selectedProfile.role === 'Player A' ? 'bg-faction-friendly' :
                      selectedProfile.role === 'Player B' ? 'bg-faction-hostile' :
                      selectedProfile.role === 'Moderator' ? 'bg-primary' : 'bg-surface-dim text-on-surface-variant'
                    }`}>
                      <span className="material-symbols-outlined text-[24px]">military_tech</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-border-parchment/60">
                    <span className={`font-label-md text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 border ${
                      selectedProfile.role === 'Player A' ? 'bg-faction-friendly/15 text-faction-friendly border-faction-friendly/20' :
                      selectedProfile.role === 'Player B' ? 'bg-faction-hostile/15 text-faction-hostile border-faction-hostile/20' :
                      'bg-surface-dim text-on-surface-variant border-border-parchment'
                    }`}>
                      {selectedProfile.role}
                    </span>
                  </div>
                </div>

                <div className="bg-surface-card/95 p-3.5 rounded-xl border border-border-parchment shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-tag-overline text-[10px] text-primary uppercase font-bold tracking-wider">Ficha Operacional</span>
                    <span className="material-symbols-outlined text-primary text-[16px]">description</span>
                  </div>
                  <p className="text-[12px] font-body-ui text-on-surface-variant bg-surface-parchment-dim/80 p-2.5 rounded-lg border border-border-parchment/70 leading-relaxed italic">
                    Dados de histórico não disponíveis nesta etapa da simulação.
                  </p>
                  <div className="flex items-center justify-between text-[11px] font-body-ui text-on-surface-variant pt-1">
                    <span>E-mail institucional:</span>
                    <span className="font-bold text-primary truncate max-w-[120px]" title={selectedProfile.email}>{selectedProfile.email}</span>
                  </div>
                </div>

                <div className="bg-surface-card/95 p-3.5 rounded-xl border border-border-parchment shadow-sm space-y-2">
                  <span className="font-tag-overline text-[10px] text-primary uppercase font-bold tracking-wider block">Gestão</span>
                  <button type="button" className="w-full bg-status-critical/10 hover:bg-status-critical hover:text-white text-status-critical font-label-md text-[11px] py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-status-critical/30 font-semibold" onClick={() => removeUser(selectedProfile.id)}>
                    <span className="material-symbols-outlined text-[15px]">person_remove</span>
                    Revogar Acesso C2
                  </button>
                </div>
              </div>
            )}
            
            {activeRightTab === 'logs' && (
              <div className="p-4 space-y-3">
                <div className="bg-surface-card/95 p-3.5 rounded-xl border border-border-parchment shadow-sm space-y-2.5">
                  <span className="font-tag-overline text-[10px] text-primary uppercase font-bold tracking-wider block">Trilha de Auditoria C2</span>
                  <div className="text-[11px] font-body-ui italic text-on-surface-variant p-2 text-center bg-surface-parchment-dim rounded">
                    Logs de auditoria ainda não integrados.
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-on-surface-variant opacity-60">
            <span className="material-symbols-outlined text-[48px] mb-2">person_search</span>
            <span className="font-headline-sm text-[14px]">Nenhum participante selecionado</span>
            <span className="font-body-ui text-[12px] mt-1">Selecione um oficial na mesa central para visualizar o dossiê.</span>
          </div>
        )}
      </aside>

      {/* MODAIS */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/60 backdrop-blur-sm p-4">
          <div className="bg-surface-card rounded-xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 border border-border-parchment">
            <div className="flex items-center justify-between border-b border-border-parchment pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">person_add</span>
                <h3 className="font-headline-sm text-[18px] text-primary">Convidar Novo Delegado</h3>
              </div>
              <button type="button" className="text-outline hover:text-primary" onClick={() => setIsInviteModalOpen(false)}>
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <p className="font-body-ui text-[13px] text-on-surface-variant">
              (Apenas estrutura visual nesta etapa)
            </p>
            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-border-parchment">
              <button type="button" className="px-4 py-2 text-primary font-label-md text-[13px] hover:bg-surface-parchment rounded-lg" onClick={() => setIsInviteModalOpen(false)}>Cancelar</button>
              <button type="button" className="px-5 py-2 bg-primary-container hover:bg-chrome-hover text-text-on-dark font-label-md text-[13px] rounded-lg shadow font-semibold transition-all" onClick={() => setIsInviteModalOpen(false)}>Emitir Token</button>
            </div>
          </div>
        </div>
      )}

      {isAddModModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/60 backdrop-blur-sm p-4">
          <div className="bg-surface-card rounded-xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 border border-border-parchment">
            <div className="flex items-center justify-between border-b border-border-parchment pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">add_moderator</span>
                <h3 className="font-headline-sm text-[18px] text-primary">Promover Juiz de Jogo</h3>
              </div>
              <button type="button" className="text-outline hover:text-primary" onClick={() => setIsAddModModalOpen(false)}>
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <p className="font-body-ui text-[13px] text-on-surface-variant">
              (Apenas estrutura visual nesta etapa)
            </p>
            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-border-parchment">
              <button type="button" className="px-4 py-2 text-primary font-label-md text-[13px] hover:bg-surface-parchment rounded-lg" onClick={() => setIsAddModModalOpen(false)}>Cancelar</button>
              <button type="button" className="px-5 py-2 bg-primary-container hover:bg-chrome-hover text-text-on-dark font-label-md text-[13px] rounded-lg shadow font-semibold transition-all" onClick={() => setIsAddModModalOpen(false)}>Conceder Credencial</button>
            </div>
          </div>
        </div>
      )}

      {editingFaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/60 backdrop-blur-sm p-4">
          <div className="bg-surface-card rounded-xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 border border-border-parchment">
            <div className="flex items-center justify-between border-b border-border-parchment pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">edit</span>
                <h3 className="font-headline-sm text-[18px] text-primary">
                  Editar {editingFaction === 'team-a' ? 'Time A' : 'Time B'}
                </h3>
              </div>
              <button type="button" className="text-outline hover:text-primary" onClick={() => setEditingFaction(null)}>
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-label-md text-on-surface-variant mb-1 uppercase tracking-wider font-bold">Nome da Facção</label>
                <input 
                  type="text" 
                  className="w-full bg-surface-canvas-void border border-border-parchment rounded p-2 text-sm text-on-surface focus:outline-none focus:border-primary-fixed-dim" 
                  value={editFactionForm.name} 
                  onChange={e => setEditFactionForm({...editFactionForm, name: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-label-md text-on-surface-variant mb-1 uppercase tracking-wider font-bold">Ícone (Material Symbols)</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">{editFactionForm.icon || 'star'}</span>
                  <input 
                    type="text" 
                    className="w-full bg-surface-canvas-void border border-border-parchment rounded p-2 pl-10 text-sm text-on-surface focus:outline-none focus:border-primary-fixed-dim" 
                    value={editFactionForm.icon} 
                    onChange={e => setEditFactionForm({...editFactionForm, icon: e.target.value})} 
                  />
                </div>
                <p className="text-[11px] text-on-surface-variant mt-1.5 font-body-ui">Ex: directions_boat, shield, security, warning</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-2 pt-3 border-t border-border-parchment">
              <button type="button" className="px-4 py-2 text-primary font-label-md text-[13px] hover:bg-surface-parchment rounded-lg" onClick={() => setEditingFaction(null)}>Cancelar</button>
              <button type="button" className="px-5 py-2 bg-primary-container hover:bg-chrome-hover text-text-on-dark font-label-md text-[13px] rounded-lg shadow font-semibold transition-all" onClick={saveFactionSettings}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
