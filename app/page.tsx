'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

// Configura Supabase con le tue credenziali
const SUPABASE_URL = "https://tvjcpczzlqtwtefvnrhk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2amNwY3p6bHF0d3RlZnZucmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NzAzMTcsImV4cCI6MjA4NjE0NjMxN30.w2VzO83AGEUERjs6_d0NnSghQU1SeZNguNZe171ZPK4"; // Inserisci la tua anon key completa
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ADMIN_PASSWORD = "admin";

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [inputPass, setInputPass] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [authError, setAuthError] = useState('');

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPass === ADMIN_PASSWORD) {
      setCurrentUser('ADMIN');
      setAuthError('');
    } else {
      setAuthError('Password Admin non corretta.');
    }
  };

  const handleDocenteLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!inputCode.trim()) return;

    const { data, error } = await supabase
      .from('docenti')
      .select('*')
      .ilike('codice_accesso', inputCode.trim())
      .maybeSingle();

    if (error || !data) {
      setAuthError('Codice non valido. Verifica e riprova.');
    } else {
      setCurrentUser(data);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setInputPass('');
    setInputCode('');
    setAuthError('');
  };

  if (!currentUser) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-2xl border space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-black uppercase italic text-slate-900 tracking-tighter">Gestione 40 Ore</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Accesso al Sistema</p>
          </div>

          {authError && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-2xl text-xs font-bold text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleDocenteLogin} className="space-y-4">
            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block ml-2">Accesso Docente</label>
            <input 
              type="text" 
              placeholder="INSERISCI CODICE" 
              className="w-full p-5 bg-slate-50 rounded-2xl font-black uppercase text-center border-2 border-transparent focus:border-blue-600 outline-none"
              value={inputCode}
              onChange={e => setInputCode(e.target.value)}
            />
            <button type="submit" className="w-full bg-blue-700 hover:bg-blue-800 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg transition-all">
              Entra come Docente
            </button>
          </form>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-[9px] font-black uppercase text-slate-300">oppure</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block ml-2">Accesso Amministratore</label>
            <input 
              type="password" 
              placeholder="PASSWORD ADMIN" 
              className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-center border-2 border-transparent focus:border-slate-800 outline-none"
              value={inputPass}
              onChange={e => setInputPass(e.target.value)}
            />
            <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg transition-all">
              Login Admin
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div>
      <div className="bg-slate-900 text-white px-8 py-3 flex justify-between items-center text-xs font-bold">
        <span>Utente: <strong className="uppercase">{currentUser === 'ADMIN' ? 'Amministratore' : currentUser.nome}</strong></span>
        <button onClick={logout} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
          Esci
        </button>
      </div>

      {currentUser === 'ADMIN' ? (
        <AdminPanel />
      ) : (
        <main className="max-w-[1400px] mx-auto p-6 lg:p-10">
          <DocentePanel docente={currentUser} adminMode={false} />
        </main>
      )}
    </div>
  );
}

function AdminPanel() {
  const [tab, setTab] = useState('docenti');
  const [data, setData] = useState({ docenti: [], impegni: [], piani: [], docs: [] });
  const [selDoc, setSelDoc] = useState<any>(null);
  const [activeImp, setActiveImp] = useState<string | null>(null);
  
  const [editingImpId, setEditingImpId] = useState<string | null>(null);

  const [formDoc, setFormDoc] = useState({ nome: '', contratto: 'INTERA', ore: 18, mesi: 9 });
  const [formImp, setFormImp] = useState({ titolo: '', data: '', ore: 2, tipo: 'A' });

  const loadData = useCallback(async () => {
    const [d, i, p, dc] = await Promise.all([
      supabase.from('docenti').select('*'),
      supabase.from('impegni').select('*').order('data', { ascending: false }),
      supabase.from('piani').select('*'),
      supabase.from('documenti').select('*').order('created_at', { ascending: false })
    ]);
    
    const impegniCaricati = i.data || [];
    setData({ docenti: d.data || [], impegni: impegniCaricati, piani: p.data || [], docs: dc.data || [] });
    
    if (impegniCaricati.length > 0 && !activeImp) {
      setActiveImp(impegniCaricati[0].id);
    }
  }, [activeImp]);

  useEffect(() => { loadData(); }, [loadData]);

  const deleteDocente = async (id: string) => {
    if(!confirm("Sei sicuro? Eliminerai anche tutte le ore dichiarate da questo docente.")) return;
    const { error } = await supabase.from('docenti').delete().eq('id', id);
    if(!error) loadData();
  };

  const exportExcelReport = () => {
    const { docenti, impegni, piani } = data;
    if (docenti.length === 0) return alert("Nessun dato da esportare");

    const headerRow1 = ["REGISTRO GENERALE ATTIVITÀ", "", "", "", "", "", ...impegni.map((i: any) => i.titolo)];
    const headerRow2 = [
      "Nominativo", 
      "Contratto", 
      "Ore A Dovute", 
      "Ore B Dovute", 
      "Tot. Realizzate A", 
      "Tot. Realizzate B", 
      ...impegni.map((i: any) => i.data)
    ];

    const rows = docenti.map((docente: any) => {
      const pianiDoc = piani.filter((p: any) => p.docente_id === docente.id);
      
      const oreAeff = pianiDoc
        .filter((p: any) => {
          const imp = impegni.find((i: any) => i.id === p.impegno_id);
          return imp && imp.tipo === 'A' && (p.stato === 'P' || p.stato === 'AG');
        })
        .reduce((sum: number, p: any) => sum + (Number(p.ore_effettive) || 0), 0);
      
      const oreBeff = pianiDoc
        .filter((p: any) => {
          const imp = impegni.find((i: any) => i.id === p.impegno_id);
          return imp && imp.tipo === 'B' && (p.stato === 'P' || p.stato === 'AG');
        })
        .reduce((sum: number, p: any) => sum + (Number(p.ore_effettive) || 0), 0);

      const row: any[] = [
        docente.nome,
        docente.contratto || 'INTERA',
        docente.ore_a_dovute || 40,
        docente.ore_b_dovute || 40,
        oreAeff,
        oreBeff
      ];

      impegni.forEach((imp: any) => {
        const piano = pianiDoc.find((p: any) => p.impegno_id === imp.id);
        row.push(piano ? (piano.stato || "PRENOTATO") : "-");
      });

      return row;
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, ...rows]);
    worksheet['!cols'] = [{wch: 25}, {wch: 15}, {wch: 12}, {wch: 12}, {wch: 12}, {wch: 12}];
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Registro");
    XLSX.writeFile(workbook, `Report_Scuola_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const deleteImpegno = async (id: string) => {
    if(!confirm("⚠️ Eliminando l'impegno cancellerai le ore di tutti i docenti per questa attività. Procedere?")) return;
    const { error } = await supabase.from('impegni').delete().eq('id', id);
    if(!error) { 
      if (activeImp === id) setActiveImp(null); 
      loadData(); 
    } else {
      alert("Errore durante l'eliminazione: " + error.message);
    }
  };

  const startEditImpegno = (imp: any) => {
    setEditingImpId(imp.id);
    setFormImp({
      titolo: imp.titolo,
      data: imp.data,
      ore: imp.ore || 2,
      tipo: imp.tipo || 'A'
    });
    setTab('impegni');
  };

  const cancelEdit = () => {
    setEditingImpId(null);
    setFormImp({ titolo: '', data: '', ore: 2, tipo: 'A' });
  };

  const saveDocente = async () => {
    if (!formDoc.nome) return alert("Inserire un nominativo.");
    const cod = Math.random().toString(36).substring(2, 7).toUpperCase();
    let oreATot = 0;
    let oreBTot = 0;

    if (formDoc.contratto === 'INTERA') {
      const baseIntera = 80 * (formDoc.mesi / 9);
      oreATot = Math.floor(baseIntera / 2);
      oreBTot = Math.ceil(baseIntera / 2);
    } 
    else if (formDoc.contratto === 'COMPLETAMENTO') {
      const baseProporzionale = (80 / 18) * formDoc.ore * (formDoc.mesi / 9);
      oreATot = Math.floor(baseProporzionale / 2);
      oreBTot = Math.ceil(baseProporzionale / 2);
    } 
    else if (formDoc.contratto === 'SPEZZONE') {
      oreATot = Math.floor(40 * (formDoc.mesi / 9));
      const baseB = (40 / 18) * formDoc.ore * (formDoc.mesi / 9);
      oreBTot = Math.ceil(baseB);
    }

    const { error } = await supabase.from('docenti').insert([{
      nome: formDoc.nome, 
      codice_accesso: cod, 
      contratto: formDoc.contratto,
      ore_settimanali: formDoc.ore, 
      mesi_servizio: formDoc.mesi,
      ore_a_dovute: oreATot, 
      ore_b_dovute: oreBTot
    }]);
    
    if (!error) { 
      alert(`DOCENTE CREATO\nCodice: ${cod}\nComma A: ${oreATot}h\nComma B: ${oreBTot}h`); 
      setTab('docenti'); 
      loadData(); 
    } else { alert("Errore: " + error.message); }
  };

  const saveImpegno = async () => {
    if (!formImp.titolo || !formImp.data) {
      return alert("⚠️ Inserisci Titolo e Data!");
    }

    const payload = {
      titolo: formImp.titolo, 
      data: formImp.data, 
      tipo: formImp.tipo,
      ore: Number(formImp.ore)
    };

    let error;

    if (editingImpId) {
      const res = await supabase.from('impegni').update(payload).eq('id', editingImpId);
      error = res.error;
    } else {
      const res = await supabase.from('impegni').insert([payload]);
      error = res.error;
    }

    if (error) {
      alert("❌ Errore: " + error.message); 
    } else {
      alert(editingImpId ? "✅ ATTIVITÀ AGGIORNATA!" : "✅ ATTIVITÀ SALVATA!");
      cancelEdit();
      setTab('appello'); 
      loadData(); 
    }
  };

  return (
    <main className="max-w-[1400px] mx-auto p-6 lg:p-10">
      
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">Admin Control Panel</h1>
        <button 
          onClick={exportExcelReport}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all flex items-center gap-2"
        >
          <span>📥</span> Scarica Report Excel
        </button>
      </div>

      <nav className="flex flex-wrap gap-3 mb-12 justify-center">
        {[
          { id: 'docenti', label: 'Lista Docenti' },
          { id: 'nuovo_doc', label: 'Aggiungi Staff' },
          { id: 'impegni', label: editingImpId ? 'Modifica Attività' : 'Nuova Attività' },
          { id: 'appello', label: 'Validazione' },
          { id: 'documenti', label: 'Bacheca File' }
        ].map(t => (
          <button 
            key={t.id} onClick={() => {
              setTab(t.id); 
              setSelDoc(null);
              if (t.id !== 'impegni' && editingImpId) cancelEdit();
            }}
            className={`px-8 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all border-4 ${tab === t.id ? 'bg-blue-800 border-blue-800 text-white shadow-xl' : 'bg-white border-transparent text-slate-400 hover:text-slate-900'}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'docenti' && !selDoc && (
        <div className="grid grid-cols-1 gap-4">
          {data.docenti.map((d: any) => {
            const pianiDoc = data.piani.filter((p: any) => p.docente_id === d.id);
            
            const stats = {
              pianA: pianiDoc.filter((p: any) => {
                const imp = data.impegni.find((i: any) => i.id === p.impegno_id);
                return imp && imp.tipo === 'A';
              }).reduce((s: number, c: any) => s + (Number(c.ore_effettive) || 0), 0),
              
              svoltA: pianiDoc.filter((p: any) => {
                const imp = data.impegni.find((i: any) => i.id === p.impegno_id);
                return imp && imp.tipo === 'A' && (p.stato === 'P' || p.stato === 'AG');
              }).reduce((s: number, c: any) => s + (Number(c.ore_effettive) || 0), 0),
              
              pianB: pianiDoc.filter((p: any) => {
                const imp = data.impegni.find((i: any) => i.id === p.impegno_id);
                return imp && imp.tipo === 'B';
              }).reduce((s: number, c: any) => s + (Number(c.ore_effettive) || 0), 0),
              
              svoltB: pianiDoc.filter((p: any) => {
                const imp = data.impegni.find((i: any) => i.id === p.impegno_id);
                return imp && imp.tipo === 'B' && (p.stato === 'P' || p.stato === 'AG');
              }).reduce((s: number, c: any) => s + (Number(c.ore_effettive) || 0), 0),
            };

            return (
              <div key={d.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col xl:flex-row items-center gap-6 hover:shadow-lg transition-all group">
                <div className="flex items-center gap-5 min-w-[220px]">
                  <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-lg italic group-hover:bg-blue-700 transition-all">
                    {d.nome ? d.nome[0] : 'U'}
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase text-slate-800 leading-none mb-1.5">{d.nome}</h3>
                    <p className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md inline-block uppercase tracking-widest">
                      Code: {d.codice_accesso}
                    </p>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-3 border-x border-slate-50 px-6 w-full">
                  <div className="bg-blue-50/50 p-4 rounded-[1.5rem] border border-blue-100">
                    <div className="flex justify-between items-center mb-2 px-1">
                      <span className="text-[9px] font-black text-blue-800 uppercase italic">Comma A</span>
                      <span className="text-[9px] font-bold text-slate-400">{d.ore_a_dovute || 40}h Tot.</span>
                    </div>
                    <div className="flex justify-around items-end">
                      <div className="text-center">
                        <p className="text-[7px] font-bold text-slate-400 uppercase">Pian.</p>
                        <p className="text-md font-black text-blue-600 leading-none">{stats.pianA}h</p>
                      </div>
                      <div className="w-px h-5 bg-blue-200"></div>
                      <div className="text-center">
                        <p className="text-[7px] font-bold text-slate-400 uppercase">Svolte</p>
                        <p className="text-md font-black text-emerald-600 leading-none">{stats.svoltA}h</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-indigo-50/50 p-4 rounded-[1.5rem] border border-indigo-100">
                    <div className="flex justify-between items-center mb-2 px-1">
                      <span className="text-[9px] font-black text-indigo-800 uppercase italic">Comma B</span>
                      <span className="text-[9px] font-bold text-slate-400">{d.ore_b_dovute || 40}h Tot.</span>
                    </div>
                    <div className="flex justify-around items-end">
                      <div className="text-center">
                        <p className="text-[7px] font-bold text-slate-400 uppercase">Pian.</p>
                        <p className="text-md font-black text-indigo-600 leading-none">{stats.pianB}h</p>
                      </div>
                      <div className="w-px h-5 bg-indigo-200"></div>
                      <div className="text-center">
                        <p className="text-[7px] font-bold text-slate-400 uppercase">Svolte</p>
                        <p className="text-md font-black text-emerald-600 leading-none">{stats.svoltB}h</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={() => setSelDoc(d)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-700 shadow-md transition-all">
                    Dettagli
                  </button>
                  <button onClick={() => deleteDocente(d.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'nuovo_doc' && (
        <div className="max-w-3xl mx-auto bg-white p-10 md:p-12 rounded-[3.5rem] shadow-2xl border animate-in zoom-in">
          <h2 className="text-3xl font-black mb-8 uppercase italic text-blue-800 tracking-tighter">Registrazione Staff</h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-widest">Nominativo Completo</label>
              <input type="text" placeholder="ES: MARIO ROSSI" className="w-full p-6 bg-slate-50 rounded-[2rem] font-bold uppercase border-4 border-transparent focus:border-blue-600 outline-none transition-all" value={formDoc.nome} onChange={e => setFormDoc({...formDoc, nome: e.target.value})} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-widest">Tipo Contratto</label>
                <select className="w-full p-6 bg-slate-50 rounded-[2rem] font-bold uppercase border-4 border-transparent focus:border-blue-600 outline-none appearance-none cursor-pointer" value={formDoc.contratto} onChange={e => setFormDoc({...formDoc, contratto: e.target.value})}>
                  <option value="INTERA">Cattedra Intera (18h)</option>
                  <option value="COMPLETAMENTO">Spezzone + Completamento Esterno</option>
                  <option value="SPEZZONE">Spezzone Solo Nostra Scuola</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-widest">Ore Settimanali da noi</label>
                <input type="number" className="w-full p-6 bg-slate-50 rounded-[2rem] font-bold border-4 border-transparent focus:border-blue-600 outline-none" value={formDoc.ore} onChange={e => setFormDoc({...formDoc, ore: Number(e.target.value)})} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-widest">Mesi di Servizio</label>
              <input type="number" step="0.5" max="9" min="0.5" className="w-full p-6 bg-slate-50 rounded-[2rem] font-bold border-4 border-transparent focus:border-blue-600 outline-none" value={formDoc.mesi} onChange={e => setFormDoc({...formDoc, mesi: Number(e.target.value)})} />
            </div>
            <button onClick={saveDocente} className="w-full bg-blue-700 text-white p-8 rounded-[2rem] font-black text-xl uppercase shadow-xl hover:bg-slate-900 transition-all">
              Conferma e Crea
            </button>
          </div>
        </div>
      )}

      {tab === 'impegni' && (
        <div className="max-w-2xl mx-auto bg-white p-12 rounded-[3.5rem] shadow-2xl border animate-in zoom-in">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-3xl font-black uppercase italic text-orange-600 tracking-tighter">
              {editingImpId ? 'Modifica Attività' : 'Crea Nuova Attività'}
            </h2>
            {editingImpId && (
              <button onClick={cancelEdit} className="text-[9px] font-black uppercase text-slate-400 hover:text-slate-800">
                ✖ Annulla
              </button>
            )}
          </div>
          <div className="space-y-6">
            <input type="text" placeholder="TITOLO ATTIVITÀ" className="w-full p-6 bg-slate-50 rounded-[2rem] font-bold uppercase outline-none focus:border-orange-500 border-4 border-transparent" value={formImp.titolo} onChange={e => setFormImp({...formImp, titolo: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
              <input type="date" className="p-6 bg-slate-50 rounded-[2rem] font-bold outline-none" value={formImp.data} onChange={e => setFormImp({...formImp, data: e.target.value})} />
              <div className="flex gap-2 p-3 bg-slate-50 rounded-[2rem]">
                <button onClick={() => setFormImp({...formImp, tipo: 'A'})} className={`flex-1 rounded-xl font-black text-[9px] uppercase transition-all ${formImp.tipo === 'A' ? 'bg-blue-800 text-white shadow-md' : 'bg-white'}`}>A</button>
                <button onClick={() => setFormImp({...formImp, tipo: 'B'})} className={`flex-1 rounded-xl font-black text-[9px] uppercase transition-all ${formImp.tipo === 'B' ? 'bg-indigo-800 text-white shadow-md' : 'bg-white'}`}>B</button>
              </div>
            </div>
            <input type="number" step="0.5" placeholder="ORE PREVISTE" className="w-full p-6 bg-slate-50 rounded-[2rem] font-bold outline-none" value={formImp.ore} onChange={e => setFormImp({...formImp, ore: Number(e.target.value)})} />
            <button onClick={saveImpegno} className="w-full bg-orange-600 text-white p-8 rounded-[2.5rem] font-black text-xl uppercase shadow-xl">
              {editingImpId ? 'Aggiorna Attività' : 'Pubblica'}
            </button>
          </div>
        </div>
      )}

"use client";

import React, { useState, useEffect, useCallback } from 'react';

// Funzione di utilità per il calcolo delle ore dovute
const calcolaOreDovute = (tipoContratto: string, ore: number, mesi: number) => {
  let oreATot = 40;
  let oreBTot = 40;
  
  if (tipoContratto === 'INTERA') {
    const base = 80 * (mesi / 9);
    oreATot = Math.floor(base / 2);
    oreBTot = Math.ceil(base / 2);
  } else if (tipoContratto === 'COMPLETAMENTO') {
    const base = (80 / 18) * ore * (mesi / 9);
    oreATot = Math.floor(base / 2);
    oreBTot = Math.ceil(base / 2);
  } else if (tipoContratto === 'SPEZZONE') {
    oreATot = Math.floor(40 * (mesi / 9));
    const baseB = (40 / 18) * ore * (mesi / 9);
    oreBTot = Math.ceil(baseB);
  }
  
  return { oreATot, oreBTot };
};

export default function AppelloDocumentiPanel({ 
  tab, 
  data, 
  activeImp, 
  setActiveImp, 
  startEditImpegno, 
  deleteImpegno, 
  selDoc, 
  setSelDoc, 
  loadData, 
  supabase 
}: any) {
  return (
    <main className="min-h-screen p-8 bg-slate-100">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">Admin Control Panel</h1>
      </div>

      {tab === 'appello' && (
        <div className="grid lg:grid-cols-2 gap-8 animate-in fade-in">
          <div className="space-y-3">
            <h3 className="text-[9px] font-black uppercase text-slate-400 ml-5 tracking-widest">Attività Recenti</h3>
            {data.impegni.map((i: any) => (
              <div 
                key={i.id} 
                onClick={() => setActiveImp(i.id)} 
                className={`p-6 rounded-[2.5rem] border-4 cursor-pointer transition-all flex justify-between items-center ${activeImp === i.id ? 'bg-white border-blue-700 shadow-xl' : 'bg-white border-transparent shadow-sm'}`}
              >
                <div>
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full mb-2 inline-block ${i.tipo === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>COMMA {i.tipo}</span>
                  <h4 className="font-black uppercase text-lg tracking-tighter">{i.titolo}</h4>
                  <p className="text-[9px] font-bold text-slate-300 uppercase italic">{i.data} • {i.ore}H</p>
                </div>

                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => startEditImpegno(i)} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">✏️</button>
                  <button onClick={() => deleteImpegno(i.id)} className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">🗑️</button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white p-8 rounded-[3.5rem] shadow-2xl border sticky top-28 min-h-[450px]">
            <h3 className="text-xl font-black mb-6 uppercase italic underline decoration-blue-100 underline-offset-4">Appello</h3>
            <div className="space-y-3">
              {data.piani.filter((p: any) => p.impegno_id === activeImp).map((p: any) => {
                const d = data.docenti.find((x: any) => x.id === p.docente_id);
                return (
                  <div key={p.id} className="p-5 bg-slate-50 rounded-[1.8rem] flex justify-between items-center">
                    <div>
                      <p className="font-black uppercase text-[11px] text-slate-800">{d?.nome || 'Docente'}</p>
                      <p className="text-[9px] font-bold text-blue-600 uppercase">{p.ore_effettive}H</p>
                    </div>
                    <div className="flex bg-white p-1 rounded-full gap-1 border">
                      {['P', 'AG', 'ANG'].map((s) => (
                        <button
                          key={s}
                          onClick={async () => { 
                            await supabase.from('piani').update({ stato: p.stato === s ? null : s }).eq('id', p.id); 
                            loadData(); 
                          }}
                          className={`w-8 h-8 rounded-full text-[8px] font-black transition-all ${p.stato === s ? 'bg-slate-900 text-white' : 'text-slate-300 hover:bg-slate-100'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {!activeImp && <div className="text-center py-24 opacity-20 font-black uppercase text-[10px] tracking-[0.4em]">Scegli un impegno</div>}
            </div>
          </div>
        </div>
      )}

      {tab === 'documenti' && (
        <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border animate-in zoom-in">
          <div className="grid lg:grid-cols-2 gap-12">
            <div className="bg-slate-50 p-10 rounded-[2.5rem] border-4 border-dashed border-slate-200 text-center flex flex-col items-center justify-center">
              <input 
                type="file" 
                className="text-[9px] font-black uppercase text-slate-400 cursor-pointer file:bg-slate-900 file:text-white file:rounded-full file:px-6 file:py-2.5 file:border-0" 
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if(!file) return;
                  const fileName = `${Date.now()}_${file.name}`;
                  const { error: upErr } = await supabase.storage.from('files').upload(fileName, file);
                  if(upErr) return alert("Errore upload");
                  const { data: { publicUrl } } = supabase.storage.from('files').getPublicUrl(fileName);
                  await supabase.from('documenti').insert([{ nome: file.name, url: publicUrl, storage_path: fileName }]);
                  loadData();
                  alert("File caricato!");
                }} 
              />
            </div>
            <div className="space-y-3">
              <h3 className="text-[9px] font-black uppercase text-slate-300 mb-5 tracking-widest italic">Documenti Pubblicati</h3>
              {data.docs.map((doc: any) => (
                <div key={doc.id} className="p-5 bg-white border border-slate-100 rounded-[1.8rem] flex justify-between items-center shadow-sm">
                   <span className="font-black uppercase text-[10px] text-slate-700">{doc.nome}</span>
                   <button 
                    onClick={async () => {
                      if(confirm("Eliminare?")) {
                        await supabase.storage.from('files').remove([doc.storage_path]);
                        await supabase.from('documenti').delete().eq('id', doc.id);
                        loadData();
                      }
                    }}
                    className="text-red-500 font-black text-[9px] uppercase"
                   >Elimina</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selDoc && (
        <div className="mt-12 border-t-[8px] border-slate-900 pt-12">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-xl font-black uppercase tracking-widest">Dettaglio: {selDoc.nome}</h2>
             <button onClick={() => setSelDoc(null)} className="text-slate-400 font-bold uppercase text-xs">Chiudi X</button>
          </div>
          <DocentePanel docente={selDoc} adminMode={true} supabase={supabase} />
        </div>
      )}
    </main>
  );
}

export function DocentePanel({ docente, adminMode = false, supabase }: any) {
  const [impegni, setImpegni] = useState<any[]>([]);
  const [piani, setPiani] = useState<any[]>([]);
  const [documenti, setDocumenti] = useState<any[]>([]);
  const [tab, setTab] = useState('calendario');

  const [isEditingContract, setIsEditingContract] = useState(false);
  const [contratto, setContratto] = useState(docente.contratto || 'INTERA');
  const [oreSettimanali, setOreSettimanali] = useState(docente.ore_settimanali || 18);
  const [mesiServizio, setMesiServizio] = useState(docente.mesi_servizio || 9);
  const [oreADovute, setOreADovute] = useState(docente.ore_a_dovute || 40);
  const [oreBDovute, setOreBDovute] = useState(docente.ore_b_dovute || 40);
  const [orePrenotazioneTemp, setOrePrenotazioneTemp] = useState<{ [key: string]: number }>({});

  const handleContrattoChange = (nuovoContratto?: string, nuoveOre?: number, nuoviMesi?: number) => {
    const c = nuovoContratto !== undefined ? nuovoContratto : contratto;
    const o = nuoveOre !== undefined ? nuoveOre : oreSettimanali;
    const m = nuoviMesi !== undefined ? nuoviMesi : mesiServizio;

    if (nuovoContratto !== undefined) setContratto(c);
    if (nuoveOre !== undefined) setOreSettimanali(o);
    if (nuoviMesi !== undefined) setMesiServizio(m);

    const { oreATot, oreBTot } = calcolaOreDovute(c, Number(o), Number(m));
    setOreADovute(oreATot);
    setOreBDovute(oreBTot);
  };

  const load = useCallback(async () => {
    const [i, p, d] = await Promise.all([
      supabase.from('impegni').select('*').order('data', { ascending: true }),
      supabase.from('piani').select('*').eq('docente_id', docente.id),
      supabase.from('documenti').select('*').order('created_at', { ascending: false })
    ]);
    setImpegni(i.data || []); 
    setPiani(p.data || []);
    setDocumenti(d.data || []);
  }, [docente.id, supabase]);

  useEffect(() => { load(); }, [load]);

  const updateStato = async (pianoId: string, nuovoStato: string | null) => {
    const { error } = await supabase
      .from('piani')
      .update({ stato: nuovoStato })
      .eq('id', pianoId);
    
    if (error) {
      alert("Errore nel salvataggio");
    } else {
      load(); 
    }
  };

  const saveContratto = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from('docenti')
      .update({
        contratto,
        ore_settimanali: Number(oreSettimanali),
        mesi_servizio: Number(mesiServizio),
        ore_a_dovute: Number(oreADovute),
        ore_b_dovute: Number(oreBDovute)
      })
      .eq('id', docente.id);

    if (error) {
      alert("Errore durante l'aggiornamento del contratto");
    } else {
      alert("Contratto aggiornato con successo!");
      setIsEditingContract(false);
      docente.contratto = contratto;
      docente.ore_settimanali = Number(oreSettimanali);
      docente.mesi_servizio = Number(mesiServizio);
      docente.ore_a_dovute = Number(oreADovute);
      docente.ore_b_dovute = Number(oreBDovute);
    }
  };

  const stats = {
    vA: piani.filter(p => {
      const imp = impegni.find(i => i.id === p.impegno_id);
      return imp && imp.tipo === 'A' && (p.stato === 'P' || p.stato === 'AG');
    }).reduce((s, c) => s + (Number(c.ore_effettive) || 0), 0),
    
    vB: piani.filter(p => {
      const imp = impegni.find(i => i.id === p.impegno_id);
      return imp && imp.tipo === 'B' && (p.stato === 'P' || p.stato === 'AG');
    }).reduce((s, c) => s + (Number(c.ore_effettive) || 0), 0),
  };

  return (
    <div className="max-w-6xl mx-auto px-4 pb-20">
      <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 mb-10">
        <div className="flex flex-wrap items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-blue-800 rounded-2xl flex items-center justify-center text-white font-black italic text-3xl shadow-lg shadow-blue-200">
              {docente.nome ? docente.nome[0] : 'U'}
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800">{docente.nome}</h2>
              <div className="flex gap-3 mt-1 font-bold text-[10px] uppercase">
                <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{docente.contratto || 'INTERA'}</span>
                <span className="text-slate-400 bg-slate-50 px-2 py-0.5 rounded">{docente.ore_settimanali || 18}H / SETT</span>
                <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{docente.mesi_servizio || 9} MESI</span>
              </div>
            </div>
          </div>
          {adminMode && (
            <button 
              onClick={() => setIsEditingContract(!isEditingContract)}
              className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 shadow-md transition-all"
            >
              {isEditingContract ? 'Annulla Modifica' : 'Modifica Contratto'}
            </button>
          )}
        </div>

        {isEditingContract && adminMode && (
          <form onSubmit={saveContratto} className="bg-slate-50 p-6 rounded-[2rem] border mb-8 grid grid-cols-1 md:grid-cols-5 gap-4 animate-in fade-in">
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Tipo Contratto</label>
              <select 
                value={contratto} 
                onChange={(e) => handleContrattoChange(e.target.value, undefined, undefined)}
                className="w-full bg-white border rounded-xl p-3 text-xs font-bold uppercase"
              >
                <option value="INTERA">Cattedra Intera (18h)</option>
                <option value="COMPLETAMENTO">Spezzone + Completamento</option>
                <option value="SPEZZONE">Spezzone Solo Nostra Scuola</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Ore Settimanali</label>
              <input type="number" step="0.5" value={oreSettimanali} onChange={(e) => handleContrattoChange(undefined, Number(e.target.value), undefined)} className="w-full bg-white border rounded-xl p-3 text-xs font-bold" required />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Mesi Servizio</label>
              <input type="number" step="0.5" max="9" min="0.5" value={mesiServizio} onChange={(e) => handleContrattoChange(undefined, undefined, Number(e.target.value))} className="w-full bg-white border rounded-xl p-3 text-xs font-bold" required />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Ore Comma A Dovute</label>
              <input type="number" step="0.5" value={oreADovute} onChange={(e) => setOreADovute(e.target.value)} className="w-full bg-white border rounded-xl p-3 text-xs font-bold" required />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Ore Comma B Dovute</label>
              <input type="number" step="0.5" value={oreBDovute} onChange={(e) => setOreBDovute(e.target.value)} className="w-full bg-white border rounded-xl p-3 text-xs font-bold" required />
            </div>
            <div className="md:col-span-5 flex justify-end">
              <button type="submit" className="bg-emerald-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-emerald-700 transition-all">Salva Contratto</button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ProgressBar label="Validato Comma A (P+AG)" attuale={stats.vA} target={docente.ore_a_dovute || 40} color="blue" />
          <ProgressBar label="Validato Comma B (P+AG)" attuale={stats.vB} target={docente.ore_b_dovute || 40} color="indigo" />
        </div>
      </div>

      <nav className="flex flex-wrap gap-3 mb-12 justify-center print:hidden">
        {[
          { id: 'calendario', label: 'Prenota' },
          { id: 'miei', label: 'Piano e Stati' },
          { id: 'documenti', label: 'Bacheca' },
          { id: 'report', label: 'Report PDF' }
        ].map(t => (
          <button 
            key={t.id} onClick={() => setTab(t.id)}
            className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
              tab === t.id ? 'bg-slate-900 text-white shadow-xl scale-105' : 'bg-white text-slate-400 border border-slate-100 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'calendario' && (
        <div className="grid gap-4 animate-in fade-in">
           {impegni.map(i => {
             const p = piani.find(x => x.impegno_id === i.id);
             return (
               <div key={i.id} className={`bg-white rounded-[2rem] border p-6 flex items-center transition-all ${p ? 'border-blue-500 bg-blue-50/20 shadow-inner' : 'border-slate-100 hover:shadow-xl'}`}>
                 <div className="w-20 text-center border-r border-slate-100 pr-6">
                   <span className="block text-2xl font-black text-slate-800 leading-none">{i.data ? i.data.split('-')[2] : '--'}</span>
                   <span className="text-[10px] font-bold text-slate-400 uppercase">{i.data ? `${i.data.split('-')[1]}/${i.data.split('-')[0]}` : ''}</span>
                 </div>
                 <div className="flex-1 px-8 text-left">
                   <span className={`text-[8px] font-black px-2 py-1 rounded uppercase mb-2 inline-block ${i.tipo === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>Comma {i.tipo}</span>
                   <h4 className="font-black text-slate-700 uppercase text-lg leading-tight">{i.titolo}</h4>
                 </div>
                 <div className="flex items-center gap-6">
                   <div className="flex flex-col items-center">
                     <span className="text-[9px] font-black text-slate-300 uppercase mb-1">H. Eff</span>
                     <input 
                      type="number" 
                      step="0.5" 
                      value={orePrenotazioneTemp[i.id] !== undefined ? orePrenotazioneTemp[i.id] : (p ? p.ore_effettive : i.ore)}
                      onChange={(e) => setOrePrenotazioneTemp({ ...orePrenotazioneTemp, [i.id]: Number(e.target.value) })}
                      disabled={!!p} 
                      className="w-16 bg-slate-50 border-2 border-slate-100 rounded-xl p-2 text-center font-black"
                     />
                   </div>
                   <button 
                    onClick={async () => {
                      if(p) { 
                        await supabase.from('piani').delete().eq('id', p.id); 
                      } else {
                        const h = orePrenotazioneTemp[i.id] !== undefined ? orePrenotazioneTemp[i.id] : i.ore;
                        await supabase.from('piani').insert([{ 
                          docente_id: docente.id, 
                          impegno_id: i.id, 
                          ore_effettive: Number(h) 
                        }]);
                      }
                      load();
                    }}
                    className={`h-14 px-8 rounded-2xl text-[10px] font-black uppercase transition-all shadow-lg ${p ? 'bg-red-500 text-white shadow-red-200' : 'bg-slate-900 text-white hover:bg-blue-600'}`}
                   >
                     {p ? 'Rimuovi' : 'Prenota'}
                   </button>
                 </div>
               </div>
             );
           })}
        </div>
      )}

      {tab === 'miei' && (
        <div className="grid gap-4 animate-in fade-in">
          {piani.length === 0 ? (
            <p className="text-center py-20 opacity-30 font-black uppercase text-xs">Nessuna attività prenotata</p>
          ) : (
            piani.map(p => {
              const info = impegni.find(i => i.id === p.impegno_id);
              return (
                <div key={p.id} className={`bg-white p-6 rounded-[2rem] border-l-[12px] shadow-sm flex flex-wrap justify-between items-center transition-all ${
                  p.stato === 'P' || p.stato === 'AG' ? 'border-l-emerald-500' : p.stato === 'ANG' ? 'border-l-red-500' : 'border-l-orange-400'
                }`}>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{info?.data}</p>
                    <h4 className="text-lg font-black uppercase text-slate-800">{info?.titolo}</h4>
                    <p className="text-xs font-bold text-blue-600 uppercase">Comma {info?.tipo || 'A'} • {p.ore_effettive} Ore</p>
                  </div>

                  <div className="flex items-center gap-4 mt-4 sm:mt-0">
                    {adminMode ? (
                      <div className="flex bg-slate-100 p-2 rounded-2xl gap-2 border shadow-inner">
                        <button 
                          onClick={() => updateStato(p.id, 'P')} 
                          className={`w-12 h-12 rounded-xl text-[10px] font-black transition-all ${p.stato === 'P' ? '!bg-emerald-500 !text-white shadow-lg' : 'bg-white text-slate-400 hover:!text-emerald-500'}`}
                        >P</button>
                        <button 
                          onClick={() => updateStato(p.id, 'AG')} 
                          className={`w-12 h-12 rounded-xl text-[10px] font-black transition-all ${p.stato === 'AG' ? '!bg-sky-500 !text-white shadow-lg' : 'bg-white text-slate-400 hover:!text-sky-500'}`}
                        >AG</button>
                        <button 
                          onClick={() => updateStato(p.id, 'ANG')} 
                          className={`w-12 h-12 rounded-xl text-[10px] font-black transition-all ${p.stato === 'ANG' ? '!bg-red-500 !text-white shadow-lg' : 'bg-white text-slate-400 hover:!text-red-500'}`}
                        >ANG</button>
                        <button onClick={() => updateStato(p.id, null)} className="px-2 text-slate-300 hover:text-slate-600 font-bold">×</button>
                      </div>
                    ) : (
                      <div className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase ${
                        p.stato === 'P' ? 'bg-emerald-50 text-emerald-600' : 
                        p.stato === 'AG' ? 'bg-sky-50 text-sky-600' : 
                        p.stato === 'ANG' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-400 italic'
                      }`}>
                        {p.stato === 'P' ? 'Presente ✓' : p.stato === 'AG' ? 'Ass. Giustificata' : p.stato === 'ANG' ? 'Ass. Ingiustificata' : 'In attesa'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'documenti' && (
        <div className="grid gap-4 animate-in fade-in">
          {documenti.map(doc => (
            <div key={doc.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex justify-between items-center group hover:shadow-xl transition-all">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner">📄</div>
                <div className="text-left">
                  <h4 className="font-black text-slate-800 uppercase text-lg">{doc.nome}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Pubblicato il {new Date(doc.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <a href={doc.url} target="_blank" rel="noreferrer" className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase hover:bg-blue-600 shadow-lg transition-all">Download</a>
            </div>
          ))}
        </div>
      )}

      {tab === 'report' && (
        <div id="piano-stampa" className="bg-white p-12 rounded-[3rem] shadow-2xl border animate-in zoom-in text-left">
           <div className="flex justify-between items-start border-b-8 border-slate-900 pb-10 mb-10">
             <div>
               <h1 className="text-5xl font-black uppercase tracking-tighter italic leading-none mb-2">Piano Attività</h1>
               <p className="text-xl font-bold text-blue-700 uppercase">{docente.nome}</p>
             </div>
             <button onClick={() => window.print()} className="bg-slate-900 text-white px-10 py-5 rounded-2xl text-xs font-black uppercase print:hidden shadow-xl hover:bg-blue-800 transition-all">Stampa / PDF</button>
           </div>
           <table className="w-full text-left">
             <thead>
               <tr className="border-b-4 border-slate-100 text-[11px] font-black uppercase text-slate-400">
                 <th className="py-6">Data</th>
                 <th>Attività</th>
                 <th className="text-center">Comma</th>
                 <th className="text-center">Stato</th>
                 <th className="text-right">Ore</th>
               </tr>
             </thead>
             <tbody>
               {piani.map(p => {
                 const info = impegni.find(i => i.id === p.impegno_id);
                 return (
                   <tr key={p.id} className="border-b border-slate-50 font-bold text-slate-700">
                     <td className="py-6">{info?.data}</td>
                     <td className="uppercase">{info?.titolo}</td>
                     <td className="text-center">Comma {info?.tipo || 'A'}</td>
                     <td className={`text-center text-[10px] font-black uppercase ${p.stato === 'P' ? 'text-emerald-500' : p.stato === 'AG' ? 'text-sky-500' : p.stato === 'ANG' ? 'text-red-500' : 'text-slate-300'}`}>
                        {p.stato || 'ATTESA'}
                     </td>
                     <td className="text-right font-black">{p.ore_effettive}H</td>
                   </tr>
                 );
               })}
             </tbody>
           </table>
           <div className="mt-16 grid grid-cols-2 gap-10">
             <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
               <p className="text-[10px] font-black text-slate-400 uppercase mb-2 italic tracking-widest">Totale Comma A (Validato)</p>
               <p className="text-4xl font-black text-slate-800">{stats.vA} / {docente.ore_a_dovute || 40}H</p>
             </div>
             <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
               <p className="text-[10px] font-black text-slate-400 uppercase mb-2 italic tracking-widest">Totale Comma B (Validato)</p>
               <p className="text-4xl font-black text-slate-800">{stats.vB} / {docente.ore_b_dovute || 40}H</p>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}

function ProgressBar({ label, attuale, target, color }: any) {
  const percent = Math.min((attuale / target) * 100, 100);
  const colorClass = color === 'blue' ? 'bg-blue-600' : 'bg-indigo-600';
  
  return (
    <div className="bg-white p-6 rounded-[2rem] border shadow-sm">
      <div className="flex justify-between items-end mb-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">
          {label}
        </span>
        <span className="text-xl font-black leading-none">
          {attuale} <span className="text-slate-300 text-sm font-bold">/ {target}H</span>
        </span>
      </div>
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClass} transition-all duration-1000 ease-out`} 
          style={{ width: `${percent}%` }}
        ></div>
      </div>
      {attuale > target && (
        <p className="text-[8px] font-black text-emerald-500 uppercase mt-2 animate-pulse">
          ✨ Ore eccedenti: +{attuale - target}H
        </p>
      )}
    </div>
  );
}
