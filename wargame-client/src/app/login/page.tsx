"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [profile, setProfile] = useState<'timeA' | 'timeB' | 'judge' | 'observer'>('timeA');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(`Erro: ${error.message}`);
    } else {
      window.location.href = '/';
    }
    setLoading(false);
  };

  return (
    <div className="flex h-screen w-full flex-col justify-between tactical-grid-bg antialiased selection:bg-[#004b41] selection:text-[#f7f4eb]">
      {/* Top Operational Header Bar */}
      <header className="w-full bg-[#004b41] text-[#f7f4eb] h-16 px-6 flex items-center justify-between border-b border-[#003831] shadow-md shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-[#f7f4eb]/10 p-1 flex items-center justify-center border border-white/10">
            <img src="/ufsmun-logo.png" alt="UFSMUN Logo" className="w-full h-full object-contain filter drop-shadow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-sm tracking-wider uppercase">UFSMUN KRIEGSPIEL</span>
            </div>
            <p className="text-[11px] text-[#f7f4eb]/70 tracking-tight font-karla">MESA DE OPERAÇÕES • SIMULAÇÃO DE CRISE TÁTICA</p>
          </div>
        </div>

        {/* Right Telemetry Status */}
        <div className="flex items-center gap-4 text-right hidden sm:flex">
          <div className="text-xs">
            <div className="text-[#f7f4eb] font-mono font-semibold tracking-wider">ZULU 14:00:00Z</div>
            <div className="text-[11px] text-[#f7f4eb]/60">CONEXÃO CRIPTOGRAFADA</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
          </div>
        </div>
      </header>

      {/* Main Login Workspace Canvas */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative">
        
        {/* Subtle Tactical Coordinate Watermarks */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 hidden xl:block pointer-events-none opacity-25 select-none text-[10px] font-mono text-[#f7f4eb] space-y-4">
          <div>// LAT 26°34'12"N LONG 56°15'00"E</div>
          <div>// MGRS: 40RCN 2514 3892</div>
          <div>// THEATER: STRAIT OF HORMUZ</div>
          <div>// PROTOCOL: C2-WAR-CABINET-V2</div>
        </div>

        <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden xl:block pointer-events-none opacity-25 select-none text-[10px] font-mono text-[#f7f4eb] text-right space-y-4">
          <div>SEC-LEVEL: COMM-SEC-ALPHA //</div>
          <div>ENCRYPTION: AES-256-GCM //</div>
          <div>SESSION TIME LIMIT: 120 MIN //</div>
          <div>DELEGATION NODE: AUTH-GATEWAY //</div>
        </div>

        {/* Login Modal/Card Container */}
        <div className="w-full max-w-md parchment-card rounded-lg overflow-hidden relative z-10">
          
          {/* Card Tactical Top Ribbon */}
          <div className="bg-[#004b41] text-[#f7f4eb] px-6 py-4 border-b border-[#003831] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-[#2d7d74] flex items-center justify-center text-white font-bold text-xs shadow-inner">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
              </div>
              <div>
                <h1 className="font-heading font-bold text-sm tracking-wide text-white">Mesa de Operações</h1>
                <p className="text-[11px] text-[#f7f4eb]/80 font-karla">Acesso do Delegado &amp; Moderador</p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-[#003831] text-emerald-300 border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              RODADA 03
            </span>
          </div>

          {/* Card Body Content */}
          <div className="p-6 sm:p-7 space-y-5">
            
            {/* Welcome Note / Context */}
            <div className="border-b border-[#E3DFD1] pb-4">
              <h2 className="font-heading font-bold text-lg text-[#1a1a1a]">Autenticação Tática</h2>
              <p className="text-xs text-[#4a4a4a] mt-1 font-karla leading-relaxed">
                Insira suas credenciais institucionais para carregar a cartografia, posicionamento de forças e diretrizes operacionais do seu comitê.
              </p>
            </div>

            {/* Role / Team Quick Toggle Indicator */}
            <div>
              <label className="block text-[11px] font-heading font-bold uppercase tracking-wider text-[#4a4a4a] mb-2">
                Perfil de Acesso
              </label>
              <div className="grid grid-cols-2 gap-2">
                {/* Time A */}
                <button 
                  type="button" 
                  onClick={() => setProfile('timeA')}
                  className={`flex items-center justify-center gap-2 p-2 rounded text-xs font-heading font-semibold transition ${profile === 'timeA' ? 'border-2 border-[#2d7d74] bg-[#2d7d74]/10 text-[#004b41]' : 'border border-[#C9C3AE] bg-white text-[#4a4a4a] hover:border-[#2d7d74] hover:text-[#2d7d74]'}`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2d7d74]"></span>
                  <span>Time A (Aliados)</span>
                </button>
                
                {/* Time B */}
                <button 
                  type="button" 
                  onClick={() => setProfile('timeB')}
                  className={`flex items-center justify-center gap-2 p-2 rounded text-xs font-heading font-semibold transition ${profile === 'timeB' ? 'border-2 border-[#4e1a3d] bg-[#4e1a3d]/10 text-[#4e1a3d]' : 'border border-[#C9C3AE] bg-white text-[#4a4a4a] hover:border-[#4e1a3d] hover:text-[#4e1a3d]'}`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4e1a3d]"></span>
                  <span>Time B (Oposição)</span>
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-2">
                {/* Moderador / Juiz */}
                <button 
                  type="button" 
                  onClick={() => setProfile('judge')}
                  className={`flex items-center justify-center gap-2 p-2 rounded text-xs font-heading font-semibold transition ${profile === 'judge' ? 'border-2 border-[#004b41] bg-[#004b41]/10 text-[#004b41]' : 'border border-[#C9C3AE] bg-white text-[#4a4a4a] hover:border-[#004b41] hover:text-[#004b41]'}`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#004b41]"></span>
                  <span>Juiz / Moderador</span>
                </button>

                {/* Observador / Imprensa */}
                <button 
                  type="button" 
                  onClick={() => setProfile('observer')}
                  className={`flex items-center justify-center gap-2 p-2 rounded text-xs font-heading font-semibold transition ${profile === 'observer' ? 'border-2 border-[#26265b] bg-[#26265b]/10 text-[#26265b]' : 'border border-[#C9C3AE] bg-white text-[#4a4a4a] hover:border-[#26265b] hover:text-[#26265b]'}`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#26265b]"></span>
                  <span>Observador Civil</span>
                </button>
              </div>
            </div>

            {/* Login Form */}
            <form className="space-y-4" onSubmit={handleSignIn}>
              
              {/* E-mail / Indicativo */}
              <div>
                <label htmlFor="username" className="block text-xs font-heading font-semibold text-[#1a1a1a] mb-1">
                  Indicativo do Delegado / E-mail Institucional
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#757575]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                  </div>
                  <input 
                    id="username" 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ex: delegado.timeA@ufsmun.org" 
                    className="tactical-input w-full pl-9 pr-3 py-2.5 rounded text-sm text-[#1a1a1a] placeholder:text-[#8c887b]" 
                    required 
                  />
                </div>
              </div>

              {/* Chave de Acesso / Senha */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="password" className="text-xs font-heading font-semibold text-[#1a1a1a]">
                    Chave de Acesso Criptográfica
                  </label>
                  <a href="#" className="text-[11px] font-karla text-[#004b41] hover:text-[#2d7d74] hover:underline">
                    Esqueceu a chave?
                  </a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#757575]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                  </div>
                  <input 
                    id="password" 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Código de autenticação da delegação" 
                    className="tactical-input w-full pl-9 pr-10 py-2.5 rounded text-sm text-[#1a1a1a] font-mono" 
                    required 
                  />
                  <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#757575] hover:text-[#1a1a1a]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                    </svg>
                  </button>
                </div>
              </div>

              {message && <div className="text-sm text-[#c03a6b] font-medium">{message}</div>}

              {/* Opções Adicionais / Manter Conectado */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-[#4a4a4a]">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-[#004b41] border-[#C9C3AE] focus:ring-[#004b41] focus:ring-offset-0" />
                  <span>Manter estação autenticada neste turno</span>
                </label>
              </div>

              {/* Primary Submit Button */}
              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[#004b41] hover:bg-[#2d7d74] text-[#f7f4eb] py-3 px-4 rounded font-heading font-bold text-sm tracking-wide transition-colors flex items-center justify-center gap-2 shadow-sm active:translate-y-px disabled:opacity-70"
                >
                  <span>{loading ? 'Autenticando...' : 'Entrar na Mesa de Operações'}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                  </svg>
                </button>
              </div>
            </form>

            {/* Security & Support Notice */}
            <div className="pt-3 border-t border-[#E3DFD1] flex items-center justify-between text-[11px] text-[#757575]">
              <a href="#" className="text-[#004b41] hover:underline font-medium">Contatar Mesa Diretora</a>
            </div>

          </div>

          {/* Card Bottom Military Bar */}
          <div className="bg-[#f0ece0] px-6 py-2.5 border-t border-[#E3DFD1] flex items-center justify-between text-[11px] text-[#4a4a4a] font-mono">
            <span>STATUS: SISTEMA OPERACIONAL</span>
            <span className="text-[#2d7d74] font-semibold">LATÊNCIA: 14ms</span>
          </div>

        </div>

      </main>

      {/* Bottom Regulatory / Operational Footer */}
      <footer className="w-full bg-[#181d1a] border-t border-white/5 py-3 px-6 text-center text-xs text-[#f7f4eb]/50 font-karla shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-heading font-semibold text-[#f7f4eb]/80">UFSMUN Kriegspiel</span>
            <span className="hidden sm:inline">•</span>
            <span>Simulação de Crise Tática</span>
          </div>
          <div className="font-mono text-[11px] text-[#f7f4eb]/40 mt-2 sm:mt-0">
            AVISO: O uso não autorizado constitui infração grave ao regulamento do comitê de crise.
          </div>
          <div className="mt-2 sm:mt-0">
            Versão 2.4-KRIEG • UFSM
          </div>
        </div>
      </footer>
    </div>
  );
}
