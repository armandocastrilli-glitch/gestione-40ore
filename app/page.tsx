"use client";
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// INIZIALIZZAZIONE SUPABASE
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function GestionaleScuolaMaster() {
  const [user, setUser] = useState<any>(null);
  const [loginCode, setLoginCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const code = loginCode.trim().toUpperCase();
    if (!code) return;
    setLoading(true);
    if (code === 'ADMIN123') {
      setUser({ id: 'admin', nome: 'Amministratore', role: 'admin' });
    } else {
      const { data, error } = await supabase.from('docenti').select('*').eq('codice_accesso', code).single();
      if (data) setUser(data);
      else alert("Codice errato o non registrato.");
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
        <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl w-full max-w-md border-[12px] border-slate-100 animate-in fade-in zoom-in duration-500">
          <div className="text-center mb-10">
            <h1 className="text-5xl font-black italic tracking-tighter text-blue-700 uppercase">S-Pro</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">Management System</p>
          </div>
          <input 
            type="text" placeholder="CODICE ACCESSO" 
            className="w-full p-6 border-4 border-slate-50 rounded-3xl text-center text-3xl font-mono uppercase focus:border-blue-500 outline-none transition-all mb-6 shadow-inner"
            value={loginCode} onChange={(e) => setLoginCode(e.target.value)}
          />
          <button onClick={handleLogin} className="w-full bg-blue-600 text-white p-7 rounded-[2.5rem] font-black text-xl hover:bg-slate-900 transition-all uppercase shadow-xl active:scale-95">
            {loading ? 'Verifica...' : 'Accedi'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-[100] px-8 py-5 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black italic shadow-lg">S</div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-tight">{user.nome}</h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{user.role === 'admin' ? 'Pannello di Controllo' : 'Area Docente'}</p>
          </div>
        </div>
        <button onClick={() => {setUser(null); setLoginCode('');}} className="bg-red-50 text-red-600 px-6 py-2 rounded-full font-black text-[10px] uppercase border border-red-100 hover:bg-red-600 hover:text-white transition-all">Esci dal sistema</button>
      </header>
      {user.role === 'admin' ? <AdminModule /> : <DocenteModule docente={user} />}
    </div>
  );
}

function AdminModule() {
  const [tab, setTab] = useState('docenti');
  const [docenti, setDocenti] = useState<any[]>([]);
  const [impegni, setImpegni] = useState<any[]>([]);
  const [piani, setPiani] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [activeImpId, setActiveImpId] = useState<string | null>(null);

  // Form Docente
  const [fNome, setFNome] = useState('');
  const [fContr, setFContr] = useState('INTERA');
  const [fOre, setFOre] = useState(18);
  const [fMesi, setFMesi] = useState(9);

  const loadData = useCallback(async () => {
    const { data: d } = await supabase.from('docenti').select('*').order('nome');
    const { data: i } = await supabase.from('impegni').select('*').order('data', { ascending: false });
    const { data: p } = await supabase.from('piani').select('*');
    setDocenti(d || []); setImpegni(i || []); setPiani(p || []);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const addDocente = async () => {
    if(!fNome) return alert("Inserisci il nome del docente");
    const cod = Math.random().toString(36).substring(2, 7).toUpperCase();
    // Formula ore parametrate
    let base = fContr === 'INTERA' ? 80 : (80 / 18) * fOre;
    const totale = base * (fMesi / 9);
    
    const { error } = await supabase.from('docenti').insert([{
      nome: fNome, codice_accesso: cod, 
      ore_a_dovute: Math.floor(totale/2), ore_b_dovute: Math.ceil(totale/2),
      contratto: fContr, ore_settimanali: fOre, mesi_servizio: fMesi
    }]);

    if (!error) { 
      alert("DOCENTE REGISTRATO\nCodice Accesso: " + cod); 
      setFNome(''); setTab('docenti'); loadData(); 
    } else {
      alert("Errore database: " + error.message);
    }
  };

  return (
    <main className="max-w-7xl mx-auto p-6 lg:p-10">
      <nav className="flex flex-wrap gap-3 mb-12">
        <button onClick={() => {setTab('docenti'); setSelectedDoc(null)}} className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-sm transition-all ${tab === 'docenti' ? 'bg-slate-900 text-white scale-105' : 'bg-white border text-slate-400'}`}>Dashboard</button>
        <button onClick={() => setTab('nuovo_doc')} className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-sm transition-all ${tab === 'nuovo_doc' ? 'bg-emerald-600 text-white scale-105' : 'bg-white border text-slate-400'}`}>+ Docente</button>
        <button onClick={() => setTab('impegni')} className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-sm transition-all ${tab === 'impegni' ? 'bg-orange-600 text-white scale-105' : 'bg-white border text-slate-400'}`}>+ Impegno</button>
        <button onClick={() => setTab('appello')} className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-sm transition-all ${tab === 'appello' ? 'bg-indigo-600 text-white scale-105' : 'bg-white border text-slate-400'}`}>Appello</button>
        <button onClick={() => setTab('documenti')} className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-sm transition-all ${tab === 'documenti' ? 'bg-blue-600 text-white scale-105' : 'bg-white border text-slate-400'}`}>Bacheca</button>
      </nav>

      {tab === 'docenti' && !selectedDoc && (
        <div className="grid gap-6 animate-in slide-in-from-bottom-4 duration-500">
          {docenti.map(d => {
            const pD = piani.filter(p => p.docente_id === d.id);
            const aP = pD.filter(p => p.tipo === 'A').reduce((s, c) => s + Number(c.ore_effettive), 0);
            const aV = pD.filter(p => p.tipo === 'A' && p.presente).reduce((s, c) => s + Number(c.ore_effettive), 0);
            const bP = pD.filter(p => p.tipo === 'B').reduce((s, c) => s + Number(c.ore_effettive), 0);
            const bV = pD.filter(p => p.tipo === 'B' && p.presente).reduce((s, c) => s + Number(c.ore_effettive), 0);
            return (
              <div key={d.id} className="bg-white p-8 rounded-[3rem] border-2 border-transparent hover:border-blue-500 shadow-sm flex flex-col lg:flex-row items-center gap-8 transition-all">
                <div className="flex-1">
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-800">{d.nome}</h3>
                  <div className="flex gap-2 mt-2">
                    <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-[9px] font-black uppercase">{d.contratto}</span>
                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase italic">Cod: {d.codice_accesso}</span>
                  </div>
                </div>
                <div className="flex gap-4">
                  <AdminCounter label="Comma A" dov={d.ore_a_dovute} p={aP} v={aV} color="blue" />
                  <AdminCounter label="Comma B" dov={d.ore_b_dovute} p={bP} v={bV} color="indigo" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setSelectedDoc(d)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-blue-700">Gestisci</button>
                  <button onClick={async () => {if(confirm("Eliminare definitivamente?")) { await supabase.from('piani').delete().eq('docente_id', d.id); await supabase.from('docenti').delete().eq('id', d.id); loadData(); }}} className="bg-red-50 text-red-500 p-4 rounded-2xl border border-red-100 hover:bg-red-500 hover:text-white transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'nuovo_doc' && (
        <div className="max-w-2xl mx-auto bg-white p-12 rounded-[3.5rem] shadow-2xl border animate-in zoom-in duration-300">
          <h2 className="text-3xl font-black mb-10 text-center uppercase italic text-emerald-600 tracking-tighter">Nuova Registrazione</h2>
          <div className="space-y-6">
            <input type="text" placeholder="NOME E COGNOME" className="w-full p-6 bg-slate-50 rounded-3xl font-bold uppercase border-4 border-transparent focus:border-emerald-500 outline-none shadow-inner" value={fNome} onChange={e => setFNome(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
               <select className="p-6 bg-slate-50 rounded-3xl font-bold border-4 border-transparent focus:border-emerald-500 outline-none" value={fContr} onChange={e => setFContr(e.target.value)}>
                 <option value="INTERA">INTERA (18H)</option>
                 <option value="COMPLETAMENTO">COMPLETAMENTO</option>
                 <option value="SPEZZONE">SPEZZONE</option>
               </select>
               <input type="number" placeholder="ORE SETT." className="p-6 bg-slate-50 rounded-3xl font-bold border-4 border-transparent focus:border-emerald-500 outline-none text-center" value={fOre} onChange={e => setFOre(Number(e.target.value))} />
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl">
              <label className="text-[10px] font-black uppercase text-slate-400 mb-4 block">Mesi di servizio attesi (su 9 totali)</label>
              <input type="range" min="1" max="9" step="1" className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600" value={fMesi} onChange={e => setFMesi(Number(e.target.value))} />
              <p className="text-center font-black text-2xl text-emerald-600 mt-4 tracking-tighter">{fMesi} MESI</p>
            </div>
            <button onClick={addDocente} className="w-full bg-emerald-600 text-white p-7 rounded-[2.5rem] font-black text-2xl uppercase shadow-xl hover:bg-slate-900 transition-all">Salva Docente</button>
          </div>
        </div>
      )}
      {/* GESTIONE IMPEGNI (ADMIN) */}
      {tab === 'impegni' && (
        <div className="max-w-2xl mx-auto bg-white p-12 rounded-[3.5rem] shadow-2xl border animate-in zoom-in duration-300">
          <h2 className="text-3xl font-black mb-10 text-center uppercase italic text-orange-600 tracking-tighter">Nuova Attività Collegiale</h2>
          <div className="space-y-6">
            <input id="titImp" type="text" placeholder="TITOLO ATTIVITÀ (es. Collegio n.1)" className="w-full p-6 bg-slate-50 rounded-3xl font-bold uppercase border-4 border-transparent focus:border-orange-500 outline-none shadow-inner" />
            <div className="grid grid-cols-2 gap-4">
              <input id="datImp" type="date" className="p-6 bg-slate-50 rounded-3xl font-bold border-4 border-transparent focus:border-orange-500 outline-none" />
              <input id="durImp" type="number" step="0.5" placeholder="ORE MAX" className="p-6 bg-slate-50 rounded-3xl font-bold border-4 border-transparent focus:border-orange-500 outline-none text-center" />
            </div>
            <div className="flex gap-4 p-2 bg-slate-100 rounded-[2rem]">
              <button onClick={() => (window as any).tmpTipo = 'A'} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase transition-all bg-white text-slate-400 focus:bg-blue-600 focus:text-white shadow-sm">Comma A (40h)</button>
              <button onClick={() => (window as any).tmpTipo = 'B'} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase transition-all bg-white text-slate-400 focus:bg-indigo-600 focus:text-white shadow-sm">Comma B (40h)</button>
            </div>
            <button onClick={async () => {
              const t = (document.getElementById('titImp') as HTMLInputElement).value;
              const d = (document.getElementById('datImp') as HTMLInputElement).value;
              const h = (document.getElementById('durImp') as HTMLInputElement).value;
              const tip = (window as any).tmpTipo || 'A';
              if(!t || !d || !h) return alert("Compila tutti i campi obbligatori");
              await supabase.from('impegni').insert([{ titolo: t, data: d, durata_max: Number(h), tipo: tip }]);
              alert("ATTIVITÀ PUBBLICATA"); loadData(); setTab('docenti');
            }} className="w-full bg-orange-600 text-white p-7 rounded-[2.5rem] font-black text-2xl uppercase shadow-xl hover:bg-slate-900 transition-all">Pubblica Impegno</button>
          </div>
        </div>
      )}

      {/* REGISTRO APPELLO (ADMIN) */}
      {tab === 'appello' && (
        <div className="grid lg:grid-cols-2 gap-10 animate-in fade-in duration-500">
          <div className="space-y-4">
            <h3 className="text-[11px] font-black uppercase text-slate-400 ml-4 mb-4 tracking-[0.2em]">Elenco Impegni</h3>
            {impegni.map(i => (
              <div 
                key={i.id} 
                onClick={() => setActiveImpId(i.id)} 
                className={`bg-white p-6 rounded-[2.5rem] border-4 cursor-pointer transition-all flex justify-between items-center group ${activeImpId === i.id ? 'border-indigo-600 shadow-xl scale-[1.02]' : 'border-transparent shadow-sm'}`}
              >
                <div>
                  <span className={`text-[8px] font-black px-2 py-1 rounded mb-2 inline-block ${i.tipo === 'A' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>COMMA {i.tipo}</span>
                  <h4 className="font-black uppercase text-sm tracking-tight">{i.titolo}</h4>
                  <p className="text-[10px] font-bold text-slate-400">{i.data} • {i.durata_max}h max</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); if(confirm("Eliminare l'impegno e i relativi dati dei docenti?")) { supabase.from('piani').delete().eq('impegno_id', i.id).then(() => { supabase.from('impegni').delete().eq('id', i.id).then(loadData); }); } }} className="text-red-200 hover:text-red-600 p-2 opacity-0 group-hover:opacity-100 transition-opacity"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M4 8V4h12v4h2v2h-2v10H4V10H2V8h2zm2 2v8h8v-8H6zm2-4h4V4H8v2z"/></svg></button>
              </div>
            ))}
          </div>
          <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border min-h-[500px] sticky top-32">
            <h3 className="text-2xl font-black mb-8 uppercase text-indigo-600 italic tracking-tighter underline decoration-4 decoration-indigo-100 underline-offset-8">Validazione Ore</h3>
            <div className="space-y-3">
              {piani.filter(p => p.impegno_id === activeImpId).map(p => {
                const doc = docenti.find(d => d.id === p.docente_id);
                return (
                  <div key={p.id} className="flex justify-between items-center p-5 bg-slate-50 rounded-3xl border-2 hover:border-slate-200 transition-colors">
                    <div>
                      <p className="font-black uppercase text-xs text-slate-700">{doc?.nome}</p>
                      <p className="text-[10px] font-bold text-slate-400">DICHIARATE: <span className="text-slate-900">{p.ore_effettive}h</span></p>
                    </div>
                    <button 
                      onClick={async () => { await supabase.from('piani').update({ presente: !p.presente }).eq('id', p.id); loadData(); }}
                      className={`px-6 py-3 rounded-2xl font-black text-[9px] uppercase shadow-md transition-all ${p.presente ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-white text-slate-300 border'}`}
                    >
                      {p.presente ? 'VALIDATO ✓' : 'NON VALIDATO'}
                    </button>
                  </div>
                );
              })}
              {(!activeImpId || piani.filter(p => p.impegno_id === activeImpId).length === 0) && (
                <div className="text-center py-20">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200"><svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg></div>
                  <p className="text-slate-300 font-black uppercase italic text-sm tracking-widest">Seleziona un impegno a sinistra</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BACHECA DOCUMENTI (ADMIN/DOCENTE) */}
      {tab === 'documenti' && (
        <div className="bg-white p-12 rounded-[4rem] shadow-2xl border animate-in zoom-in duration-500">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black uppercase italic text-blue-700 tracking-tighter">Bacheca Digitale</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-2">Condivisione Documentazione e Circolari</p>
          </div>
          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-1 bg-slate-50 p-10 rounded-[3.5rem] border-4 border-dashed border-slate-200 text-center flex flex-col justify-center items-center">
              <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white mb-6 shadow-xl shadow-blue-100"><svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg></div>
              <p className="font-black uppercase text-[10px] text-slate-400 mb-6">Trascina i file PDF o Immagini</p>
              <input type="file" className="text-xs font-bold text-slate-400" />
              <button className="mt-8 w-full bg-slate-900 text-white p-6 rounded-3xl font-black text-xs uppercase shadow-xl hover:bg-blue-600 transition-all">Carica File</button>
            </div>
            <div className="lg:col-span-2 space-y-4">
               <h3 className="text-xs font-black uppercase text-slate-300 ml-4 mb-4 tracking-widest">Archivio Pubblico</h3>
               <div className="p-6 bg-white border-2 rounded-[2.5rem] flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center font-black text-[10px]">PDF</div>
                    <div>
                      <p className="font-black text-sm uppercase text-slate-800">Piano_Attivita_2025_26.pdf</p>
                      <p className="text-[9px] font-bold text-slate-400">1.2 MB • CARICATO OGGI</p>
                    </div>
                  </div>
                  <button className="bg-blue-50 text-blue-600 px-6 py-3 rounded-2xl font-black text-[9px] uppercase hover:bg-blue-600 hover:text-white transition-all">Download</button>
               </div>
               <div className="p-6 bg-white border-2 rounded-[2.5rem] flex justify-between items-center shadow-sm opacity-50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center font-black text-[10px]">DOC</div>
                    <div>
                      <p className="font-black text-sm uppercase text-slate-400 italic">Nessun altro file caricato</p>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* VISTA DETTAGLIO DOCENTE (ADMIN MODE) */}
      {selectedDoc && (
        <div className="mt-10 border-t-8 border-slate-900 pt-16 animate-in slide-in-from-bottom duration-700">
           <div className="flex items-center justify-between mb-10 bg-blue-600 p-8 rounded-[3rem] text-white shadow-2xl">
              <div>
                <p className="text-[10px] font-black uppercase opacity-60">Stai gestendo il profilo di:</p>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter">{selectedDoc.nome}</h2>
              </div>
              <button onClick={() => setSelectedDoc(null)} className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-slate-900 hover:text-white transition-all">Chiudi Sessione</button>
           </div>
           <DocenteModule docente={selectedDoc} adminMode={true} />
        </div>
      )}
    </main>
  );
}

/* --- MODULO DOCENTE (COMPONENT) --- */
function DocenteModule({ docente, adminMode = false }: any) {
  const [impegni, setImpegni] = useState<any[]>([]);
  const [piani, setPiani] = useState<any[]>([]);
  const [view, setView] = useState('pianifica');

  const fetchD = useCallback(async () => {
    const { data: i } = await supabase.from('impegni').select('*').order('data', { ascending: false });
    const { data: p } = await supabase.from('piani').select('*').eq('docente_id', docente.id);
    setImpegni(i || []); setPiani(p || []);
  }, [docente.id]);

  useEffect(() => { fetchD(); }, [fetchD]);

  const oA = piani.filter(p => p.tipo === 'A').reduce((s, c) => s + Number(c.ore_effettive), 0);
  const oB = piani.filter(p => p.tipo === 'B').reduce((s, c) => s + Number(c.ore_effettive), 0);

  return (
    <div className="max-w-6xl mx-auto p-2">
      {!adminMode && (
        <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border-b-[12px] border-blue-600 mb-10 flex flex-col md:flex-row justify-between items-center gap-8 animate-in fade-in duration-500">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-blue-700 rounded-[2rem] flex items-center justify-center text-white font-black text-3xl italic shadow-xl">{docente.nome[0]}</div>
            <div>
              <h2 className="text-4xl font-black uppercase italic tracking-tighter">{docente.nome}</h2>
              <div className="flex gap-2 mt-2">
                <span className="bg-slate-100 text-slate-400 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">{docente.contratto}</span>
                <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest italic">Anzianità: {docente.mesi_servizio} mesi</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button onClick={() => setView('pianifica')} className={`flex-1 md:flex-none px-10 py-5 rounded-3xl font-black text-[10px] uppercase shadow-lg transition-all ${view === 'pianifica' ? 'bg-blue-600 text-white scale-105' : 'bg-white border text-slate-400'}`}>Pianificazione</button>
            <button onClick={() => setView('report')} className={`flex-1 md:flex-none px-10 py-5 rounded-3xl font-black text-[10px] uppercase shadow-lg transition-all ${view === 'report' ? 'bg-slate-900 text-white scale-105' : 'bg-white border text-slate-400'}`}>Report PDF</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <DocStat label="Dovute Comma A" val={`${docente.ore_a_dovute}h`} />
        <DocStat label="Pianificate A" val={`${oA}h`} col="text-blue-600" sub={`${docente.ore_a_dovute - oA}h mancanti`} />
        <DocStat label="Dovute Comma B" val={`${docente.ore_b_dovute}h`} />
        <DocStat label="Pianificate B" val={`${oB}h`} col="text-indigo-600" sub={`${docente.ore_b_dovute - oB}h mancanti`} />
      </div>

      {view === 'pianifica' && (
        <div className="space-y-4 animate-in slide-in-from-bottom-10 duration-700">
          {impegni.map(imp => {
            const p = piani.find(x => x.impegno_id === imp.id);
            return (
              <div key={imp.id} className={`bg-white p-8 rounded-[3rem] border-2 flex flex-col md:flex-row justify-between items-center gap-6 transition-all ${p ? 'border-blue-500 bg-blue-50/10 shadow-lg' : 'border-transparent shadow-sm hover:shadow-md'}`}>
                <div className="flex-1">
                  <div className="flex gap-2 mb-3">
                    <span className={`text-[8px] font-black px-3 py-1 rounded-full uppercase ${imp.tipo === 'A' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>COMMA {imp.tipo}</span>
                    {p?.presente && <span className="text-[8px] font-black bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full uppercase italic tracking-tighter">Validato dall'Ufficio ✓</span>}
                  </div>
                  <h4 className="text-2xl font-black uppercase text-slate-800 tracking-tighter leading-tight">{imp.titolo}</h4>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">{new Date(imp.data).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-[9px] font-black text-slate-300 uppercase mb-2 tracking-widest">Ore Effettive</p>
                    <input 
                      id={`orev-${imp.id}`} type="number" step="0.5" 
                      defaultValue={p ? p.ore_effettive : imp.durata_max}
                      disabled={p?.presente && !adminMode}
                      className="w-20 p-4 rounded-2xl bg-slate-100 font-black text-center text-2xl outline-none focus:ring-4 ring-blue-100 border-none transition-all" 
                    />
                  </div>
                  <button 
                    onClick={async () => {
                      const hVal = (document.getElementById(`orev-${imp.id}`) as HTMLInputElement).value;
                      if(p) {
                        if(p.presente && !adminMode) return alert("Attività già validata. Contatta l'ufficio per modifiche.");
                        await supabase.from('piani').delete().eq('id', p.id);
                      } else {
                        await supabase.from('piani').insert([{ docente_id: docente.id, impegno_id: imp.id, ore_effettive: Number(hVal), tipo: imp.tipo, presente: false }]);
                      }
                      fetchD();
                    }}
                    className={`px-12 py-5 rounded-[2rem] font-black text-[11px] uppercase shadow-xl transition-all active:scale-95 ${p ? 'bg-red-500 text-white' : 'bg-slate-900 text-white hover:bg-blue-700'}`}
                  >
                    {p ? 'Elimina Piano' : 'Aggiungi al Piano'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'report' && (
        <div className="bg-white p-16 lg:p-24 rounded-[4rem] shadow-2xl border print:border-none print:shadow-none print:p-0 animate-in zoom-in duration-500">
          <div className="border-b-[12px] border-slate-900 pb-12 mb-12 flex flex-col md:flex-row justify-between items-end gap-10">
            <div>
              <h1 className="text-6xl font-black uppercase italic tracking-tighter leading-none">Piano<br/>Attività</h1>
              <p className="text-2xl font-bold text-slate-400 mt-6 uppercase tracking-widest">Docente: <span className="text-slate-900 border-b-4 border-blue-600">{docente.nome}</span></p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-black uppercase text-slate-300 tracking-[0.4em] mb-2 text-center md:text-right">Anno Scolastico</p>
              <p className="text-3xl font-black italic text-slate-900">2025 / 2026</p>
              <div className="mt-4 flex gap-4 justify-end">
                <div className="bg-slate-50 p-4 rounded-2xl border text-center min-w-[100px]"><p className="text-[8px] font-black text-slate-400 uppercase">Tot A</p><p className="text-xl font-black">{oA}h</p></div>
                <div className="bg-slate-50 p-4 rounded-2xl border text-center min-w-[100px]"><p className="text-[8px] font-black text-slate-400 uppercase">Tot B</p><p className="text-xl font-black">{oB}h</p></div>
              </div>
            </div>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] font-black uppercase text-slate-300 border-b-4 border-slate-50">
                <th className="py-8">Descrizione Attività Collegiale</th>
                <th className="py-8 text-center">Data</th>
                <th className="py-8 text-center">Comma</th>
                <th className="py-8 text-right">Ore</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-50">
              {piani.map(p => {
                const i = impegni.find(x => x.id === p.impegno_id);
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-8 font-black uppercase text-sm tracking-tight italic">{i?.titolo}</td>
                    <td className="py-8 text-center font-mono text-xs text-slate-400">{i?.data}</td>
                    <td className="py-8 text-center font-black text-xs uppercase text-slate-500">40 ORE ({p.tipo})</td>
                    <td className="py-8 text-right font-black text-2xl italic tracking-tighter">{p.ore_effettive}H</td>
                  </tr>
                );
              })}
              <tr className="bg-slate-900 text-white shadow-2xl">
                <td colSpan={3} className="p-12 font-black uppercase text-lg italic tracking-[0.3em]">Totale Ore Complessivo</td>
                <td className="p-12 text-right font-black text-6xl italic tracking-tighter text-blue-400">{(oA + oB).toFixed(1)}H</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-32 hidden print:grid grid-cols-2 gap-40 px-10 text-center">
            <div><div className="border-t-4 border-slate-900 pt-4 font-black uppercase text-xs tracking-widest">Firma del Docente</div></div>
            <div><div className="border-t-4 border-slate-900 pt-4 font-black uppercase text-xs tracking-widest">Il Dirigente Scolastico</div></div>
          </div>
          <button onClick={() => window.print()} className="w-full mt-16 bg-blue-600 text-white p-8 rounded-[2.5rem] font-black text-2xl uppercase shadow-2xl shadow-blue-200 print:hidden transition-all hover:bg-slate-900 hover:scale-[1.01] active:scale-95">Salva come PDF / Stampa</button>
        </div>
      )}
    </div>
  );
}

// HELPERS UI
function AdminCounter({ label, dov, p, v, color }: any) {
  const c = color === 'blue' ? 'text-blue-600' : 'text-indigo-600';
  const bg = color === 'blue' ? 'bg-blue-50/50' : 'bg-indigo-50/50';
  return (
    <div className={`${bg} p-6 rounded-[2.5rem] border border-slate-100 flex gap-8 text-center min-w-[280px] shadow-inner`}>
      <div className="flex-1 border-r border-slate-200/50"><p className="text-[8px] font-black text-slate-300 uppercase mb-2">Dovute</p><p className="text-2xl font-black text-slate-400 italic">{dov}h</p></div>
      <div className="flex-1 border-r border-slate-200/50"><p className="text-[8px] font-black text-orange-400 uppercase mb-2">Pianificate</p><p className="text-2xl font-black text-orange-500 italic">{p}h</p></div>
      <div className="flex-1"><p className={`text-[8px] font-black uppercase mb-2 ${c}`}>Validate</p><p className={`text-2xl font-black italic ${c}`}>{v}h</p></div>
    </div>
  );
}

function DocStat({ label, val, col = "text-slate-800", sub = "contrattuali" }: any) {
  return (
    <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 text-center hover:shadow-xl hover:border-blue-100 transition-all">
      <p className="text-[9px] font-black uppercase text-slate-300 mb-2 tracking-[0.2em]">{label}</p>
      <p className={`text-4xl font-black italic tracking-tighter ${col}`}>{val}</p>
      <p className="text-[9px] font-bold text-slate-200 uppercase mt-2">{sub}</p>
    </div>
  );
}
