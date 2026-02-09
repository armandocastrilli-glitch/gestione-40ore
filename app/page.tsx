"use client";
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// INIZIALIZZAZIONE PROFESSIONALE SUPABASE
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function GestionaleScuolaMaster() {
  const [user, setUser] = useState<any>(null);
  const [loginCode, setLoginCode] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // LOGICA DI AUTENTICAZIONE CON GESTIONE ERRORI
  const handleLogin = async () => {
    const code = loginCode.trim().toUpperCase();
    if (!code) return alert("Inserisci un codice!");
    
    if (code === 'ADMIN123') {
      setUser({ id: 'admin', nome: 'Amministratore Generale', role: 'admin' });
      return;
    }

    setIsAuthLoading(true);
    try {
      const { data, error } = await supabase
        .from('docenti')
        .select('*')
        .eq('codice_accesso', code)
        .single();
      
      if (error) throw new Error("Codice non trovato nel database.");
      if (data) setUser(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-white p-12 rounded-[3.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] w-full max-w-md border-[12px] border-slate-100">
          <div className="text-center mb-10">
            <h1 className="text-5xl font-black italic tracking-tighter text-blue-700 uppercase">S-Pro</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Professional School Management</p>
          </div>
          <div className="space-y-6">
            <input 
              type="text" 
              placeholder="CODICE ACCESSO" 
              className="w-full p-6 border-4 border-slate-50 rounded-3xl text-center text-3xl font-mono uppercase focus:border-blue-500 outline-none transition-all shadow-inner"
              value={loginCode} 
              onChange={(e) => setLoginCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <button 
              onClick={handleLogin} 
              disabled={isAuthLoading}
              className="w-full bg-blue-600 text-white p-6 rounded-3xl font-black text-xl hover:bg-slate-800 transition-all uppercase shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isAuthLoading ? 'Verifica in corso...' : 'Accedi al Sistema'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-slate-900">
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-[1000] px-8 py-5 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-700 rounded-2xl flex items-center justify-center text-white font-black italic shadow-lg shadow-blue-200">S</div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-tight leading-none">{user.nome}</h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Status: {user.role === 'admin' ? 'Amministratore' : 'Docente'}</p>
          </div>
        </div>
        <button onClick={() => {setUser(null); setLoginCode('');}} className="bg-red-50 text-red-600 px-6 py-2 rounded-full font-black text-[10px] uppercase border border-red-100 hover:bg-red-600 hover:text-white transition-all">Logout</button>
      </header>
      
      {user.role === 'admin' ? <AdminPanel /> : <DocentePanel docenteData={user} />}
    </div>
  );
}

/* --- MODULO AMMINISTRATORE: LOGICA COMPLETA --- */
function AdminPanel() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [docenti, setDocenti] = useState<any[]>([]);
  const [impegni, setImpegni] = useState<any[]>([]);
  const [piani, setPiani] = useState<any[]>([]);
  const [selectedForEdit, setSelectedForEdit] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form Stati per Nuovo Docente
  const [fNome, setFNome] = useState('');
  const [fContratto, setFContratto] = useState('INTERA');
  const [fOreSett, setFOreSett] = useState(18);
  const [fMesiServ, setFMesiServ] = useState(9);

  const refreshGlobalData = useCallback(async () => {
    setIsLoading(true);
    const { data: d } = await supabase.from('docenti').select('*').order('nome');
    const { data: i } = await supabase.from('impegni').select('*').order('data', { ascending: false });
    const { data: p } = await supabase.from('piani').select('*');
    setDocenti(d || []); setImpegni(i || []); setPiani(p || []);
    setIsLoading(false);
  }, []);

  useEffect(() => { refreshGlobalData(); }, [refreshGlobalData]);

  // CALCOLO ORE PROPORZIONALE (FORMULA MINISTERIALE ADATTATA)
  const salvaDocente = async () => {
    if(!fNome) return alert("Il nome è obbligatorio!");
    const cod = Math.random().toString(36).substring(2, 7).toUpperCase();
    
    // Calcolo: Base 80 ore rapportata alle ore settimanali e ai mesi di servizio effettivamente svolti
    let oreBaseSettimanali = 80;
    if (fContratto !== 'INTERA') {
      oreBaseSettimanali = (80 / 18) * fOreSett;
    }
    
    const oreParametrateSuiMesi = oreBaseSettimanali * (fMesiServ / 9);
    
    // Divisione tra Comma A e B (40+40)
    const oreA = Math.floor(oreParametrateSuiMesi / 2);
    const oreB = Math.ceil(oreParametrateSuiMesi / 2);

    const { error } = await supabase.from('docenti').insert([{
      nome: fNome,
      codice_accesso: cod,
      ore_a_dovute: oreA,
      ore_b_dovute: oreB,
      contratto: fContratto,
      ore_settimanali: fOreSett,
      mesi_servizio: fMesiServ
    }]);

    if (!error) {
      alert(`DOCENTE CREATO!\nCodice: ${cod}\nTotale Ore: ${oreA + oreB}`);
      setFNome(''); setActiveTab('dashboard'); refreshGlobalData();
    } else {
      alert("Errore DB: " + error.message);
    }
  };

  if (isLoading) return <div className="p-20 text-center font-black animate-pulse">CARICAMENTO DATABASE...</div>;

  return (
    <main className="max-w-7xl mx-auto p-8">
      {/* Navigazione Dashboard */}
      <div className="flex flex-wrap gap-4 mb-12">
        <button onClick={() => {setActiveTab('dashboard'); setSelectedForEdit(null)}} className={`px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-sm transition-all ${activeTab === 'dashboard' ? 'bg-slate-900 text-white scale-105' : 'bg-white text-slate-400 border'}`}>Tabella Riepilogo</button>
        <button onClick={() => setActiveTab('nuovo_docente')} className={`px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-sm transition-all ${activeTab === 'nuovo_docente' ? 'bg-emerald-600 text-white scale-105' : 'bg-white text-slate-400 border'}`}>+ Registra Docente</button>
        <button onClick={() => setActiveTab('nuovo_impegno')} className={`px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-sm transition-all ${activeTab === 'nuovo_impegno' ? 'bg-orange-600 text-white scale-105' : 'bg-white text-slate-400 border'}`}>+ Crea Impegno</button>
        <button onClick={() => setActiveTab('appello')} className={`px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-sm transition-all ${activeTab === 'appello' ? 'bg-indigo-600 text-white scale-105' : 'bg-white text-slate-400 border'}`}>Registro Appello</button>
      </div>

      {activeTab === 'dashboard' && !selectedForEdit && (
        <div className="space-y-4">
          {docenti.map(d => {
            const pD = piani.filter(p => p.docente_id === d.id);
            // Calcolo ore pianificate (dal docente) vs validate (dall'appello)
            const aP = pD.filter(p => p.tipo === 'A').reduce((s, c) => s + Number(c.ore_effettive), 0);
            const aV = pD.filter(p => p.tipo === 'A' && p.presente).reduce((s, c) => s + Number(c.ore_effettive), 0);
            const bP = pD.filter(p => p.tipo === 'B').reduce((s, c) => s + Number(c.ore_effettive), 0);
            const bV = pD.filter(p => p.tipo === 'B' && p.presente).reduce((s, c) => s + Number(c.ore_effettive), 0);

            return (
              <div key={d.id} className="bg-white p-8 rounded-[2.5rem] border-2 border-transparent hover:border-blue-500 shadow-sm flex flex-col lg:flex-row items-center gap-10 transition-all">
                <div className="flex-1 w-full text-center lg:text-left">
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-800">{d.nome}</h3>
                  <div className="flex flex-wrap justify-center lg:justify-start gap-3 mt-2">
                    <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">{d.contratto}</span>
                    <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">{d.ore_settimanali}H SETT.</span>
                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">COD: {d.codice_accesso}</span>
                  </div>
                </div>

                <div className="flex gap-4 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
                  <CounterBox label="Comma A" dovute={d.ore_a_dovute} pian={aP} real={aV} color="blue" />
                  <CounterBox label="Comma B" dovute={d.ore_b_dovute} pian={bP} real={bV} color="indigo" />
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setSelectedForEdit(d)} className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-blue-700">Gestisci</button>
                  <button onClick={async () => {
                    if(confirm(`Eliminare ${d.nome}? Saranno cancellati anche i suoi piani ore.`)) {
                      await supabase.from('piani').delete().eq('docente_id', d.id);
                      await supabase.from('docenti').delete().eq('id', d.id);
                      refreshGlobalData();
                    }
                  }} className="bg-red-50 text-red-500 p-4 rounded-2xl border border-red-100 hover:bg-red-500 hover:text-white transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'nuovo_docente' && (
        <div className="max-w-2xl mx-auto bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-300">
          <h2 className="text-3xl font-black mb-10 text-center uppercase italic text-emerald-600 tracking-tighter">Configurazione Docente</h2>
          <div className="space-y-8">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-2 block">Nominativo Completo</label>
              <input type="text" placeholder="es. Maria Rossi" className="w-full p-6 bg-slate-50 rounded-3xl font-bold uppercase border-4 border-transparent focus:border-emerald-500 outline-none shadow-inner" value={fNome} onChange={e => setFNome(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-2 block">Tipo Contratto</label>
                <select className="w-full p-6 bg-slate-50 rounded-3xl font-bold border-4 border-transparent focus:border-emerald-500 outline-none cursor-pointer" value={fContratto} onChange={e => setFContratto(e.target.value)}>
                  <option value="INTERA">Cattedra Intera</option>
                  <option value="COMPLETAMENTO">Completamento</option>
                  <option value="SPEZZONE">Spezzone</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-2 block">Ore Settimanali</label>
                <input type="number" step="0.5" className="w-full p-6 bg-slate-50 rounded-3xl font-bold border-4 border-transparent focus:border-emerald-500 outline-none text-center" value={fOreSett} onChange={e => setFOreSett(Number(e.target.value))} />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-2 block">Mesi di Servizio (su 9 totali)</label>
              <input type="range" min="1" max="9" step="1" className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600" value={fMesiServ} onChange={e => setFMesiServ(Number(e.target.value))} />
              <div className="text-center font-black text-emerald-600 mt-4 text-2xl tracking-widest">{fMesiServ} MESI</div>
            </div>
            <button onClick={salvaDocente} className="w-full bg-emerald-600 text-white p-7 rounded-[2.5rem] font-black text-2xl uppercase shadow-xl hover:bg-slate-900 transition-all hover:scale-[1.02]">Salva nel Sistema</button>
          </div>
        </div>
      )}
      {/* GESTIONE IMPEGNI COLLEGIALI */}
      {activeTab === 'nuovo_impegno' && (
        <div className="max-w-2xl mx-auto bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-100">
          <h2 className="text-3xl font-black mb-10 text-center uppercase italic text-orange-600 tracking-tighter">Nuovo Impegno</h2>
          <div className="space-y-6">
            <input id="impTit" type="text" placeholder="TITOLO (es. Collegio Docenti n.1)" className="w-full p-6 bg-slate-50 rounded-3xl font-bold uppercase border-4 border-transparent focus:border-orange-500 outline-none shadow-inner" />
            <div className="grid grid-cols-2 gap-4">
              <input id="impDat" type="date" className="p-6 bg-slate-50 rounded-3xl font-bold border-4 border-transparent focus:border-orange-500 outline-none" />
              <input id="impDur" type="number" step="0.5" placeholder="ORE MAX" className="p-6 bg-slate-50 rounded-3xl font-bold border-4 border-transparent focus:border-orange-500 outline-none text-center" />
            </div>
            <div className="flex gap-4 p-2 bg-slate-100 rounded-[2rem]">
              <button onClick={() => (window as any).tmpTipo = 'A'} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase transition-all bg-white text-slate-400 focus:bg-blue-600 focus:text-white shadow-sm">Comma A (40h)</button>
              <button onClick={() => (window as any).tmpTipo = 'B'} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase transition-all bg-white text-slate-400 focus:bg-indigo-600 focus:text-white shadow-sm">Comma B (40h)</button>
            </div>
            <button onClick={async () => {
              const t = (document.getElementById('impTit') as HTMLInputElement).value;
              const d = (document.getElementById('impDat') as HTMLInputElement).value;
              const h = (document.getElementById('impDur') as HTMLInputElement).value;
              const tip = (window as any).tmpTipo || 'A';
              if(!t || !d || !h) return alert("Compila tutto!");
              await supabase.from('impegni').insert([{ titolo: t, data: d, durata_max: Number(h), tipo: tip }]);
              alert("IMPEGNO PUBBLICATO"); refreshGlobalData(); setActiveTab('dashboard');
            }} className="w-full bg-orange-600 text-white p-7 rounded-[2.5rem] font-black text-2xl uppercase shadow-xl hover:bg-slate-900 transition-all">Pubblica Impegno</button>
          </div>
        </div>
      )}

      {/* REGISTRO APPELLO E CANCELLAZIONE */}
      {activeTab === 'appello' && (
        <div className="grid lg:grid-cols-2 gap-10">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-4">Calendario Impegni</h3>
            {impegni.map(i => (
              <div key={i.id} onClick={() => (window as any).activeImp = i.id} className="bg-white p-6 rounded-[2.5rem] border-4 border-transparent hover:border-indigo-600 shadow-sm cursor-pointer flex justify-between items-center group transition-all">
                <div>
                  <span className={`text-[8px] font-black px-2 py-1 rounded-md mb-2 inline-block ${i.tipo === 'A' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>COMMA {i.tipo}</span>
                  <h4 className="font-black uppercase text-sm tracking-tight">{i.titolo}</h4>
                  <p className="text-[10px] font-bold text-slate-400">{i.data} • {i.durata_max} ORE</p>
                </div>
                <button onClick={(e) => {
                  e.stopPropagation();
                  if(confirm("Eliminare l'impegno e tutte le ore correlate?")) {
                    supabase.from('piani').delete().eq('impegno_id', i.id).then(() => {
                      supabase.from('impegni').delete().eq('id', i.id).then(refreshGlobalData);
                    });
                  }
                }} className="bg-red-50 text-red-400 p-4 rounded-2xl hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M4 8V4h12v4h2v2h-2v10H4V10H2V8h2zm2 2v8h8v-8H6zm2-4h4V4H8v2z"/></svg>
                </button>
              </div>
            ))}
          </div>
          <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border min-h-[500px] sticky top-32">
            <h3 className="text-2xl font-black mb-8 uppercase text-indigo-600 italic">Validazione Presenze</h3>
            <div className="space-y-3">
              {piani.filter(p => p.impegno_id === (window as any).activeImp).map(p => {
                const doc = docenti.find(d => d.id === p.docente_id);
                return (
                  <div key={p.id} className="flex justify-between items-center p-5 bg-slate-50 rounded-3xl border-2">
                    <div>
                      <p className="font-black uppercase text-xs">{doc?.nome}</p>
                      <p className="text-[10px] font-bold text-slate-400">ORE DICHIARATE: {p.ore_effettive}h</p>
                    </div>
                    <button 
                      onClick={async () => {
                        await supabase.from('piani').update({ presente: !p.presente }).eq('id', p.id);
                        refreshGlobalData();
                      }}
                      className={`px-6 py-3 rounded-2xl font-black text-[9px] uppercase shadow-md transition-all ${p.presente ? 'bg-emerald-500 text-white' : 'bg-white text-slate-300'}`}
                    >
                      {p.presente ? 'CONFERMATO ✓' : 'SEGNA PRESENTE'}
                    </button>
                  </div>
                );
              })}
              {piani.filter(p => p.impegno_id === (window as any).activeImp).length === 0 && (
                <div className="text-center py-20 text-slate-300 font-black uppercase italic tracking-widest text-sm">Seleziona un impegno a sinistra</div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedForEdit && (
        <div className="animate-in slide-in-from-bottom duration-500">
          <div className="flex justify-between items-center mb-8 bg-blue-50 p-6 rounded-3xl border border-blue-100">
            <p className="text-sm font-black uppercase text-blue-700">Modalità Supervisione Admin su: {selectedForEdit.nome}</p>
            <button onClick={() => setSelectedForEdit(null)} className="bg-blue-700 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg">Chiudi Gestione</button>
          </div>
          <DocentePanel docenteData={selectedForEdit} adminMode={true} />
        </div>
      )}
    </main>
  );
}

/* --- MODULO DOCENTE: PIANIFICAZIONE E PDF --- */
function DocentePanel({ docenteData, adminMode = false }: any) {
  const [view, setView] = useState('planning');
  const [impegni, setImpegni] = useState<any[]>([]);
  const [piani, setPiani] = useState<any[]>([]);

  const loadDocData = useCallback(async () => {
    const { data: i } = await supabase.from('impegni').select('*').order('data', { ascending: false });
    const { data: p } = await supabase.from('piani').select('*').eq('docente_id', docenteData.id);
    setImpegni(i || []); setPiani(p || []);
  }, [docenteData.id]);

  useEffect(() => { loadDocData(); }, [loadDocData]);

  const tA = piani.filter(p => p.tipo === 'A').reduce((s, c) => s + Number(c.ore_effettive), 0);
  const tB = piani.filter(p => p.tipo === 'B').reduce((s, c) => s + Number(c.ore_effettive), 0);

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-10">
      <div className="flex flex-col lg:flex-row justify-between items-center mb-12 gap-8">
        <div className="bg-white p-8 rounded-[3rem] shadow-xl border-b-[10px] border-blue-600 flex-1 w-full flex items-center gap-6">
          <div className="w-16 h-16 bg-blue-700 rounded-full flex items-center justify-center text-white font-black text-2xl italic shadow-xl">{docenteData.nome[0]}</div>
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter italic leading-none">{docenteData.nome}</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-[0.2em]">{docenteData.contratto} • {docenteData.ore_settimanali}H SETTIMANALI</p>
          </div>
        </div>
        <div className="flex gap-3 w-full lg:w-auto">
          <button onClick={() => setView('planning')} className={`flex-1 lg:flex-none px-10 py-5 rounded-3xl font-black text-[10px] uppercase shadow-lg transition-all ${view === 'planning' ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 border'}`}>Pianificazione</button>
          <button onClick={() => setView('report')} className={`flex-1 lg:flex-none px-10 py-5 rounded-3xl font-black text-[10px] uppercase shadow-lg transition-all ${view === 'report' ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border'}`}>Report PDF</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard label="Dovute A" val={`${docenteData.ore_a_dovute}h`} sub="da contratto" />
        <StatCard label="Pianificate A" val={`${tA}h`} sub={`${docenteData.ore_a_dovute - tA}h mancanti`} color="text-blue-600" />
        <StatCard label="Dovute B" val={`${docenteData.ore_b_dovute}h`} sub="da contratto" />
        <StatCard label="Pianificate B" val={`${tB}h`} sub={`${docenteData.ore_b_dovute - tB}h mancanti`} color="text-indigo-600" />
      </div>

      {view === 'planning' && (
        <div className="space-y-4">
          {impegni.map(imp => {
            const p = piani.find(x => x.impegno_id === imp.id);
            return (
              <div key={imp.id} className={`bg-white p-8 rounded-[3rem] border-2 flex flex-col md:flex-row justify-between items-center gap-6 transition-all ${p ? 'border-blue-500 bg-blue-50/10 shadow-lg' : 'border-transparent shadow-sm'}`}>
                <div className="flex-1">
                  <div className="flex gap-2 mb-3">
                    <span className={`text-[8px] font-black px-3 py-1 rounded-full uppercase ${imp.tipo === 'A' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>COMMA {imp.tipo}</span>
                    {p?.presente && <span className="text-[8px] font-black bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full uppercase italic">Validato ✓</span>}
                  </div>
                  <h4 className="text-2xl font-black uppercase text-slate-800 tracking-tighter">{imp.titolo}</h4>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">{new Date(imp.data).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-[9px] font-black text-slate-300 uppercase mb-2">Ore Svolte</p>
                    <input 
                      id={`hr-${imp.id}`} type="number" step="0.5" 
                      defaultValue={p ? p.ore_effettive : imp.durata_max}
                      disabled={p?.presente && !adminMode}
                      className="w-20 p-4 rounded-2xl bg-slate-100 font-black text-center text-xl outline-none focus:ring-4 ring-blue-100 border-none" 
                    />
                  </div>
                  <button 
                    onClick={async () => {
                      const hVal = (document.getElementById(`hr-${imp.id}`) as HTMLInputElement).value;
                      if(p) {
                        if(p.presente && !adminMode) return alert("Questa attività è già stata validata dall'ufficio.");
                        await supabase.from('piani').delete().eq('id', p.id);
                      } else {
                        await supabase.from('piani').insert([{ docente_id: docenteData.id, impegno_id: imp.id, ore_effettive: Number(hVal), tipo: imp.tipo, presente: false }]);
                      }
                      loadDocData();
                    }}
                    className={`px-12 py-5 rounded-[2rem] font-black text-xs uppercase shadow-xl transition-all active:scale-95 ${p ? 'bg-red-500 text-white' : 'bg-slate-900 text-white hover:bg-blue-700'}`}
                  >
                    {p ? 'Elimina' : 'Aggiungi'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'report' && (
        <div className="bg-white p-12 lg:p-20 rounded-[4rem] shadow-2xl border print:border-none print:shadow-none print:p-0" id="pdf-area">
          <div className="border-b-[12px] border-slate-900 pb-10 mb-10 flex justify-between items-end">
            <div>
              <h1 className="text-5xl font-black uppercase italic tracking-tighter">Piano Attività</h1>
              <p className="text-xl font-bold text-slate-400 mt-2 uppercase">Docente: <span className="text-slate-900">{docenteData.nome}</span></p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-slate-400">Anno Scolastico</p>
              <p className="text-2xl font-black italic">2025 / 2026</p>
            </div>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] font-black uppercase text-slate-300 border-b-4 border-slate-50">
                <th className="py-6">Descrizione Impegno</th>
                <th className="py-6 text-center">Data</th>
                <th className="py-6 text-center">Tipo</th>
                <th className="py-6 text-right">Ore</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-50">
              {piani.map(p => {
                const i = impegni.find(x => x.id === p.impegno_id);
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-6 font-black uppercase text-sm tracking-tight">{i?.titolo}</td>
                    <td className="py-6 text-center font-mono text-xs text-slate-400">{i?.data}</td>
                    <td className="py-6 text-center font-black text-xs">COMMA {p.tipo}</td>
                    <td className="py-6 text-right font-black text-xl italic">{p.ore_effettive}H</td>
                  </tr>
                );
              })}
              <tr className="bg-slate-900 text-white">
                <td colSpan={3} className="p-10 font-black uppercase text-sm italic tracking-[0.3em]">Totale Ore Dichiarate</td>
                <td className="p-10 text-right font-black text-5xl italic">{(tA + tB).toFixed(1)}H</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-32 hidden print:grid grid-cols-2 gap-20">
            <div className="border-t-2 border-slate-900 pt-4 text-center text-[10px] font-black uppercase">Firma del Docente</div>
            <div className="border-t-2 border-slate-900 pt-4 text-center text-[10px] font-black uppercase">Il Dirigente Scolastico</div>
          </div>
          <button onClick={() => window.print()} className="w-full mt-12 bg-blue-600 text-white p-7 rounded-[2rem] font-black text-xl uppercase shadow-xl print:hidden transition-all hover:bg-slate-900">Salva / Stampa Documento</button>
        </div>
      )}
    </div>
  );
}

// COMPONENTI DI SUPPORTO
function CounterBox({ label, dovute, pian, real, color }: any) {
  const c = color === 'blue' ? 'text-blue-600' : 'text-indigo-600';
  const bg = color === 'blue' ? 'bg-blue-50/50' : 'bg-indigo-50/50';
  return (
    <div className={`${bg} p-5 rounded-[2rem] border border-slate-100 flex gap-6 text-center min-w-[280px]`}>
      <div><p className="text-[8px] font-black text-slate-400 uppercase mb-1">Dovute</p><p className="text-xl font-black text-slate-400 italic">{dovute}h</p></div>
      <div><p className="text-[8px] font-black text-orange-400 uppercase mb-1">Pianificate</p><p className="text-xl font-black text-orange-500 italic">{pian}h</p></div>
      <div><p className="text-[8px] font-black uppercase mb-1 ${c}">Validate</p><p className={`text-xl font-black italic ${c}`}>{real}h</p></div>
    </div>
  );
}

function StatCard({ label, val, sub, color = "text-slate-800" }: any) {
  return (
    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 text-center">
      <p className="text-[8px] font-black uppercase text-slate-400 mb-2 tracking-widest">{label}</p>
      <p className={`text-3xl font-black italic tracking-tighter ${color}`}>{val}</p>
      <p className="text-[8px] font-bold text-slate-300 uppercase mt-1">{sub}</p>
    </div>
  );
}
