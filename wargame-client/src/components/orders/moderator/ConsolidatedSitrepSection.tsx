"use client";
import React, { useState, useRef } from 'react';
import { TurnSitrep, LinkedEntity, OrderAttachment } from '@/types/orders';

interface ConsolidatedSitrepSectionProps {
  sitrep: TurnSitrep;
  currentTurn: number;
  onUpdateSitrep: (updated: TurnSitrep) => void;
  onSaveDraftSitrep: () => void;
  onOpenAdvanceTurnModal: () => void;
}

type SitrepChannel = 'public' | 'teamA' | 'teamB';

export default function ConsolidatedSitrepSection({
  sitrep,
  currentTurn,
  onUpdateSitrep,
  onSaveDraftSitrep,
  onOpenAdvanceTurnModal,
}: ConsolidatedSitrepSectionProps) {
  const [activeTab, setActiveTab] = useState<SitrepChannel>('public');
  const [isExpandedRows, setIsExpandedRows] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [showAddEntityInput, setShowAddEntityInput] = useState(false);
  const [newEntityLabel, setNewEntityLabel] = useState('');
  const [newEntityKind, setNewEntityKind] = useState<'unit' | 'poi'>('unit');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getCurrentText = () => {
    if (activeTab === 'public') return sitrep.public_text;
    if (activeTab === 'teamA') return sitrep.team_a_text;
    return sitrep.team_b_text;
  };

  const setCurrentText = (val: string) => {
    if (activeTab === 'public') onUpdateSitrep({ ...sitrep, public_text: val });
    else if (activeTab === 'teamA') onUpdateSitrep({ ...sitrep, team_a_text: val });
    else onUpdateSitrep({ ...sitrep, team_b_text: val });
  };

  const getCurrentEntities = (): LinkedEntity[] => {
    if (activeTab === 'public') return sitrep.public_linked_entities;
    if (activeTab === 'teamA') return sitrep.team_a_linked_entities;
    return sitrep.team_b_linked_entities;
  };

  const setCurrentEntities = (entities: LinkedEntity[]) => {
    if (activeTab === 'public')
      onUpdateSitrep({ ...sitrep, public_linked_entities: entities });
    else if (activeTab === 'teamA')
      onUpdateSitrep({ ...sitrep, team_a_linked_entities: entities });
    else onUpdateSitrep({ ...sitrep, team_b_linked_entities: entities });
  };

  const getCurrentAttachments = (): OrderAttachment[] => {
    if (activeTab === 'public') return sitrep.public_attachments;
    if (activeTab === 'teamA') return sitrep.team_a_attachments;
    return sitrep.team_b_attachments;
  };

  const setCurrentAttachments = (atts: OrderAttachment[]) => {
    if (activeTab === 'public')
      onUpdateSitrep({ ...sitrep, public_attachments: atts });
    else if (activeTab === 'teamA')
      onUpdateSitrep({ ...sitrep, team_a_attachments: atts });
    else onUpdateSitrep({ ...sitrep, team_b_attachments: atts });
  };

  const handleRemoveEntity = (id: string) => {
    setCurrentEntities(getCurrentEntities().filter((e) => e.id !== id));
  };

  const handleAddEntity = () => {
    if (!newEntityLabel.trim()) return;
    const item: LinkedEntity = {
      id: `ent-${Date.now()}`,
      label: newEntityLabel.trim(),
      kind: newEntityKind,
      icon: newEntityKind === 'poi' ? 'location_on' : 'shield',
      faction:
        activeTab === 'teamB'
          ? 'opposing'
          : newEntityKind === 'poi'
          ? 'neutral'
          : 'allied',
    };
    setCurrentEntities([...getCurrentEntities(), item]);
    setNewEntityLabel('');
    setShowAddEntityInput(false);
  };

  const handleRemoveAttachment = (id: string) => {
    setCurrentAttachments(getCurrentAttachments().filter((a) => a.id !== id));
  };

  const handleUploadFiles = (files: FileList | null) => {
    if (!files) return;
    const added: OrderAttachment[] = Array.from(files).map((f, i) => {
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      const sizeStr =
        f.size > 1024 * 1024
          ? `(${(f.size / (1024 * 1024)).toFixed(1)} MB)`
          : `(${Math.max(1, Math.round(f.size / 1024))} KB)`;
      return {
        id: `sitrep-att-${Date.now()}-${i}`,
        name: f.name,
        size: sizeStr.replace(/[()]/g, ''),
        type: ext === 'pdf' ? 'pdf' : ext === 'kml' ? 'kml' : 'image',
      };
    });
    setCurrentAttachments([...getCurrentAttachments(), ...added]);
  };

  const handleSaveDraftClick = () => {
    onSaveDraftSitrep();
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1500);
  };

  const currentText = getCurrentText();
  const currentEntities = getCurrentEntities();
  const currentAttachments = getCurrentAttachments();

  const isTeamBTab = activeTab === 'teamB';
  const isTeamATab = activeTab === 'teamA';

  const panelBgClass =
    activeTab === 'public'
      ? 'bg-[#f2eee3] border-[#e2dccf]'
      : activeTab === 'teamA'
      ? 'bg-[#f3f9f7] border-[#c4e3dc]'
      : 'bg-[#fdf5f7] border-[#f0ced7]';

  const accentTextColor = isTeamBTab ? 'text-[#8a2444]' : 'text-[#004d40]';
  const dividerColor =
    activeTab === 'public'
      ? 'border-[#ded7c7]'
      : activeTab === 'teamA'
      ? 'border-[#b8dfd6]'
      : 'border-[#e5b9c5]';

  return (
    <section
      className="bg-white rounded-xl p-5 border border-[#e5dfce] shadow-sm flex flex-col gap-4"
      id="sitrep-section"
    >
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#eee8d9] gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#e8f3f0] text-[#004d40] flex items-center justify-center font-bold border border-[#b8dfd6]">
            <span className="material-symbols-outlined text-[22px]">description</span>
          </div>
          <div>
            <h2 className="font-headline text-[16px] font-bold text-[#00322b]">
              SITREP Consolidado do Turno 0{currentTurn}
            </h2>
            <p className="text-[13px] text-[#475569]">
              Síntese da adjudicação para publicação aberta e deliberações de atrito acumulado.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpandedRows((prev) => !prev)}
            className="px-2.5 py-1 rounded bg-[#fbf9f4] hover:bg-[#f2eee3] text-[#00322b] font-headline text-[10px] font-bold uppercase tracking-wider border border-[#d6cfbe] shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
            title="Expandir visualização do SITREP"
          >
            <span className="material-symbols-outlined text-[15px] text-[#004d40]">
              open_in_full
            </span>
            <span>{isExpandedRows ? 'Recolher SITREP' : 'Expandir SITREP'}</span>
          </button>
        </div>
      </div>

      {/* NAVEGAÇÃO POR ABAS / TAB SYSTEM */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 p-1 bg-[#f2eee3] rounded-lg border border-[#e2dccf] overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('public')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded font-headline text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'public'
                ? 'bg-white text-[#004d40] shadow-sm border border-[#d6cfbe]'
                : 'text-[#475569] hover:text-[#004d40] hover:bg-white/50 border border-transparent'
            }`}
          >
            <span className="material-symbols-outlined text-[16px] text-[#004d40]">public</span>
            <span>SITREP Geral (Público / Todos)</span>
            <span className="ml-1 px-1.5 py-0.5 rounded bg-[#d6ede6] text-[#004d40] text-[9px] font-bold">
              Transmitido a Todos
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('teamA')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded font-headline text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'teamA'
                ? 'bg-white text-[#004d40] shadow-sm border border-[#c4e3dc]'
                : 'text-[#475569] hover:text-[#004d40] hover:bg-white/50 border border-transparent'
            }`}
          >
            <span className="material-symbols-outlined text-[16px] text-[#1b6d61]">lock</span>
            <span>Canal Confidencial Time A (Governo)</span>
            <span className="w-2 h-2 rounded-full bg-[#1b6d61]"></span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('teamB')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded font-headline text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'teamB'
                ? 'bg-white text-[#8a2444] shadow-sm border border-[#f0ced7]'
                : 'text-[#475569] hover:text-[#8a2444] hover:bg-white/50 border border-transparent'
            }`}
          >
            <span className="material-symbols-outlined text-[16px] text-[#8a2444]">lock</span>
            <span>Canal Confidencial Time B (Revoltosos)</span>
            <span className="w-2 h-2 rounded-full bg-[#8a2444]"></span>
          </button>
        </div>

        {/* ACTIVE TAB PANEL */}
        <div className={`flex flex-col gap-2.5 p-4 rounded-lg border ${panelBgClass}`}>
          <div
            className={`flex items-center justify-between flex-wrap gap-2 pb-2 border-b ${dividerColor}`}
          >
            <div className="flex items-center gap-2">
              {activeTab === 'public' ? (
                <>
                  <span className="px-2 py-0.5 rounded bg-[#004d40] text-white font-headline text-[10px] font-bold uppercase tracking-wider">
                    Transmissão Aberta
                  </span>
                  <span className="text-[11px] text-[#475569] font-medium">
                    Audiência: <strong>Ambas as Facções &amp; Painel Público</strong>
                  </span>
                </>
              ) : isTeamATab ? (
                <>
                  <span className="px-2 py-0.5 rounded bg-[#1b6d61] text-white font-headline text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">vpn_key</span>
                    Canal Seguro Cifrado
                  </span>
                  <span className="text-[11px] text-[#004d40] font-medium">
                    Audiência: <strong>Comando de Força • Time A (Governo)</strong>
                  </span>
                </>
              ) : (
                <>
                  <span className="px-2 py-0.5 rounded bg-[#8a2444] text-white font-headline text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">vpn_key</span>
                    Canal Seguro Cifrado
                  </span>
                  <span className="text-[11px] text-[#8a2444] font-medium">
                    Audiência: <strong>Alto Comando Insurgente • Time B (Revoltosos)</strong>
                  </span>
                </>
              )}
            </div>

            {/* Formatting Toolbar */}
            <div
              className={`flex items-center gap-1 bg-[#fbf9f4] px-2 py-1 rounded shadow-inner flex-wrap border ${dividerColor}`}
            >
              <button
                type="button"
                onClick={() => setCurrentText(currentText + ' **destaque**')}
                className={`p-1 hover:bg-[#f2eee3] rounded ${accentTextColor} font-bold text-label-md transition-colors cursor-pointer`}
                title="Negrito"
              >
                <span className="material-symbols-outlined text-[16px]">format_bold</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentText(currentText + ' *itálico*')}
                className={`p-1 hover:bg-[#f2eee3] rounded ${accentTextColor} text-label-md transition-colors cursor-pointer`}
                title="Itálico"
              >
                <span className="material-symbols-outlined text-[16px]">format_italic</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentText(currentText + ' __sublinhado__')}
                className={`p-1 hover:bg-[#f2eee3] rounded ${accentTextColor} text-label-md transition-colors cursor-pointer`}
                title="Sublinhado"
              >
                <span className="material-symbols-outlined text-[16px]">format_underlined</span>
              </button>
              <div className="w-px h-4 bg-[#dcd5c5] mx-1"></div>
              <button
                type="button"
                onClick={() => setCurrentText(currentText + '\n- ')}
                className={`p-1 hover:bg-[#f2eee3] rounded ${accentTextColor} text-label-md transition-colors cursor-pointer`}
                title="Lista Tática"
              >
                <span className="material-symbols-outlined text-[16px]">
                  format_list_bulleted
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentText(currentText + '\n1. ')}
                className={`p-1 hover:bg-[#f2eee3] rounded ${accentTextColor} text-label-md transition-colors cursor-pointer`}
                title="Lista Numerada"
              >
                <span className="material-symbols-outlined text-[16px]">
                  format_list_numbered
                </span>
              </button>
            </div>
          </div>

          <textarea
            rows={isExpandedRows ? 8 : 4}
            value={currentText}
            onChange={(e) => setCurrentText(e.target.value)}
            className={`w-full bg-white rounded-md p-3 text-[13px] text-[#1e293b] border ${
              isTeamBTab
                ? 'border-[#e5b9c5] focus:border-[#8a2444]'
                : 'border-[#d6cfbe] focus:border-[#004d40]'
            } outline-none resize-y leading-relaxed shadow-xs font-body`}
          />

          <div className="flex items-center justify-between text-[11px] text-[#475569] pt-1">
            {activeTab !== 'public' ? (
              <span className={`flex items-center gap-1 font-medium ${accentTextColor}`}>
                <span className="material-symbols-outlined text-[14px]">verified_user</span>
                {isTeamATab
                  ? 'Canal reservado ao Governo / Coalizão'
                  : 'Canal reservado ao Time B (Revoltosos)'}
              </span>
            ) : (
              <span></span>
            )}
            <span className="font-mono text-[10px]">{currentText.length} caracteres</span>
          </div>

          {/* UNIDADES E POIS VINCULADOS AO RELATÓRIO */}
          <div className={`mt-3 pt-3 border-t ${dividerColor} flex flex-col gap-2`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span
                className={`font-headline text-[10px] font-bold uppercase tracking-wider ${accentTextColor} flex items-center gap-1.5`}
              >
                <span className="material-symbols-outlined text-[15px]">link</span>
                Unidades e POIs Vinculados ao Relatório
              </span>
              <button
                type="button"
                onClick={() => setShowAddEntityInput((prev) => !prev)}
                className={`px-2 py-0.5 rounded bg-white hover:bg-[#fbf9f4] ${accentTextColor} font-headline text-[10px] font-bold uppercase tracking-wider border ${
                  isTeamBTab ? 'border-[#e5b9c5]' : 'border-[#b2ded2]'
                } shadow-xs flex items-center gap-1 cursor-pointer`}
              >
                <span className="material-symbols-outlined text-[13px]">add</span>
                + Vincular Unidade / POI
              </button>
            </div>

            {showAddEntityInput && (
              <div className="flex items-center gap-2 bg-white p-2 rounded border border-[#d6cfbe]">
                <select
                  value={newEntityKind}
                  onChange={(e) => setNewEntityKind(e.target.value as 'unit' | 'poi')}
                  className="text-[11px] border border-[#d6cfbe] rounded px-2 py-1 text-[#1e293b]"
                >
                  <option value="unit">Unidade</option>
                  <option value="poi">POI / Setor</option>
                </select>
                <input
                  type="text"
                  value={newEntityLabel}
                  onChange={(e) => setNewEntityLabel(e.target.value)}
                  placeholder="Ex: 1ª Brigada Blindada ou POI: Cota 142"
                  className="flex-1 text-[12px] border border-[#d6cfbe] rounded px-2.5 py-1 text-[#1e293b] outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddEntity}
                  className="px-2.5 py-1 bg-[#004d40] text-white font-headline text-[10px] font-bold uppercase rounded cursor-pointer"
                >
                  Vincular
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-1.5">
              {currentEntities.map((ent) => {
                const isPoi = ent.kind === 'poi';
                const chipClass = isPoi
                  ? 'bg-[#fffaf5] border-[#fbd8b3] text-[#b45309]'
                  : isTeamBTab
                  ? 'bg-white border-[#e5b9c5] text-[#8a2444]'
                  : 'bg-white border-[#b2ded2] text-[#004d40]';
                const iconColor = isPoi
                  ? 'text-[#c2410c]'
                  : isTeamBTab
                  ? 'text-[#8a2444]'
                  : 'text-[#1b6d61]';

                return (
                  <span
                    key={ent.id}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-headline font-semibold shadow-xs ${chipClass}`}
                  >
                    <span className={`material-symbols-outlined text-[13px] ${iconColor}`}>
                      {ent.icon}
                    </span>
                    {ent.label}
                    <button
                      type="button"
                      onClick={() => handleRemoveEntity(ent.id)}
                      className="hover:text-[#b91c1c] ml-1 flex items-center cursor-pointer"
                      title="Remover vínculo"
                    >
                      <span className="material-symbols-outlined text-[12px]">close</span>
                    </button>
                  </span>
                );
              })}
            </div>
          </div>

          {/* ANEXOS E DOCUMENTOS DO DESPACHO */}
          <div className={`mt-2 pt-2 border-t ${dividerColor} flex flex-col gap-2`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span
                className={`font-headline text-[10px] font-bold uppercase tracking-wider ${
                  activeTab === 'public' ? 'text-[#475569]' : accentTextColor
                } flex items-center gap-1.5`}
              >
                <span className={`material-symbols-outlined text-[15px] ${accentTextColor}`}>
                  folder_open
                </span>
                Anexos e Documentos do Despacho
              </span>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleUploadFiles(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`px-2 py-0.5 rounded bg-white hover:bg-[#fbf9f4] ${
                  isTeamBTab ? 'text-[#8a2444] border-[#e5b9c5]' : 'text-[#00322b] border-[#d6cfbe]'
                } font-headline text-[10px] font-bold uppercase tracking-wider border shadow-xs flex items-center gap-1 cursor-pointer`}
              >
                <span className="material-symbols-outlined text-[13px]">upload_file</span>
                + Adicionar Arquivo Anexo
              </button>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleUploadFiles(e.dataTransfer.files);
              }}
              className={`p-2.5 rounded-lg border border-dashed ${
                isTeamBTab ? 'border-[#e8c0cf]' : 'border-[#b8dfd6]'
              } bg-white flex flex-col sm:flex-row items-center justify-between gap-2.5`}
            >
              <div className="flex flex-wrap items-center gap-2">
                {currentAttachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#fbf9f4] border border-[#ded7c7] text-[11px] font-mono text-[#1e293b]"
                  >
                    <span className={`material-symbols-outlined text-[14px] ${accentTextColor}`}>
                      {att.type === 'pdf'
                        ? 'picture_as_pdf'
                        : att.type === 'kml'
                        ? 'data_object'
                        : 'image'}
                    </span>
                    <span>{att.name}</span>
                    <span className="text-[10px] text-[#475569] font-sans font-medium">
                      ({att.size})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="hover:text-[#b91c1c] ml-1 cursor-pointer"
                      title="Remover anexo"
                    >
                      <span className="material-symbols-outlined text-[13px]">delete</span>
                    </button>
                  </div>
                ))}
              </div>
              <span className="text-[10px] text-[#475569] italic font-medium">
                {isTeamBTab
                  ? 'Canal de despacho seguro Time B'
                  : 'Arraste novos documentos ou clique para upload'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM ACTION BAR: SALVAR RASCUNHO & ENCERRAR AVALIAÇÃO */}
      <div className="pt-3 border-t border-[#eee8d9] flex flex-col md:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleSaveDraftClick}
          className={`w-full md:w-auto px-5 py-3 rounded-xl font-headline text-[12px] font-bold uppercase tracking-wider border shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer ${
            savedToast
              ? 'bg-[#15803d] text-white border-[#15803d]'
              : 'bg-white hover:bg-[#fbf9f4] text-[#004d40] hover:text-[#00322b] border-[#b2ded2]'
          }`}
        >
          <span
            className={`material-symbols-outlined text-[18px] ${
              savedToast ? 'text-white' : 'text-[#004d40]'
            }`}
          >
            save
          </span>
          <span>{savedToast ? 'SALVO ✓' : 'SALVAR RASCUNHO SITREP'}</span>
        </button>

        <button
          type="button"
          onClick={onOpenAdvanceTurnModal}
          className="w-full md:w-auto px-6 py-3 rounded-xl bg-[#00322b] hover:bg-[#00473d] text-white font-headline text-[13px] font-extrabold uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2.5 group cursor-pointer border border-[#002621]"
        >
          <span className="material-symbols-outlined text-[22px] text-[#a4f1e5] group-hover:translate-x-1 transition-transform">
            skip_next
          </span>
          <span>ENCERRAR AVALIAÇÃO &amp; AVANÇAR TURNO</span>
        </button>
      </div>
    </section>
  );
}
