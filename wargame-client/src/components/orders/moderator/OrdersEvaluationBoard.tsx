"use client";
import React, { useState } from 'react';
import { TurnOrder, OrderVerdict } from '@/types/orders';

interface OrdersEvaluationBoardProps {
  orders: TurnOrder[];
  currentTurn: number;
  onSaveVerdict: (orderId: string, verdict: OrderVerdict, feedback: string) => void;
  onInspectOrder: (order: TurnOrder) => void;
  onScrollToSitrep: () => void;
}

export default function OrdersEvaluationBoard({
  orders,
  currentTurn,
  onSaveVerdict,
  onInspectOrder,
  onScrollToSitrep,
}: OrdersEvaluationBoardProps) {
  const [draftEdits, setDraftEdits] = useState<
    Record<string, { verdict: OrderVerdict; feedback: string }>
  >({});
  const [savedToastIds, setSavedToastIds] = useState<Record<string, boolean>>({});
  const [showAttritionCalc, setShowAttritionCalc] = useState(false);

  const teamAOrders = orders.filter((o) => o.team === 'Player A');
  const teamBOrders = orders.filter((o) => o.team === 'Player B');

  const evaluatedCount = orders.filter((o) => Boolean(o.verdict)).length;
  const pendingCount = orders.length - evaluatedCount;

  const teamAEvaluated = teamAOrders.filter((o) => Boolean(o.verdict)).length;
  const teamBEvaluated = teamBOrders.filter((o) => Boolean(o.verdict)).length;

  const getOrderEdit = (order: TurnOrder) => {
    return (
      draftEdits[order.id] ?? {
        verdict: order.verdict || '',
        feedback: order.moderator_feedback || '',
      }
    );
  };

  const handleFieldChange = (
    order: TurnOrder,
    field: 'verdict' | 'feedback',
    value: string
  ) => {
    const current = getOrderEdit(order);
    setDraftEdits((prev) => ({
      ...prev,
      [order.id]: {
        ...current,
        [field]: value,
      },
    }));
  };

  const handleSave = (order: TurnOrder) => {
    const current = getOrderEdit(order);
    const chosenVerdict = (current.verdict || 'Sucesso Parcial') as OrderVerdict;
    onSaveVerdict(order.id, chosenVerdict, current.feedback);
    setSavedToastIds((prev) => ({ ...prev, [order.id]: true }));
    setTimeout(() => {
      setSavedToastIds((prev) => ({ ...prev, [order.id]: false }));
    }, 1500);
  };

  const renderOrderCard = (order: TurnOrder, isTeamA: boolean) => {
    const edit = getOrderEdit(order);
    const isPending = !order.verdict;
    const isSaved = savedToastIds[order.id];

    const hoverBorder = isTeamA ? 'hover:border-[#004d40]' : 'hover:border-[#8a2444]';
    const pendingBorder = isPending
      ? isTeamA
        ? 'border-l-4 border-l-[#c2410c]'
        : 'border-l-4 border-l-[#b91c1c]'
      : '';

    return (
      <div
        key={order.id}
        className={`bg-white rounded-xl p-4 border border-[#e5dfce] ${pendingBorder} shadow-xs ${hoverBorder} transition-colors flex flex-col gap-2.5`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <span
              className={`font-headline text-[10px] font-bold uppercase tracking-widest block ${
                isPending
                  ? isTeamA
                    ? 'text-[#b45309]'
                    : 'text-[#8a2444]'
                  : isTeamA
                  ? 'text-[#28685e]'
                  : 'text-[#b45309]'
              }`}
            >
              {order.code} • {order.brigade_name}
            </span>
            <button
              type="button"
              onClick={() => onInspectOrder(order)}
              className="text-left font-headline text-[14px] font-bold text-[#1e293b] hover:text-[#004d40] cursor-pointer transition-colors underline decoration-dotted underline-offset-2"
            >
              {order.title}
            </button>
          </div>
          {isPending ? (
            <span className="px-2 py-0.5 rounded bg-[#fef2f2] text-[#b91c1c] font-headline text-[10px] font-bold uppercase tracking-wider shrink-0 border border-[#fecaca] animate-pulse">
              Pendente
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-[#e2f0ed] text-[#004d40] font-headline text-[10px] font-bold uppercase tracking-wider shrink-0 border border-[#b2ded2]">
              {order.verdict}
            </span>
          )}
        </div>

        <p className="text-[13px] text-[#475569] line-clamp-2">
          <strong className="text-[#1e293b] font-semibold">Intenção:</strong>{' '}
          {order.intent_summary}
        </p>

        <div className="flex flex-col gap-2 pt-2 border-t border-[#eee8d9] text-[12px]">
          <div className="flex items-center justify-between gap-2">
            <span className="font-headline text-[11px] text-[#475569]">
              <strong
                className={`${
                  isTeamA ? 'text-[#004d40]' : 'text-[#8a2444]'
                } font-bold uppercase tracking-wider`}
              >
                Empenho:
              </strong>{' '}
              {order.commitment_summary}
            </span>
            <button
              type="button"
              onClick={() => onInspectOrder(order)}
              className="px-2.5 py-1 rounded bg-[#f2eee3] hover:bg-[#e4ded0] text-[#00322b] font-headline text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border border-[#d6cfbe] shrink-0 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">visibility</span>
              <span>Detalhes</span>
            </button>
          </div>

          {order.attachments && order.attachments.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-headline text-[9px] text-[#475569] uppercase font-bold tracking-wider">
                Anexos da Ordem:
              </span>
              {order.attachments.map((att) => (
                <span
                  key={att.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white text-[10px] text-[#1e293b] border border-[#d6cfbe] font-mono"
                >
                  <span
                    className={`material-symbols-outlined text-[12px] ${
                      isTeamA ? 'text-[#004d40]' : 'text-[#8a2444]'
                    }`}
                  >
                    attach_file
                  </span>
                  {att.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Referee Decision Box */}
        <div
          className={`mt-1 p-2.5 rounded-lg flex flex-col gap-2 border ${
            isPending
              ? isTeamA
                ? 'bg-[#fffaf5] border-[#fbd8b3]'
                : 'bg-[#fff5f5] border-[#fecaca]'
              : 'bg-[#f2eee3] border-[#ded7c7]'
          }`}
        >
          <label
            className={`font-headline text-[10px] font-bold uppercase ${
              isPending
                ? isTeamA
                  ? 'text-[#c2410c]'
                  : 'text-[#b91c1c]'
                : 'text-[#00322b]'
            }`}
          >
            {isPending
              ? 'Avaliação da Mesa (Aguardando Parecer):'
              : 'Parecer da Mesa Arbitral:'}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              value={edit.verdict}
              onChange={(e) => handleFieldChange(order, 'verdict', e.target.value)}
              className="bg-white text-[#1e293b] text-[12px] rounded px-2.5 py-1.5 outline-none border border-[#d6cfbe] focus:border-[#004d40] font-medium shadow-xs"
            >
              <option value="" disabled>
                Selecionar Veredito...
              </option>
              <option value="Sucesso Total">Sucesso Total</option>
              <option value="Sucesso Parcial">Sucesso Parcial</option>
              <option value="Falha / Repelido">Falha / Repelido</option>
              <option value="Embate Conflitante">Embate Conflitante</option>
              <option value="Impugnada">Impugnada</option>
              <option value="Inócuo">Inócuo</option>
            </select>
            <input
              type="text"
              value={edit.feedback}
              onChange={(e) => handleFieldChange(order, 'feedback', e.target.value)}
              placeholder="Registrar atrito e impacto no grid..."
              className="sm:col-span-2 bg-white text-[#1e293b] text-[12px] rounded px-2.5 py-1.5 outline-none border border-[#d6cfbe] focus:border-[#004d40] shadow-xs"
            />
          </div>
          <div className="flex justify-end pt-0.5">
            <button
              type="button"
              onClick={() => handleSave(order)}
              className={`px-3 py-1 rounded font-headline text-[10px] font-bold uppercase tracking-wider transition-colors shadow-xs cursor-pointer ${
                isSaved
                  ? 'bg-[#15803d] text-white'
                  : 'bg-[#004d40] text-white hover:bg-[#00322b]'
              }`}
            >
              {isSaved ? 'SALVO ✓' : 'Salvar Parecer'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* TOP BAR WITH ORDER METRICS & OPERATIONAL ACTION BAR */}
      <section className="bg-white rounded-xl p-4 shadow-sm border border-[#e5dfce] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#e6f2ee] text-[#00322b] flex items-center justify-center font-bold border border-[#b2dcd2]">
              <span className="material-symbols-outlined text-[22px]">rate_review</span>
            </div>
            <div>
              <h1 className="font-headline text-[18px] font-bold text-[#00322b] leading-tight">
                Quadro de Avaliação de Ordens
              </h1>
              <p className="text-[13px] text-[#475569]">
                Turno 0{currentTurn} • Operação Tempestade do Vale // Fase de Atrito Terrestre
              </p>
            </div>
          </div>

          {/* Order Metrics Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded bg-[#f2eee3] border border-[#ded7c7] text-[#00322b] font-headline text-[10px] font-bold uppercase tracking-wider">
              Total:{' '}
              <strong className="text-[#004d40] font-black ml-0.5">
                {orders.length} Ordens
              </strong>
            </span>
            <span className="px-2.5 py-1 rounded bg-[#dcf2ec] border border-[#a6ded1] text-[#004d40] font-headline text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">done_all</span>
              <span>{evaluatedCount} Avaliadas</span>
            </span>
            <span className="px-2.5 py-1 rounded bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] font-headline text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">pending_actions</span>
              <span>{pendingCount} Pendentes</span>
            </span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowAttritionCalc((prev) => !prev)}
            className="px-3 py-1.5 rounded bg-white hover:bg-[#f2eee3] text-[#00322b] font-headline text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 border border-[#d6cfbe] shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-[#28685e]">
              calculate
            </span>
            <span>Calculadora Atrito</span>
          </button>
          <button
            type="button"
            onClick={onScrollToSitrep}
            className="px-3 py-1.5 rounded bg-white hover:bg-[#f2eee3] text-[#00322b] font-headline text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 border border-[#d6cfbe] shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-[#28685e]">
              history_edu
            </span>
            <span>Histórico Sitrep</span>
          </button>
        </div>
      </section>

      {/* Optional Tactical Attrition Calculator Drawer */}
      {showAttritionCalc && (
        <section className="bg-[#f2eee3] rounded-xl p-4 border border-[#d6cfbe] shadow-inner flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#004d40] text-[22px]">
              casino
            </span>
            <div>
              <h3 className="font-headline text-[13px] font-bold text-[#00322b] uppercase">
                Simulador Rápido de Atrito C2 (Padrão Lanchester)
              </h3>
              <p className="text-[12px] text-[#475569]">
                Fator de terreno: Desfiladeiro (+25% Defesa) • Apoio Aéreo: Ativo (+15% Coalizão)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAttritionCalc(false)}
            className="px-2.5 py-1 rounded bg-white text-[#00322b] font-headline text-[10px] font-bold uppercase border border-[#d6cfbe] cursor-pointer"
          >
            Fechar Calculadora
          </button>
        </section>
      )}

      {/* SIDE-BY-SIDE COLUMNS: DOSSIÊ TIME A vs DOSSIÊ TIME B */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* TIME A DOSSIER COLUMN (GOVERNO / COALIZÃO) */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl p-3.5 border-t-4 border-[#1b6d61] border border-[#e5dfce] shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded bg-[#1b6d61] shadow-xs"></span>
              <div>
                <h3 className="font-headline text-[14px] font-bold text-[#00322b]">
                  Time A • Governo / Coalizão
                </h3>
                <span className="font-headline text-[10px] text-[#004d40] font-semibold uppercase tracking-wider">
                  Dossiê Operacional ({teamAOrders.length} Ordens Submetidas)
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-[#e1f3ef] text-[#004d40] font-headline text-[10px] font-bold uppercase border border-[#b7e3d8]">
              {teamAEvaluated}/{teamAOrders.length} Avaliadas
            </span>
          </div>

          {teamAOrders.map((order) => renderOrderCard(order, true))}
        </div>

        {/* TIME B DOSSIER COLUMN (REVOLTOSOS / SAA) */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl p-3.5 border-t-4 border-[#8a2444] border border-[#e5dfce] shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded bg-[#8a2444] shadow-xs"></span>
              <div>
                <h3 className="font-headline text-[14px] font-bold text-[#8a2444]">
                  Time B • Revoltosos / SAA
                </h3>
                <span className="font-headline text-[10px] text-[#9a284e] font-semibold uppercase tracking-wider">
                  Dossiê Operacional ({teamBOrders.length} Ordens Submetidas)
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-[#f7e6ec] text-[#8a2444] font-headline text-[10px] font-bold uppercase border border-[#e8c0cf]">
              {teamBEvaluated}/{teamBOrders.length} Avaliadas
            </span>
          </div>

          {teamBOrders.map((order) => renderOrderCard(order, false))}
        </div>
      </section>
    </>
  );
}
