"use client";
import React, { useState, useEffect } from 'react';
import {
  TurnOrder,
  TurnSitrep,
  C2ClockState,
  OrderVerdict,
} from '@/types/orders';
import {
  loadModeratorOrders,
  saveModeratorOrders,
  loadSitrep,
  saveSitrep,
  loadClockState,
  saveClockState,
  syncOrderVerdictToSupabase,
} from '@/lib/ordersService';
import C2TimeSidebar from './C2TimeSidebar';
import OrdersEvaluationBoard from './OrdersEvaluationBoard';
import ConsolidatedSitrepSection from './ConsolidatedSitrepSection';
import OrderDetailsModal from '../OrderDetailsModal';
import AdvanceTurnModal from './AdvanceTurnModal';

export default function ModeratorOrdersDesk() {
  const [orders, setOrders] = useState<TurnOrder[]>(() => loadModeratorOrders());
  const [sitrep, setSitrep] = useState<TurnSitrep>(() => loadSitrep());
  const [clockState, setClockState] = useState<C2ClockState>(() => loadClockState());

  const [inspectedOrder, setInspectedOrder] = useState<TurnOrder | null>(null);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [turnAdvancedBanner, setTurnAdvancedBanner] = useState<string | null>(null);

  // Sync on custom events across components/tabs
  useEffect(() => {
    const handleOrdersUpdate = () => setOrders(loadModeratorOrders());
    window.addEventListener('ufsmun:orders-updated', handleOrdersUpdate);
    return () => window.removeEventListener('ufsmun:orders-updated', handleOrdersUpdate);
  }, []);

  // Live timer countdown loop
  useEffect(() => {
    const interval = setInterval(() => {
      setClockState((prev) => {
        if (!prev.is_timer_running || prev.turn_time_remaining <= 0) return prev;
        const nextRemaining = prev.turn_time_remaining - 1;
        const nextState: C2ClockState = {
          ...prev,
          turn_time_remaining: nextRemaining,
          is_timer_running: nextRemaining > 0,
        };
        saveClockState(nextState);
        return nextState;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAddTime = (minutes: number) => {
    const addedSec = minutes * 60;
    const next: C2ClockState = {
      ...clockState,
      turn_time_remaining: clockState.turn_time_remaining + addedSec,
      turn_max_seconds: clockState.turn_max_seconds + addedSec,
    };
    setClockState(next);
    saveClockState(next);
  };

  const handleTogglePause = () => {
    const next: C2ClockState = {
      ...clockState,
      is_timer_running: !clockState.is_timer_running,
    };
    setClockState(next);
    saveClockState(next);
  };

  const handleToggleMasterLockdown = () => {
    const next: C2ClockState = {
      ...clockState,
      is_locked_down: !clockState.is_locked_down,
    };
    setClockState(next);
    saveClockState(next);
  };

  const handleToggleTeamLock = (team: 'A' | 'B') => {
    const next: C2ClockState =
      team === 'A'
        ? { ...clockState, team_a_locked: !clockState.team_a_locked }
        : { ...clockState, team_b_locked: !clockState.team_b_locked };
    setClockState(next);
    saveClockState(next);
  };

  const handleSaveVerdict = async (
    orderId: string,
    verdict: OrderVerdict,
    feedback: string
  ) => {
    const updatedOrders = orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            verdict,
            moderator_feedback: feedback,
            status: (verdict ? 'evaluated' : 'submitted') as TurnOrder['status'],
          }
        : o
    );
    setOrders(updatedOrders);
    saveModeratorOrders(updatedOrders);
    await syncOrderVerdictToSupabase(orderId, verdict, feedback);
  };

  const handleUpdateSitrep = (updated: TurnSitrep) => {
    setSitrep(updated);
  };

  const handleSaveDraftSitrep = () => {
    saveSitrep(sitrep);
  };

  const handleConfirmAdvanceTurn = () => {
    const prevTurn = clockState.current_turn;
    const nextTurn = prevTurn + 1;
    const nextClock: C2ClockState = {
      ...clockState,
      current_turn: nextTurn,
      turn_time_remaining: 45 * 60,
      turn_max_seconds: 45 * 60,
      is_timer_running: true,
      is_locked_down: false,
      team_a_locked: false,
      team_b_locked: false,
    };
    setClockState(nextClock);
    saveClockState(nextClock);

    const publishedSitrep: TurnSitrep = {
      ...sitrep,
      status: 'published',
      turn_number: nextTurn,
    };
    setSitrep(publishedSitrep);
    saveSitrep(publishedSitrep);

    setIsAdvanceModalOpen(false);
    setTurnAdvancedBanner(
      `Turno 0${prevTurn} Concluído com Sucesso! SITREP e mapa atualizado publicados. Inicializando Turno 0${nextTurn}.`
    );
    setTimeout(() => setTurnAdvancedBanner(null), 5000);
  };

  const handleScrollToSitrep = () => {
    const el = document.getElementById('sitrep-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-[#fbf9f4] bg-[radial-gradient(#dcd5c5_1px,transparent_1px)] [background-size:24px_24px] text-[#1e293b] font-body">
      {turnAdvancedBanner && (
        <div className="bg-[#004d40] text-white px-4 py-2.5 text-center font-headline text-[12px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md">
          <span className="material-symbols-outlined text-[18px] text-[#a4f1e5]">
            verified
          </span>
          <span>{turnAdvancedBanner}</span>
        </div>
      )}

      <div className="flex flex-col xl:flex-row min-h-full">
        {/* 1. LEFT COLUMN: CONTROLE TEMPORAL C2 */}
        <C2TimeSidebar
          clockState={clockState}
          orders={orders}
          onAddTime={handleAddTime}
          onTogglePause={handleTogglePause}
          onToggleMasterLockdown={handleToggleMasterLockdown}
          onToggleTeamLock={handleToggleTeamLock}
        />

        {/* 2. CENTRAL ORDERS BOARD & SITREP */}
        <div className="flex-1 p-4 xl:p-6 flex flex-col gap-6 min-w-0">
          <OrdersEvaluationBoard
            orders={orders}
            currentTurn={clockState.current_turn}
            onSaveVerdict={handleSaveVerdict}
            onInspectOrder={(order) => setInspectedOrder(order)}
            onScrollToSitrep={handleScrollToSitrep}
          />

          <ConsolidatedSitrepSection
            sitrep={sitrep}
            currentTurn={clockState.current_turn}
            onUpdateSitrep={handleUpdateSitrep}
            onSaveDraftSitrep={handleSaveDraftSitrep}
            onOpenAdvanceTurnModal={() => setIsAdvanceModalOpen(true)}
          />
        </div>
      </div>

      {/* ORDER DETAIL MODAL */}
      <OrderDetailsModal
        order={inspectedOrder}
        onClose={() => setInspectedOrder(null)}
      />

      {/* ADVANCE TURN CONFIRMATION MODAL */}
      <AdvanceTurnModal
        isOpen={isAdvanceModalOpen}
        nextTurnNumber={clockState.current_turn + 1}
        onClose={() => setIsAdvanceModalOpen(false)}
        onConfirmAdvance={handleConfirmAdvanceTurn}
      />
    </div>
  );
}
