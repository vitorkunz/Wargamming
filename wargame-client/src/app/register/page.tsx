"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setMessage('Erro: As senhas não coincidem.');
      return;
    }

    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        }
      }
    });

    if (error) {
      setMessage(`Erro: ${error.message}`);
    } else {
      setSuccess(true);
      setMessage('Cadastro realizado! Faça o login na Mesa de Operações.');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen w-full flex-col justify-between tactical-grid-bg antialiased selection:bg-[#004b41] selection:text-[#f7f4eb] overflow-y-auto">
      {/* Top Operational Header Bar */}
      <header className="w-full bg-[#004b41] text-[#f7f4eb] h-16 px-6 flex items-center justify-between border-b border-[#003831] shadow-md shrink-0 z-20 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-[#f7f4eb]/10 p-1 flex items-center justify-center border border-white/10">
            <img src="/ufsmun-logo.png" alt="UFSMUN Logo" className="w-full h-full object-contain filter drop-shadow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-sm tracking-wider uppercase">UFSMUN GABINETE</span>
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

      {/* Main Register Workspace Canvas */}
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
          <div>NEW DELEGATE CLEARANCE //</div>
          <div>DELEGATION NODE: AUTH-GATEWAY //</div>
        </div>

        {/* Register Modal/Card Container */}
        <div className="w-full max-w-md parchment-card rounded-lg overflow-hidden relative z-10 my-8">
          
          {/* Card Tactical Top Ribbon */}
          <div className="bg-[#004b41] text-[#f7f4eb] px-6 py-4 border-b border-[#003831] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-[#2d7d74] flex items-center justify-center text-white font-bold text-xs shadow-inner">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                </svg>
              </div>
              <div>
                <h1 className="font-heading font-bold text-sm tracking-wide text-white">Registro de Operador</h1>
                <p className="text-[11px] text-[#f7f4eb]/80 font-karla">Credenciamento de Novo Delegado</p>
              </div>
            </div>
            <button 
              onClick={() => router.push('/login')}
              className="text-xs font-mono text-[#f7f4eb]/80 hover:text-white transition-colors"
            >
              [ VOLTAR ]
            </button>
          </div>

          {/* Card Body Content */}
          <div className="p-6 sm:p-7 space-y-5">
            
            {/* Context */}
            <div className="border-b border-[#E3DFD1] pb-4">
              <h2 className="font-heading font-bold text-lg text-[#1a1a1a]">Solicitação de Acesso</h2>
              <p className="text-xs text-[#4a4a4a] mt-1 font-karla leading-relaxed">
                Preencha os dados operacionais abaixo para registrar suas credenciais e obter autorização de acesso ao sistema de comando.
              </p>
            </div>

            {/* Register Form */}
            {success ? (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#004b41]/10 flex items-center justify-center text-[#004b41]">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <div>
                  <h3 className="font-heading font-bold text-[#1a1a1a] mb-1">Credenciamento Aprovado</h3>
                  <p className="text-sm text-[#4a4a4a] font-karla mb-6">{message}</p>
                </div>
                <button 
                  onClick={() => router.push('/login')}
                  className="w-full bg-[#004b41] hover:bg-[#2d7d74] text-[#f7f4eb] py-3 px-4 rounded font-heading font-bold text-sm tracking-wide transition-colors"
                >
                  Ir para o Login
                </button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSignUp}>
                
                {/* Nome Completo */}
                <div>
                  <label htmlFor="name" className="block text-xs font-heading font-semibold text-[#1a1a1a] mb-1">
                    Nome Completo / Delegação
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#757575]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                      </svg>
                    </div>
                    <input 
                      id="name" 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nome do Operador" 
                      className="tactical-input w-full pl-9 pr-3 py-2.5 rounded text-sm text-[#1a1a1a] placeholder:text-[#8c887b]" 
                      required 
                    />
                  </div>
                </div>

                {/* E-mail */}
                <div>
                  <label htmlFor="email" className="block text-xs font-heading font-semibold text-[#1a1a1a] mb-1">
                    E-mail Institucional
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#757575]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                      </svg>
                    </div>
                    <input 
                      id="email" 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ex: delegado@ufsmun.org" 
                      className="tactical-input w-full pl-9 pr-3 py-2.5 rounded text-sm text-[#1a1a1a] placeholder:text-[#8c887b]" 
                      required 
                    />
                  </div>
                </div>

                {/* Senha */}
                <div>
                  <label htmlFor="password" className="text-xs font-heading font-semibold text-[#1a1a1a] mb-1 block">
                    Chave de Acesso (Senha)
                  </label>
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
                      placeholder="Mínimo 6 caracteres" 
                      className="tactical-input w-full pl-9 pr-3 py-2.5 rounded text-sm text-[#1a1a1a] font-mono" 
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                {/* Confirmar Senha */}
                <div>
                  <label htmlFor="confirmPassword" className="text-xs font-heading font-semibold text-[#1a1a1a] mb-1 block">
                    Confirmar Chave de Acesso
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#757575]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                      </svg>
                    </div>
                    <input 
                      id="confirmPassword" 
                      type="password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a senha" 
                      className="tactical-input w-full pl-9 pr-3 py-2.5 rounded text-sm text-[#1a1a1a] font-mono" 
                      required 
                      minLength={6}
                    />
                  </div>
                </div>

                {message && !success && <div className="text-sm text-[#c03a6b] font-medium">{message}</div>}

                {/* Primary Submit Button */}
                <div className="pt-4 flex gap-3 w-full">
                  <button 
                    type="button" 
                    onClick={() => router.push('/login')}
                    className="w-1/3 bg-[#f7f4eb] hover:bg-[#e8e2d1] text-[#004b41] border border-[#004b41]/20 py-3 px-2 rounded font-heading font-bold text-sm tracking-wide transition-colors flex items-center justify-center shadow-sm active:translate-y-px"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-2/3 bg-[#004b41] hover:bg-[#2d7d74] text-[#f7f4eb] py-3 px-4 rounded font-heading font-bold text-sm tracking-wide transition-colors flex items-center justify-center gap-2 shadow-sm active:translate-y-px disabled:opacity-70"
                  >
                    <span className="truncate">{loading ? 'Processando...' : 'Confirmar Registro'}</span>
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </button>
                </div>
              </form>
            )}

          </div>

          {/* Card Bottom Military Bar */}
          <div className="bg-[#f0ece0] px-6 py-2.5 border-t border-[#E3DFD1] flex items-center justify-between text-[11px] text-[#4a4a4a] font-mono">
            <span>STATUS: REGISTRO NOVO OPERADOR</span>
            <span className="text-[#2d7d74] font-semibold">SEC: VERIFICADO</span>
          </div>

        </div>

      </main>

      {/* Bottom Regulatory / Operational Footer */}
      <footer className="w-full bg-[#181d1a] border-t border-white/5 py-3 px-6 text-center text-xs text-[#f7f4eb]/50 font-karla shrink-0 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-heading font-semibold text-[#f7f4eb]/80">UFSMUN Gabinete</span>
            <span className="hidden sm:inline">•</span>
            <span>Simulação de Crise Tática</span>
          </div>
          <div className="font-mono text-[11px] text-[#f7f4eb]/40 mt-2 sm:mt-0">
            AVISO: Todas as credenciais cadastradas estão sujeitas à aprovação da moderação.
          </div>
          <div className="mt-2 sm:mt-0">
            Versão 2.4-KRIEG • UFSM
          </div>
        </div>
      </footer>
    </div>
  );
}
