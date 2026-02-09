"use client";
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function GestionaleScuolaDefinitivo() {
  const [user, setUser] = useState<any>(null);
  const [loginCode, setLoginCode] = useState('');
  const [refresh, setRefresh] = useState(0);

  const handleLogin = async () => {
    const code = loginCode.trim().toUpperCase();
    if (code === 'ADMIN123') {
      setUser({ id: 'admin', nome: 'Amministratore', role: 'admin' });
      return;
    }
    const { data } = await supabase.from('docenti').select('*').eq('codice_accesso', code).single();
    if (data) setUser(data);
    else alert("Codice non trovato.");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl w-full max-w-md">
          <h1 className="text-4xl font-black mb-8 text-center italic tracking-tighter text-blue-600 uppercase">School Control</h1>
          <input type="text" placeholder="CODICE ACCESSO" className="w-full p-6 border-4 border-slate-100 rounded-3xl mb-4 text-center text-2xl font-mono uppercase focus:border-blue-500 outline-none transition-all" 
            value={loginCode} onChange={(e) => setLoginCode(e.target.value)} />
          <button onClick={handleLogin} className="w-full bg-blue-600 text-white p-6 rounded-3xl font-black text-xl hover:bg-blue-700 transition-all uppercase">Accedi</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b p-6 flex justify-between items-center sticky top-0 z-[100] shadow-sm">
        <div className="font-black text-xl uppercase italic tracking-tighter text-blue-600">Sistema Gestione 80 Ore</div>
        <button onClick={() => {setUser(null); setLoginCode('');}} className="bg-slate-100 px-6 py-2 rounded-xl font-black text-[10px] uppercase hover:bg-red-500 hover:text-white transition-all">Logout</button>
      </header>
      {user.role === 'admin' ? <AdminDashboard /> : <DocentePanel docenteId={user.id} docenteNome={user.nome} infoDocente={user} />}
    </div>
  );
}

/* --- DASHBOARD AMMINISTRATORE (LOGICA COMPLESSA) --- */
function AdminDashboard() {
  const [tab, setTab] = useState('riepilogo');
  const [docenti, setDocenti] = useState<any[]>([]);
  const [impegni, setImpegni] = useState<any[]>([]);
  const [piani, setPiani] = useState<any[]>([]);
  const [selectedDocente, setSelectedDocente] = useState<any>(null);
  const [selectedImpegno, setSelectedImpegno] = useState<any>(null);

  // Form Stati
  const [fNome, setFNome] = useState('');
  const [fContratto, setFContratto] = useState('INTERA');
  const [fOre, setFOre] = useState(18);
  const [fMesi, setFMesi] = useState(9);

  const caricaDati = useCallback(async () => {
    const { data: d } = await supabase.from('docenti').select('*').order('nome');
    const { data: i } = await supabase.from('impegni').select('*').order('data', { ascending: false });
    const { data: p } = await supabase.from('piani').select('*');
    setDocenti(d || []); setImpegni(i || []); setPiani(p || []);
  }, []);

  useEffect(() => { caricaDati(); }, [caricaDati]);

  const salvaNuovoDocente = async () => {
    if(!fNome) return alert("Nome mancante");
    const codice = Math.random().toString(36).substring(2, 7).toUpperCase();
    
    // CALCOLO PROPORZIONALE RIGOROSO
    let base = 80;
    if (fContratto !== 'INTERA') base = (80 / 18) * fOre;
    const finale = base * (fMesi / 9);
    
    const aDovute = Math.floor(finale / 2);
    const bDovute = Math.ceil(finale / 2);

    const { error } = await supabase.from('docenti').insert([{
      nome: fNome, codice_accesso: codice, ore_a_dovute: aDovute, ore_b_dovute: bDovute,
      contratto: fContratto, ore_settimanali: fOre, mesi_servizio: fMesi
    }]);

    if (!error) {
      alert(`Creato! Codice: ${codice}`);
      setFNome(''); setTab('riepilogo'); caricaDati();
    } else {
      alert("Errore DB: " + error.message);
    }
  };

  const eliminaImpegno = async (id: string) => {
    if(confirm("Eliminando l'impegno cancellerai anche tutte le pianificazioni dei docenti. Continuare?")) {
      await supabase.from('piani').delete().eq('impegno_id', id);
      await supabase.from('impegni').delete().eq('id', id);
      caricaDati();
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <nav className="flex gap-2 mb-8 bg-white p-2 rounded-3xl shadow-sm border w-fit font-black text-[10px] uppercase">
        <button onClick={() => {setTab('riepilogo'); setSelectedDocente(null)}} className={`px-6 py-3 rounded-2xl ${tab === 'riepilogo' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>Riepilogo Docenti</button>
        <button onClick={() => setTab('appello')} className={`px-6 py-3 rounded-2xl ${tab === 'appello' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Registro Appello</button>
        <button onClick={() => setTab('nuovo_docente')} className={`px-6 py-3 rounded-2xl ${tab === 'nuovo_docente' ? 'bg-green-600 text-white' : 'text-slate-400'}`}>+ Docente</button>
        <button onClick={() => setTab('nuovo_impegno')} className={`px-6 py-3 rounded-2xl ${tab === 'nuovo_impegno' ? 'bg-orange-600 text-white' : 'text-slate-400'}`}>+ Impegno</button>
      </nav>

      {tab === 'riepilogo' && !selectedDocente && (
        <div className="bg-white rounded-[2.5rem] shadow-xl border overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400 tracking-widest">
              <tr>
                <th className="p-6">Docente / Info</th>
                <th className="p-6 text-center">Codice</th>
                <th className="p-6 text-center bg-blue-50/50">Comma A (Dov/Pian/Real)</th>
                <th className="p-6 text-center bg-indigo-50/50">Comma B (Dov/Pian/Real)</th>
                <th className="p-6 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docenti.map(d => {
                const pD = piani.filter(p => p.docente_id === d.id);
                // Calcolo Pianificate (Dichiarate dal docente)
                const aP = pD.filter(p => p.tipo === 'A').reduce((s, c) => s + Number(c.ore_effettive), 0);
                const bP = pD.filter(p => p.tipo === 'B').reduce((s, c) => s + Number(c.ore_effettive), 0);
                // Calcolo Realizzate (Validate con Appello)
                const aR = pD.filter(p => p.tipo === 'A' && p.presente).reduce((s, c) => s + Number(c.ore_effettive), 0);
                const bR = pD.filter(p => p.tipo === 'B' && p.presente).reduce((s, c) => s + Number(c.ore_effettive), 0);
                
                return (
                  <tr key={d.id} className="hover:bg-slate-50 transition-all">
                    <td className="p-6">
                      <p className="font-black text-slate-800 uppercase text-sm">{d.nome}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{d.contratto} • {d.ore_settimanali}H • {d.mesi_servizio} MESI</p>
                    </td>
                    <td className="p-6 text-center font-mono font-bold text-blue-600">{d.codice_accesso}</td>
                    <td className="p-6 text-center text-xs font-black">
                      <span className="text-slate-300">{d.ore_a_dovute}</span> / <span className="text-orange-500">{aP}</span> / <span className="text-blue-600">{aR}</span>
                    </td>
                    <td className="p-6 text-center text-xs font-black">
                      <span className="text-slate-300">{d.ore_b_dovute}</span> / <span className="text-orange-500">{bP}</span> / <span className="text-indigo-600">{bR}</span>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setSelectedDocente(d)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase">Gestisci</button>
                        <button onClick={async () => {
                          if(confirm("Eliminare?")) {
                            await supabase.from('piani').delete().eq('docente_id', d.id);
                            await supabase.from('docenti').delete().eq('id', d.id);
                            caricaDati();
                          }
                        }} className="text-red-400 hover:text-red-700 p-2"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M6 2l2-2h4l2 2h4v2H2V2h4zM3 6h14l-1 14H4L3 6zm5 2v10h1V8H8zm3 0v10h1V8h-1z"/></svg></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedDocente && (
        <div>
          <button onClick={() => setSelectedDocente(null)} className="mb-6 font-black text-xs text-slate-400 uppercase">← Torna alla lista</button>
          <DocentePanel docenteId={selectedDocente.id} docenteNome={selectedDocente.nome} infoDocente={selectedDocente} adminMode={true} />
        </div>
      )}

      {tab === 'nuovo_docente' && (
        <div className="max-w-xl mx-auto bg-white p-12 rounded-[3.5rem] shadow-2xl border">
          <h2 className="text-3xl font-black mb-10 text-center uppercase italic text-green-600">Inserimento Docente</h2>
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-2 block">Nominativo</label>
              <input type="text" placeholder="MARIO ROSSI" className="w-full p-6 bg-slate-50 rounded-3xl font-bold uppercase border-2 focus:border-green-600 outline-none" onChange={e => setFNome(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-2 block">Contratto</label>
              <select className="w-full p-6 bg-slate-50 rounded-3xl font-bold border-2 outline-none" value={fContratto} onChange={e => setFContratto(e.target.value)}>
                <option value="INTERA">Cattedra Intera (18h)</option>
                <option value="COMPLETAMENTO">Completamento (Poche ore in questa scuola)</option>
                <option value="SPEZZONE">Spezzone Orario</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-2 block">Ore Settimanali</label>
                 <input type="number" step="0.5" className="w-full p-6 bg-slate-50 rounded-3xl font-bold border-2" value={fOre} onChange={e => setFOre(Number(e.target.value))} />
               </div>
               <div>
                 <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-2 block">Mesi Servizio</label>
                 <input type="number" className="w-full p-6 bg-slate-50 rounded-3xl font-bold border-2" value={fMesi} onChange={e => setFMesi(Number(e.target.value))} />
               </div>
            </div>
            <button onClick={salvaNuovoDocente} className="w-full bg-green-600 text-white p-6 rounded-3xl font-black text-xl uppercase shadow-xl hover:bg-slate-900 transition-all">Registra Docente</button>
          </div>
        </div>
      )}

      {tab === 'nuovo_impegno' && (
        <div className="max-w-xl mx-auto bg-white p-12 rounded-[3.5rem] shadow-2xl border">
          <h2 className="text-3xl font-black mb-10 text-center uppercase italic text-orange-600">Nuovo Evento Collegiale</h2>
          <div className="space-y-6">
            <input id="iTit" type="text" placeholder="TITOLO RIUNIONE" className="w-full p-6 bg-slate-50 rounded-3xl font-bold uppercase border-2" />
            <div className="grid grid-cols-2 gap-4">
              <input id="iDat" type="date" className="p-6 bg-slate-50 rounded-3xl font-bold border-2" />
              <input id="iDur" type="number" step="0.5" placeholder="DURATA ORE" className="p-6 bg-slate-50 rounded-3xl font-bold border-2 text-center" />
            </div>
            <div className="flex gap-4">
               <button id="bA" onClick={() => (window as any).tmpTipo = 'A'} className="flex-1 bg-blue-100 text-blue-600 p-5 rounded-2xl font-black text-[10px] uppercase focus:bg-blue-600 focus:text-white transition-all">Comma A (40h)</button>
               <button id="bB" onClick={() => (window as any).tmpTipo = 'B'} className="flex-1 bg-indigo-100 text-indigo-600 p-5 rounded-2xl font-black text-[10px] uppercase focus:bg-indigo-600 focus:text-white transition-all">Comma B (40h)</button>
            </div>
            <button onClick={async () => {
              const t = (document.getElementById('iTit') as HTMLInputElement).value;
              const d = (document.getElementById('iDat') as HTMLInputElement).value;
              const h = (document.getElementById('iDur') as HTMLInputElement).value;
              const tip = (window as any).tmpTipo || 'A';
              await supabase.from('impegni').insert([{ titolo: t, data: d, durata_max: Number(h), tipo: tip }]);
              alert("Evento creato!"); caricaDati(); setTab('riepilogo');
            }} className="w-full bg-slate-900 text-white p-6 rounded-3xl font-black text-xl uppercase shadow-xl">Pubblica Calendario</button>
          </div>
        </div>
      )}

      {tab === 'appello' && (
        <div className="grid md:grid-cols-2 gap-10">
          <div className="space-y-4">
            {impegni.map(i => (
              <div key={i.id} onClick={() => setSelectedImpegno(i)} className={`bg-white p-8 rounded-[2.5rem] border-4 cursor-pointer transition-all ${selectedImpegno?.id === i.id ? 'border-blue-600 shadow-xl' : 'border-transparent shadow-sm'}`}>
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${i.tipo === 'A' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>Comma {i.tipo}</span>
                  <button onClick={(e) => {e.stopPropagation(); eliminaImpegno(i.id);}} className="text-red-300 hover:text-red-600"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M4 8V4h12v4h2v2h-2v10H4V10H2V8h2zm2 2v8h8v-8H6zm2-4h4V4H8v2z"/></svg></button>
                </div>
                <h3 className="text-2xl font-black uppercase mt-4">{i.titolo}</h3>
                <p className="text-slate-400 font-bold uppercase text-[10px] mt-2">{i.data} • {i.durata_max} ORE PREVISTE</p>
              </div>
            ))}
          </div>
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl border h-fit sticky top-32">
            {selectedImpegno ? (
              <div>
                <h2 className="text-xl font-black mb-6 uppercase text-blue-600 border-b pb-4">Appello: {selectedImpegno.titolo}</h2>
                <div className="space-y-2">
                  {piani.filter(p => p.impegno_id === selectedImpegno.id).map(p => {
                    const doc = docenti.find(d => d.id === p.docente_id);
                    return (
                      <div key={p.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border">
                        <span className="font-black text-xs uppercase text-slate-700">{doc?.nome}</span>
                        <button onClick={async () => {
                          await supabase.from('piani').update({ presente: !p.presente }).eq('id', p.id);
                          caricaDati();
                        }} className={`px-6 py-2 rounded-xl font-black text-[9px] uppercase transition-all shadow-sm ${p.presente ? 'bg-green-600 text-white' : 'bg-white text-slate-300 border'}`}>
                          {p.presente ? 'Presente ✓' : 'Assente'}
                        </button>
                      </div>
                    );
                  })}
                  {piani.filter(p => p.impegno_id === selectedImpegno.id).length === 0 && (
                    <p className="text-center py-10 text-slate-300 font-bold uppercase text-xs">Nessun docente ha pianificato questo impegno</p>
                  )}
                </div>
              </div>
            ) : <p className="text-center py-20 text-slate-200 font-black uppercase italic">Seleziona un impegno per gestire l'appello</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/* --- PANNELLO DOCENTE (INTEGRALE) --- */
function DocentePanel({ docenteId, docenteNome, infoDocente, adminMode = false }: any) {
  const [impegni, setImpegni] = useState<any[]>([]);
  const [piani, setPiani] = useState<any[]>([]);
  const [view, setView] = useState('pianifica');

  const fetchDoc = useCallback(async () => {
    const { data: i } = await supabase.from('impegni').select('*').order('data', { ascending: false });
    const { data: p } = await supabase.from('piani').select('*').eq('docente_id', docenteId);
    setImpegni(i || []); setPiani(p || []);
  }, [docenteId]);

  useEffect(() => { fetchDoc(); }, [fetchDoc]);

  const aP = piani.filter(p => p.tipo === 'A').reduce((s, c) => s + Number(c.ore_effettive), 0);
  const bP = piani.filter(p => p.tipo === 'B').reduce((s, c) => s + Number(c.ore_effettive), 0);

  return (
    <div className="max-w-5xl mx-auto p-6">
      {!adminMode && (
        <nav className="flex gap-4 justify-center mb-10">
          <button onClick={() => setView('pianifica')} className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-md ${view === 'pianifica' ? 'bg-blue-600 text-white' : 'bg-white text-slate-400'}`}>Pianificazione</button>
          <button onClick={() => setView('stampa')} className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-md ${view === 'stampa' ? 'bg-slate-900 text-white' : 'bg-white text-slate-400'}`}>Riepilogo PDF</button>
        </nav>
      )}

      <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border-4 border-white mb-10 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
        <h1 className="text-5xl font-black uppercase italic text-slate-800 tracking-tighter">{docenteNome}</h1>
        <div className="flex justify-center gap-6 mt-8">
           <div className="bg-blue-50 px-6 py-4 rounded-3xl border border-blue-100">
             <p className="text-[9px] font-black text-blue-500 uppercase">Comma A (Dovute {infoDocente.ore_a_dovute}h)</p>
             <p className="text-3xl font-black text-blue-700">{aP}h</p>
           </div>
           <div className="bg-indigo-50 px-6 py-4 rounded-3xl border border-indigo-100">
             <p className="text-[9px] font-black text-indigo-500 uppercase">Comma B (Dovute {infoDocente.ore_b_dovute}h)</p>
             <p className="text-3xl font-black text-indigo-700">{bP}h</p>
           </div>
        </div>
      </div>

      {view === 'pianifica' && (
        <div className="space-y-4">
          {impegni.map(i => {
            const piano = piani.find(p => p.impegno_id === i.id);
            return (
              <div key={i.id} className={`bg-white p-8 rounded-[3rem] border-2 flex flex-col md:flex-row justify-between items-center gap-6 transition-all ${piano ? 'border-blue-400 bg-blue-50/20' : 'border-transparent shadow-sm'}`}>
                <div className="flex-1">
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${i.tipo === 'A' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>Comma {i.tipo}</span>
                  <h3 className="text-2xl font-black text-slate-800 mt-2 uppercase">{i.titolo}</h3>
                  <p className="text-slate-400 font-bold uppercase text-[10px] mt-1">{i.data} • {i.durata_max} ORE PREVISTE</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <label className="text-[9px] font-black text-slate-300 block mb-1 uppercase">Ore Effettive</label>
                    <input id={`ore-${i.id}`} type="number" step="0.5" defaultValue={piano ? piano.ore_effettive : i.durata_max} className="w-20 p-4 rounded-2xl bg-slate-100 font-black text-xl text-center outline-none" disabled={piano?.presente && !adminMode} />
                  </div>
                  <button onClick={async () => {
                    const val = (document.getElementById(`ore-${i.id}`) as HTMLInputElement).value;
                    if(piano) {
                      if(piano.presente && !adminMode) return alert("Attività già validata. Impossibile modificare.");
                      await supabase.from('piani').delete().eq('id', piano.id);
                    } else {
                      await supabase.from('piani').insert([{ docente_id: docenteId, impegno_id: i.id, ore_effettive: Number(val), tipo: i.tipo, presente: false }]);
                    }
                    fetchDoc();
                  }} className={`px-10 py-5 rounded-[2rem] font-black text-xs uppercase shadow-xl transition-all ${piano ? 'bg-red-500 text-white' : 'bg-slate-900 text-white'}`}>
                    {piano ? 'Rimuovi' : 'Pianifica'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'stampa' && (
        <div className="bg-white p-16 rounded-[4rem] shadow-2xl border" id="print-area">
          <div className="flex justify-between items-end mb-12 border-b-8 border-slate-900 pb-10">
            <div>
              <h1 className="text-5xl font-black uppercase italic tracking-tighter">Piano Attività</h1>
              <p className="text-xl font-bold text-slate-500 uppercase mt-2">Docente: {docenteNome}</p>
            </div>
            <button onClick={() => window.print()} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase print:hidden">Scarica PDF</button>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[12px] font-black uppercase text-slate-400 border-b-4 border-slate-100">
                <th className="py-6">Descrizione Impegno</th>
                <th className="py-6 text-center">Data</th>
                <th className="py-6 text-center">Tipo</th>
                <th className="py-6 text-right">Ore</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {piani.map(p => {
                const imp = impegni.find(i => i.id === p.impegno_id);
                return (
                  <tr key={p.id}>
                    <td className="py-6 font-black uppercase text-sm">{imp?.titolo}</td>
                    <td className="py-6 text-center font-mono text-xs">{imp?.data}</td>
                    <td className="py-6 text-center font-black text-[10px] uppercase">{p.tipo}</td>
                    <td className="py-6 text-right font-black text-xl">{p.ore_effettive}h</td>
                  </tr>
                );
              })}
              <tr className="bg-slate-900 text-white">
                <td colSpan={3} className="p-8 font-black uppercase text-sm tracking-widest">Totale Ore Dichiarate</td>
                <td className="p-8 text-right font-black text-4xl">{aP + bP}h</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-40 grid grid-cols-2 gap-20 invisible print:visible">
            <div className="border-t-4 border-slate-900 pt-4 text-center text-[10px] font-black uppercase">Firma del Docente</div>
            <div className="border-t-4 border-slate-900 pt-4 text-center text-[10px] font-black uppercase">Firma del Dirigente</div>
          </div>
        </div>
      )}
    </div>
  );
}
