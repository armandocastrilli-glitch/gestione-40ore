"use client";
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAZIONE DATABASE ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function GestionaleScuolaMaster() {
  const [user, setUser] = useState<any>(null);
  const [loginCode, setLoginCode] = useState('');
  const [globalLoading, setGlobalLoading] = useState(false);

  // --- LOGICA DI ACCESSO ---
  const handleLogin = async () => {
    const code = loginCode.trim().toUpperCase();
    if (code === 'ADMIN123') {
      setUser({ id: 'admin', nome: 'Amministratore', role: 'admin' });
      return;
    }
    setGlobalLoading(true);
    const { data, error } = await supabase
      .from('docenti')
      .select('*')
      .eq('codice_accesso', code)
      .single();
    
    if (data) {
      setUser(data);
    } else {
      alert("ERRORE: Codice non valido o docente non registrato.");
    }
    setGlobalLoading(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-[3rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] w-full max-w-md border-[12px] border-slate-200">
          <h1 className="text-5xl font-black mb-2 text-center italic tracking-tighter text-blue-700">S-PRO</h1>
          <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-10">Gestionale Docenti v3.0</p>
          
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="INSERISCI CODICE" 
              className="w-full p-6 border-4 border-slate-50 rounded-3xl text-center text-3xl font-mono uppercase focus:border-blue-500 outline-none transition-all shadow-inner"
              value={loginCode}
              onChange={(e) => setLoginCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <button 
              onClick={handleLogin}
              disabled={globalLoading}
              className="w-full bg-blue-600 text-white p-6 rounded-3xl font-black text-xl hover:bg-slate-900 transition-all shadow-xl active:scale-95 disabled:opacity-50"
            >
              {globalLoading ? 'VERIFICA...' : 'ACCEDI AL SISTEMA'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      {/* Header Statica */}
      <header className="bg-white/70 backdrop-blur-xl border-b sticky top-0 z-[1000] p-5 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black italic">S</div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 leading-none">Scuola Digital Pro</p>
            <p className="text-sm font-black uppercase tracking-tight">{user.nome}</p>
          </div>
        </div>
        <button 
          onClick={() => { setUser(null); setLoginCode(''); }}
          className="bg-red-50 text-red-600 px-6 py-2 rounded-full font-black text-[10px] uppercase hover:bg-red-600 hover:text-white transition-all border border-red-100"
        >
          Disconnetti
        </button>
      </header>

      {user.role === 'admin' ? <AdminModule /> : <DocenteModule docente={user} />}
    </div>
  );
}

/* --- MODULO AMMINISTRATORE --- */
function AdminModule() {
  const [currentTab, setCurrentTab] = useState('docenti');
  const [docenti, setDocenti] = useState<any[]>([]);
  const [impegni, setImpegni] = useState<any[]>([]);
  const [piani, setPiani] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  // Form Stati
  const [fNome, setFNome] = useState('');
  const [fContratto, setFContratto] = useState('INTERA');
  const [fOreSett, setFOreSett] = useState(18);
  const [fMesi, setFMesi] = useState(9);

  const fetchData = useCallback(async () => {
    const { data: d } = await supabase.from('docenti').select('*').order('nome');
    const { data: i } = await supabase.from('impegni').select('*').order('data', { ascending: false });
    const { data: p } = await supabase.from('piani').select('*');
    setDocenti(d || []); setImpegni(i || []); setPiani(p || []);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // LOGICA COMPLESSA CALCOLO ORE DOVUTE
  const registraDocente = async () => {
    if(!fNome) return alert("Inserire Nome e Cognome");
    
    const codiceUnivoco = Math.random().toString(36).substring(2, 7).toUpperCase();
    
    // Algoritmo proporzionale: (80 ore / 18 ore base) * ore settimanali * (mesi servizio / 9 mesi scolastici)
    let baseContrattuale = 80;
    if (fContratto !== 'INTERA') {
      baseContrattuale = (80 / 18) * fOreSett;
    }
    
    const oreParametrate = baseContrattuale * (fMesi / 9);
    
    // Divisione equa tra Comma A (40h) e Comma B (40h)
    const oreA = Math.floor(oreParametrate / 2);
    const oreB = Math.ceil(oreParametrate / 2);

    const { error } = await supabase.from('docenti').insert([{
      nome: fNome,
      codice_accesso: codiceUnivoco,
      ore_a_dovute: oreA,
      ore_b_dovute: oreB,
      contratto: fContratto,
      ore_settimanali: fOreSett,
      mesi_servizio: fMesi
    }]);

    if (!error) {
      alert(`DOCENTE REGISTRATO\nCodice: ${codiceUnivoco}\nOre Comma A: ${oreA}\nOre Comma B: ${oreB}`);
      setFNome(''); setTab('docenti'); fetchData();
    } else {
      alert("ERRORE DATABASE: " + error.message);
    }
  };

  return (
    <main className="max-w-7xl mx-auto p-6 md:p-10">
      {/* Menu Navigazione */}
      <nav className="flex flex-wrap gap-3 mb-12">
        <button onClick={() => {setCurrentTab('docenti'); setSelectedDoc(null)}} className={`px-8 py-4 rounded-2xl font-black text-xs uppercase transition-all shadow-sm ${currentTab === 'docenti' ? 'bg-blue-600 text-white scale-105' : 'bg-white text-slate-400 border'}`}>Gestione Personale</button>
        <button onClick={() => setCurrentTab('nuovo_doc')} className={`px-8 py-4 rounded-2xl font-black text-xs uppercase transition-all shadow-sm ${currentTab === 'nuovo_doc' ? 'bg-emerald-600 text-white scale-105' : 'bg-white text-slate-400 border'}`}>+ Nuovo Docente</button>
        <button onClick={() => setCurrentTab('impegni')} className={`px-8 py-4 rounded-2xl font-black text-xs uppercase transition-all shadow-sm ${currentTab === 'impegni' ? 'bg-orange-600 text-white scale-105' : 'bg-white text-slate-400 border'}`}>+ Nuovo Impegno</button>
        <button onClick={() => setCurrentTab('appello')} className={`px-8 py-4 rounded-2xl font-black text-xs uppercase transition-all shadow-sm ${currentTab === 'appello' ? 'bg-indigo-600 text-white scale-105' : 'bg-white text-slate-400 border'}`}>Registro Appello</button>
      </nav>

      {/* RIEPILOGO DOCENTI (LA SBARRA COMPLESSA) */}
      {currentTab === 'docenti' && !selectedDoc && (
        <div className="grid gap-6">
          {docenti.map(d => {
            const pD = piani.filter(p => p.docente_id === d.id);
            
            // Logica Conteggio Triplo
            const aPian = pD.filter(p => p.tipo === 'A').reduce((s, c) => s + Number(c.ore_effettive), 0);
            const aReal = pD.filter(p => p.tipo === 'A' && p.presente).reduce((s, c) => s + Number(c.ore_effettive), 0);
            
            const bPian = pD.filter(p => p.tipo === 'B').reduce((s, c) => s + Number(c.ore_effettive), 0);
            const bReal = pD.filter(p => p.tipo === 'B' && p.presente).reduce((s, c) => s + Number(c.ore_effettive), 0);

            return (
              <div key={d.id} className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border-2 border-transparent hover:border-blue-500 transition-all flex flex-col lg:flex-row items-center gap-8">
                {/* Info Anagrafiche */}
                <div className="flex-1 w-full">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-black uppercase italic text-slate-800 tracking-tighter">{d.nome}</h3>
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase">COD: {d.codice_accesso}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[9px] font-black bg-slate-100 px-2 py-1 rounded text-slate-500 uppercase">{d.contratto}</span>
                    <span className="text-[9px] font-black bg-slate-100 px-2 py-1 rounded text-slate-500 uppercase">{d.ore_settimanali}H SETTIMANALI</span>
                    <span className="text-[9px] font-black bg-slate-100 px-2 py-1 rounded text-slate-500 uppercase">{d.mesi_servizio} MESI DI SERVIZIO</span>
                  </div>
                </div>

                {/* Contatori Comma A */}
                <div className="bg-blue-50/50 p-5 rounded-3xl border border-blue-100 flex gap-6 text-center">
                  <div>
                    <p className="text-[8px] font-black text-blue-400 uppercase mb-1">Dovute A</p>
                    <p className="text-xl font-black text-slate-400">{d.ore_a_dovute}h</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-orange-400 uppercase mb-1">Pianificate</p>
                    <p className="text-xl font-black text-orange-500">{aPian}h</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-blue-600 uppercase mb-1">Realizzate</p>
                    <p className="text-xl font-black text-blue-700">{aReal}h</p>
                  </div>
                </div>

                {/* Contatori Comma B */}
                <div className="bg-indigo-50/50 p-5 rounded-3xl border border-indigo-100 flex gap-6 text-center">
                  <div>
                    <p className="text-[8px] font-black text-indigo-400 uppercase mb-1">Dovute B</p>
                    <p className="text-xl font-black text-slate-400">{d.ore_b_dovute}h</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-orange-400 uppercase mb-1">Pianificate</p>
                    <p className="text-xl font-black text-orange-500">{bPian}h</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-indigo-600 uppercase mb-1">Realizzate</p>
                    <p className="text-xl font-black text-indigo-700">{bReal}h</p>
                  </div>
                </div>

                {/* Azioni Admin */}
                <div className="flex gap-2 w-full lg:w-auto">
                  <button 
                    onClick={() => setSelectedDoc(d)}
                    className="flex-1 lg:flex-none bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-blue-600 transition-all shadow-lg"
                  >
                    Gestisci Profilo
                  </button>
                  <button 
                    onClick={async () => {
                      if(confirm(`Eliminare definitivamente ${d.nome}?`)) {
                        await supabase.from('piani').delete().eq('docente_id', d.id);
                        await supabase.from('docenti').delete().eq('id', d.id);
                        fetchData();
                      }
                    }}
                    className="p-4 rounded-2xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-100 shadow-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LOGICA CREAZIONE DOCENTE (DETTAGLIATA) */}
      {currentTab === 'nuovo_doc' && (
        <div className="max-w-2xl mx-auto bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-100">
          <h2 className="text-3xl font-black mb-10 text-center uppercase italic text-emerald-600 tracking-tighter">Configurazione Contrattuale</h2>
          <div className="space-y-8">
            <div className="relative">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-5 mb-2 block">Nome e Cognome Docente</label>
              <input 
                type="text" 
                placeholder="es. Mario Rossi"
                className="w-full p-6 bg-slate-50 rounded-3xl font-bold uppercase border-4 border-transparent focus:border-emerald-500 outline-none transition-all shadow-inner"
                value={fNome}
                onChange={(e) => setFNome(e.target.value)}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-5 mb-2 block">Inquadramento</label>
                <select 
                  className="w-full p-6 bg-slate-50 rounded-3xl font-bold border-4 border-transparent focus:border-emerald-500 outline-none appearance-none cursor-pointer"
                  value={fContratto}
                  onChange={(e) => setFContratto(e.target.value)}
                >
                  <option value="INTERA">Cattedra Intera (18h)</option>
                  <option value="COMPLETAMENTO">Completamento</option>
                  <option value="SPEZZONE">Spezzone Orario</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-5 mb-2 block">Ore Settimanali</label>
                <input 
                  type="number" 
                  className="w-full p-6 bg-slate-50 rounded-3xl font-bold border-4 border-transparent focus:border-emerald-500 outline-none shadow-inner text-center"
                  value={fOreSett}
                  onChange={(e) => setFOreSett(Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-5 mb-2 block">Mesi di servizio previsti (su 9)</label>
              <input 
                type="range" min="1" max="9" step="1"
                className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                value={fMesi}
                onChange={(e) => setFMesi(Number(e.target.value))}
              />
              <div className="text-center font-black text-emerald-600 mt-2 text-xl">{fMesi} MESI</div>
            </div>

            <button 
              onClick={registraDocente}
              className="w-full bg-emerald-600 text-white p-7 rounded-[2.5rem] font-black text-2xl uppercase shadow-xl hover:bg-slate-900 transition-all hover:scale-[1.02] active:scale-95"
            >
              Crea Profilo Master
            </button>
          </div>
        </div>
      /* --- GESTIONE IMPEGNI (CREAZIONE E CANCELLAZIONE) --- */
      {currentTab === 'impegni' && (
        <div className="max-w-2xl mx-auto bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-100">
          <h2 className="text-3xl font-black mb-10 text-center uppercase italic text-orange-600 tracking-tighter">Nuovo Impegno Collegiale</h2>
          <div className="space-y-6">
            <div className="relative">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-5 mb-2 block">Titolo Attività</label>
              <input id="impTitolo" type="text" placeholder="es. Collegio Docenti / Scrutini" className="w-full p-6 bg-slate-50 rounded-3xl font-bold uppercase border-4 border-transparent focus:border-orange-500 outline-none transition-all shadow-inner" />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-5 mb-2 block">Data</label>
                <input id="impData" type="date" className="w-full p-6 bg-slate-50 rounded-3xl font-bold border-4 border-transparent focus:border-orange-500 outline-none shadow-inner" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-5 mb-2 block">Durata Massima (Ore)</label>
                <input id="impOre" type="number" step="0.5" placeholder="es. 2.5" className="w-full p-6 bg-slate-50 rounded-3xl font-bold border-4 border-transparent focus:border-orange-500 outline-none shadow-inner text-center" />
              </div>
            </div>

            <div className="flex gap-4 p-2 bg-slate-100 rounded-[2rem]">
              <button id="btnA" onClick={() => (window as any).tmpComma = 'A'} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase transition-all bg-white text-slate-400 focus:bg-blue-600 focus:text-white shadow-sm">Comma A (40h)</button>
              <button id="btnB" onClick={() => (window as any).tmpComma = 'B'} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase transition-all bg-white text-slate-400 focus:bg-indigo-600 focus:text-white shadow-sm">Comma B (40h)</button>
            </div>

            <button 
              onClick={async () => {
                const t = (document.getElementById('impTitolo') as HTMLInputElement).value;
                const d = (document.getElementById('impData') as HTMLInputElement).value;
                const o = (document.getElementById('impOre') as HTMLInputElement).value;
                const c = (window as any).tmpComma || 'A';

                if(!t || !d || !o) return alert("Compila tutti i campi!");

                const { error } = await supabase.from('impegni').insert([{ titolo: t, data: d, durata_max: Number(o), tipo: c }]);
                if(!error) { alert("IMPEGNO PUBBLICATO"); fetchData(); setCurrentTab('docenti'); }
              }}
              className="w-full bg-orange-600 text-white p-7 rounded-[2.5rem] font-black text-2xl uppercase shadow-xl hover:bg-slate-900 transition-all shadow-orange-200"
            >
              Pubblica in Calendario
            </button>
          </div>
        </div>
      )}

      {/* REGISTRO APPELLO E PRESENZE REALIZZATE */}
      {currentTab === 'appello' && (
        <div className="grid lg:grid-cols-2 gap-10 animate-in fade-in duration-500">
          <div className="space-y-4">
            <h2 className="text-xl font-black uppercase tracking-widest text-slate-400 mb-6 px-4">Seleziona Evento</h2>
            {impegni.map(imp => (
              <div 
                key={imp.id} 
                onClick={() => setCurrentTab(`appello_list_${imp.id}`)}
                className={`bg-white p-6 rounded-[2.5rem] border-4 cursor-pointer transition-all flex justify-between items-center ${currentTab === `appello_list_${imp.id}` ? 'border-indigo-600 shadow-xl scale-[1.02]' : 'border-transparent shadow-sm'}`}
              >
                <div>
                  <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase ${imp.tipo === 'A' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>COMMA {imp.tipo}</span>
                  <h3 className="text-xl font-black uppercase mt-2 tracking-tighter">{imp.titolo}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{imp.data} • {imp.durata_max} ORE</p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); if(confirm("Eliminare l'impegno?")) { supabase.from('piani').delete().eq('impegno_id', imp.id).then(() => supabase.from('impegni').delete().eq('id', imp.id).then(fetchData)); }}}
                  className="bg-red-50 text-red-400 p-4 rounded-2xl hover:bg-red-500 hover:text-white transition-all"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M4 8V4h12v4h2v2h-2v10H4V10H2V8h2zm2 2v8h8v-8H6zm2-4h4V4H8v2z"/></svg>
                </button>
              </div>
            ))}
          </div>

          <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border h-fit sticky top-32">
            {currentTab.startsWith('appello_list_') ? (
              <div>
                <h3 className="text-2xl font-black mb-8 border-b pb-6 text-indigo-600 uppercase italic">Validazione Presenze</h3>
                <div className="space-y-3">
                  {piani.filter(p => p.impegno_id === currentTab.split('_')[2]).map(p => {
                    const doc = docenti.find(d => d.id === p.docente_id);
                    return (
                      <div key={p.id} className="flex justify-between items-center p-5 bg-slate-50 rounded-3xl border-2 border-slate-100">
                        <div>
                          <p className="font-black uppercase text-sm">{doc?.nome}</p>
                          <p className="text-[10px] font-bold text-slate-400">ORE DICHIARATE: {p.ore_effettive}h</p>
                        </div>
                        <button 
                          onClick={async () => {
                            await supabase.from('piani').update({ presente: !p.presente }).eq('id', p.id);
                            fetchData();
                          }}
                          className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-md transition-all ${p.presente ? 'bg-emerald-500 text-white' : 'bg-white text-slate-300'}`}
                        >
                          {p.presente ? 'CONFERMATO ✓' : 'SEGNA PRESENTE'}
                        </button>
                      </div>
                    );
                  })}
                  {piani.filter(p => p.impegno_id === currentTab.split('_')[2]).length === 0 && (
                    <div className="text-center py-20">
                      <p className="text-slate-300 font-black uppercase italic tracking-widest">Nessuna pianificazione trovata</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-40">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                </div>
                <p className="text-slate-300 font-black uppercase italic tracking-widest">Seleziona un impegno per l'appello</p>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedDoc && (
        <div className="animate-in slide-in-from-right duration-500">
          <DocenteModule docente={selectedDoc} adminMode={true} />
        </div>
      )}
    </main>
  );
}

/* --- MODULO DOCENTE (PIANIFICAZIONE E REPORT PDF) --- */
function DocenteModule({ docente, adminMode = false }: any) {
  const [impegni, setImpegni] = useState<any[]>([]);
  const [piani, setPiani] = useState<any[]>([]);
  const [view, setView] = useState('pianifica');

  const fetchDocenteData = useCallback(async () => {
    const { data: i } = await supabase.from('impegni').select('*').order('data', { ascending: false });
    const { data: p } = await supabase.from('piani').select('*').eq('docente_id', docente.id);
    setImpegni(i || []); setPiani(p || []);
  }, [docente.id]);

  useEffect(() => { fetchDocenteData(); }, [fetchDocenteData]);

  const oreA = piani.filter(p => p.tipo === 'A').reduce((s, c) => s + Number(c.ore_effettive), 0);
  const oreB = piani.filter(p => p.tipo === 'B').reduce((s, c) => s + Number(c.ore_effettive), 0);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-10">
      {/* Navbar Docente */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
        <div className="bg-white p-8 rounded-[3rem] shadow-xl border flex-1 w-full flex items-center gap-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-black text-2xl italic shadow-lg shadow-blue-200">{docente.nome[0]}</div>
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter italic">{docente.nome}</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{docente.contratto} • {docente.ore_settimanali}H SETTIMANALI</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button onClick={() => setView('pianifica')} className={`px-8 py-5 rounded-3xl font-black text-[10px] uppercase shadow-lg transition-all ${view === 'pianifica' ? 'bg-blue-600 text-white' : 'bg-white text-slate-400'}`}>Pianifica</button>
          <button onClick={() => setView('report')} className={`px-8 py-5 rounded-3xl font-black text-[10px] uppercase shadow-lg transition-all ${view === 'report' ? 'bg-slate-900 text-white' : 'bg-white text-slate-400'}`}>Piano Attività PDF</button>
        </div>
      </div>

      {/* Contatori Statistiche */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard label="Dovute Comma A" value={`${docente.ore_a_dovute}h`} color="text-slate-300" />
        <StatCard label="Pianificate A" value={`${oreA}h`} color="text-blue-600" />
        <StatCard label="Dovute Comma B" value={`${docente.ore_b_dovute}h`} color="text-slate-300" />
        <StatCard label="Pianificate B" value={`${oreB}h`} color="text-indigo-600" />
      </div>

      {view === 'pianifica' && (
        <div className="grid gap-4">
          {impegni.map(imp => {
            const p = piani.find(x => x.impegno_id === imp.id);
            return (
              <div key={imp.id} className={`bg-white p-8 rounded-[2.5rem] border-2 flex flex-col md:flex-row justify-between items-center gap-6 transition-all ${p ? 'border-blue-500 shadow-md bg-blue-50/10' : 'border-transparent shadow-sm'}`}>
                <div className="flex-1">
                  <div className="flex gap-2 items-center mb-2">
                    <span className={`text-[8px] font-black px-3 py-1 rounded-full uppercase ${imp.tipo === 'A' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>COMMA {imp.tipo}</span>
                    {p?.presente && <span className="text-[8px] font-black bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full uppercase tracking-widest">Validato ✓</span>}
                  </div>
                  <h4 className="text-2xl font-black uppercase text-slate-800 tracking-tighter">{imp.titolo}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(imp.data).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <label className="text-[8px] font-black text-slate-300 uppercase mb-1 block">Ore Effettive</label>
                    <input 
                      id={`ore-${imp.id}`} 
                      type="number" step="0.5" 
                      defaultValue={p ? p.ore_effettive : imp.durata_max}
                      disabled={p?.presente && !adminMode}
                      className="w-20 p-4 rounded-2xl bg-slate-100 font-black text-center text-xl outline-none focus:ring-2 ring-blue-500" 
                    />
                  </div>
                  <button 
                    onClick={async () => {
                      const val = (document.getElementById(`ore-${imp.id}`) as HTMLInputElement).value;
                      if(p) {
                        if(p.presente && !adminMode) return alert("Attività validata: non puoi rimuoverla.");
                        await supabase.from('piani').delete().eq('id', p.id);
                      } else {
                        await supabase.from('piani').insert([{ docente_id: docente.id, impegno_id: imp.id, ore_effettive: Number(val), tipo: imp.tipo, presente: false }]);
                      }
                      fetchDocenteData();
                    }}
                    className={`px-10 py-5 rounded-[2rem] font-black text-xs uppercase shadow-xl active:scale-95 transition-all ${p ? 'bg-red-500 text-white' : 'bg-slate-900 text-white'}`}
                  >
                    {p ? 'Rimuovi' : 'Inserisci'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'report' && (
        <div className="bg-white p-16 rounded-[4rem] shadow-2xl border" id="report-stampa">
          <div className="flex justify-between items-start mb-16 border-b-8 border-slate-900 pb-12">
            <div>
              <h1 className="text-6xl font-black italic tracking-tighter uppercase">Riepilogo Attività</h1>
              <p className="text-2xl font-bold text-slate-400 uppercase mt-4">Docente: <span className="text-slate-900">{docente.nome}</span></p>
              <p className="text-xs font-black text-slate-300 uppercase mt-2 tracking-[0.2em]">{docente.contratto} • A.S. 2024/2025</p>
            </div>
            <button onClick={() => window.print()} className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase shadow-xl print:hidden">Stampa Piano</button>
          </div>

          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black uppercase text-slate-400 border-b-4 border-slate-100">
                <th className="py-8">Attività Svolta</th>
                <th className="py-8 text-center">Data</th>
                <th className="py-8 text-center">Comma</th>
                <th className="py-8 text-right">Ore</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-50">
              {piani.map(p => {
                const i = impegni.find(x => x.id === p.impegno_id);
                return (
                  <tr key={p.id}>
                    <td className="py-8 font-black uppercase text-sm tracking-tight text-slate-700">{i?.titolo}</td>
                    <td className="py-8 text-center font-mono text-xs text-slate-400">{i?.data}</td>
                    <td className="py-8 text-center text-xs font-black">{p.tipo}</td>
                    <td className="py-8 text-right font-black text-2xl italic">{p.ore_effettive}H</td>
                  </tr>
                );
              })}
              <tr className="bg-slate-900 text-white">
                <td colSpan={3} className="p-10 font-black uppercase text-sm italic tracking-[0.3em]">Totale Ore Dichiarate</td>
                <td className="p-10 text-right font-black text-5xl italic">{oreA + oreB}H</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-40 grid grid-cols-2 gap-40 invisible print:visible">
            <div className="border-t-4 border-slate-900 pt-6 text-center text-xs font-black uppercase">Il Docente</div>
            <div className="border-t-4 border-slate-900 pt-6 text-center text-xs font-black uppercase">Il Dirigente Scolastico</div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: any) {
  return (
    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 text-center">
      <p className="text-[8px] font-black uppercase text-slate-400 mb-2 tracking-widest">{label}</p>
      <p className={`text-3xl font-black italic tracking-tighter ${color}`}>{value}</p>
    </div>
  );
}
      )}
