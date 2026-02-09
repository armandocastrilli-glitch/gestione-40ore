"use client";
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// INIZIALIZZAZIONE SUPABASE
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function GestionaleScuolaCompleto() {
  const [user, setUser] = useState<any>(null);
  const [loginCode, setLoginCode] = useState('');
  const [refresh, setRefresh] = useState(0);

  const handleLogin = async () => {
    const code = loginCode.trim().toUpperCase();
    if (code === 'ADMIN123') {
      setUser({ id: 'admin', nome: 'Amministratore', role: 'admin' });
      return;
    }
    const { data, error } = await supabase.from('docenti').select('*').eq('codice_accesso', code).single();
    if (data) setUser(data);
    else alert("Codice errato o docente non censito.");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 text-slate-900 font-sans">
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl w-full max-w-md text-center border-4 border-white">
          <h1 className="text-4xl font-black mb-8 italic tracking-tighter uppercase text-blue-600">Scuola Control <span className="text-slate-300 font-light">Pro</span></h1>
          <input type="text" placeholder="CODICE ACCESSO" className="w-full p-6 border-2 rounded-3xl mb-4 text-center text-3xl uppercase font-mono shadow-inner outline-none focus:border-blue-600 transition-all" 
            value={loginCode} onChange={(e) => setLoginCode(e.target.value)} />
          <button onClick={handleLogin} className="w-full bg-blue-600 text-white p-6 rounded-3xl font-black text-xl hover:bg-blue-700 shadow-lg transition-all uppercase tracking-widest">Entra nel Sistema</button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-800 pb-20">
      <header className="bg-white/80 backdrop-blur-md border-b p-4 sticky top-0 z-[100] flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 text-white p-2 rounded-xl font-black text-xs uppercase italic">S-PRO</div>
          <span className="font-black uppercase text-xs tracking-widest">{user.nome} ({user.role === 'admin' ? 'Admin' : 'Docente'})</span>
        </div>
        <button onClick={() => {setUser(null); setLoginCode('');}} className="bg-slate-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all">Esci</button>
      </header>
      
      {user.role === 'admin' ? <AdminDashboard /> : <DocentePanel docenteId={user.id} docenteNome={user.nome} infoDocente={user} />}
    </div>
  );
}

/* --- DASHBOARD AMMINISTRATORE --- */
function AdminDashboard() {
  const [tab, setTab] = useState('riepilogo');
  const [docenti, setDocenti] = useState<any[]>([]);
  const [impegni, setImpegni] = useState<any[]>([]);
  const [piani, setPiani] = useState<any[]>([]);
  const [selectedDocente, setSelectedDocente] = useState<any>(null);

  // Stati Form Nuovo Docente
  const [fNome, setFNome] = useState('');
  const [fContratto, setFContratto] = useState('INTERA');
  const [fOreSett, setFOreSett] = useState(18);
  const [fMesi, setFMesi] = useState(9);

  // Stati Form Impegno
  const [fTitoloImp, setFTitoloImp] = useState('');
  const [fDataImp, setFDataImp] = useState('');
  const [fDurataImp, setFDurataImp] = useState(2);
  const [fTipoImp, setFTipoImp] = useState('A');

  const caricaTutto = useCallback(async () => {
    const { data: d } = await supabase.from('docenti').select('*').order('nome');
    const { data: i } = await supabase.from('impegni').select('*').order('data');
    const { data: p } = await supabase.from('piani').select('*');
    setDocenti(d || []); setImpegni(i || []); setPiani(p || []);
  }, []);

  useEffect(() => { caricaTutto(); }, [caricaTutto]);

  const aggiungiDocente = async () => {
    if(!fNome) return alert("Inserisci il nome!");
    const codice = Math.random().toString(36).substring(2, 7).toUpperCase();
    
    // Calcolo Logica 80 ore (40+40)
    let baseOre = 80;
    if (fContratto !== 'INTERA') {
      baseOre = (80 / 18) * fOreSett;
    }
    const proporzionaleMesi = baseOre * (fMesi / 9);
    const aDovute = Math.floor(proporzionaleMesi / 2);
    const bDovute = Math.ceil(proporzionaleMesi / 2);

    const { error } = await supabase.from('docenti').insert([{
      nome: fNome,
      codice_accesso: codice,
      ore_a_dovute: aDovute,
      ore_b_dovute: bDovute,
      contratto: fContratto,
      ore_settimanali: fOreSett,
      mesi_servizio: fMesi
    }]);

    if (!error) {
      alert(`Docente creato! CODICE: ${codice}`);
      setFNome(''); setTab('riepilogo'); caricaTutto();
    } else {
      alert("Errore salvataggio: " + error.message);
    }
  };

  const eliminaDocente = async (id: string) => {
    if(confirm("Vuoi davvero eliminare il docente e tutti i suoi dati?")) {
      await supabase.from('piani').delete().eq('docente_id', id);
      await supabase.from('docenti').delete().eq('id', id);
      caricaTutto();
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <nav className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-3xl shadow-sm border w-fit font-black text-[10px] uppercase">
        <button onClick={() => {setTab('riepilogo'); setSelectedDocente(null)}} className={`px-6 py-3 rounded-2xl ${tab === 'riepilogo' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>Riepilogo Docenti</button>
        <button onClick={() => setTab('nuovo_docente')} className={`px-6 py-3 rounded-2xl ${tab === 'nuovo_docente' ? 'bg-green-600 text-white' : 'text-slate-400'}`}>+ Registra Docente</button>
        <button onClick={() => setTab('nuovo_impegno')} className={`px-6 py-3 rounded-2xl ${tab === 'nuovo_impegno' ? 'bg-orange-600 text-white' : 'text-slate-400'}`}>+ Crea Impegno</button>
        <button onClick={() => setTab('appello')} className={`px-6 py-3 rounded-2xl ${tab === 'appello' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Appello & Presenze</button>
      </nav>

      {tab === 'riepilogo' && !selectedDocente && (
        <div className="bg-white rounded-[2.5rem] shadow-2xl border overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400 tracking-widest">
              <tr>
                <th className="p-6">Docente / Stato</th>
                <th className="p-6 text-center">Codice</th>
                <th className="p-6 text-center bg-blue-50/50">Comma A (Dov/Real)</th>
                <th className="p-6 text-center bg-indigo-50/50">Comma B (Dov/Real)</th>
                <th className="p-6 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docenti.map(d => {
                const pD = piani.filter(p => p.docente_id === d.id);
                const aR = pD.filter(p => p.tipo === 'A' && p.presente).reduce((s, c) => s + Number(c.ore_effettive), 0);
                const bR = pD.filter(p => p.tipo === 'B' && p.presente).reduce((s, c) => s + Number(c.ore_effettive), 0);
                return (
                  <tr key={d.id} className="hover:bg-slate-50 transition-all">
                    <td className="p-6">
                      <p className="font-black text-slate-800 uppercase">{d.nome}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{d.contratto} • {d.ore_settimanali}H • {d.mesi_servizio} MESI</p>
                    </td>
                    <td className="p-6 text-center font-mono font-bold text-blue-600">{d.codice_accesso}</td>
                    <td className="p-6 text-center font-black">
                      <span className="text-slate-300">{d.ore_a_dovute}</span> / <span className="text-blue-600">{aR}</span>
                    </td>
                    <td className="p-6 text-center font-black">
                      <span className="text-slate-300">{d.ore_b_dovute}</span> / <span className="text-indigo-600">{bR}</span>
                    </td>
                    <td className="p-6 text-right space-x-2">
                      <button onClick={() => setSelectedDocente(d)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase">Gestisci</button>
                      <button onClick={() => eliminaDocente(d.id)} className="text-red-400 font-black text-[9px] uppercase hover:text-red-700">Elimina</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedDocente && (
        <div className="animate-in fade-in zoom-in duration-300">
          <button onClick={() => setSelectedDocente(null)} className="mb-6 font-black text-xs uppercase text-slate-400 hover:text-blue-600 transition-all">← Esci da Gestione Docente</button>
          <DocentePanel docenteId={selectedDocente.id} docenteNome={selectedDocente.nome} infoDocente={selectedDocente} adminMode={true} />
        </div>
      )}

      {tab === 'nuovo_docente' && (
        <div className="max-w-xl mx-auto bg-white p-10 rounded-[3rem] shadow-2xl border text-center">
          <h2 className="text-3xl font-black mb-8 italic uppercase text-green-600">Configura Personale</h2>
          <div className="space-y-6">
            <input type="text" placeholder="NOME E COGNOME" className="w-full p-6 bg-slate-50 rounded-3xl font-bold uppercase border-2 focus:border-green-600 outline-none" onChange={e => setFNome(e.target.value)} />
            
            <div className="text-left">
              <label className="text-[10px] font-black text-slate-400 ml-4 mb-2 block uppercase">Inquadramento Contrattuale</label>
              <select className="w-full p-6 bg-slate-50 rounded-3xl font-bold border-2 outline-none appearance-none cursor-pointer" 
                value={fContratto} onChange={e => setFContratto(e.target.value)}>
                <option value="INTERA">CATTEDRA INTERA (18H)</option>
                <option value="COMPLETAMENTO">COMPLETAMENTO IN ALTRA SCUOLA</option>
                <option value="SPEZZONE">SPEZZONE ORARIO</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="text-left">
                 <label className="text-[10px] font-black text-slate-400 ml-4 mb-2 block uppercase">Ore in questa sede</label>
                 <input type="number" step="0.5" className="w-full p-6 bg-slate-50 rounded-3xl font-bold border-2 text-center" value={fOreSett} onChange={e => setFOreSett(Number(e.target.value))} />
               </div>
               <div className="text-left">
                 <label className="text-[10px] font-black text-slate-400 ml-4 mb-2 block uppercase">Mesi di Servizio</label>
                 <input type="number" className="w-full p-6 bg-slate-50 rounded-3xl font-bold border-2 text-center" value={fMesi} onChange={e => setFMesi(Number(e.target.value))} />
               </div>
            </div>
            <button onClick={aggiungiDocente} className="w-full bg-slate-900 text-white p-6 rounded-3xl font-black text-xl uppercase hover:bg-green-600 transition-all shadow-xl">Crea Profilo</button>
          </div>
        </div>
      )}

      {tab === 'nuovo_impegno' && (
        <div className="max-w-xl mx-auto bg-white p-10 rounded-[3rem] shadow-2xl border">
          <h2 className="text-3xl font-black mb-8 italic uppercase text-orange-600 text-center">Nuovo Impegno</h2>
          <div className="space-y-4">
            <input type="text" placeholder="TITOLO ATTIVITÀ (es. Collegio Docenti)" className="w-full p-6 bg-slate-50 rounded-3xl font-bold uppercase border-2" onChange={e => setFTitoloImp(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <input type="date" className="p-6 bg-slate-50 rounded-3xl font-bold border-2" onChange={e => setFDataImp(e.target.value)} />
              <input type="number" step="0.5" placeholder="ORE" className="p-6 bg-slate-50 rounded-3xl font-bold border-2 text-center" onChange={e => setFDurataImp(Number(e.target.value))} />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setFTipoImp('A')} className={`flex-1 p-5 rounded-2xl font-black transition-all ${fTipoImp === 'A' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>COMMA A</button>
              <button onClick={() => setFTipoImp('B')} className={`flex-1 p-5 rounded-2xl font-black transition-all ${fTipoImp === 'B' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>COMMA B</button>
            </div>
            <button onClick={async () => {
               await supabase.from('impegni').insert([{ titolo: fTitoloImp, data: fDataImp, durata_max: fDurataImp, tipo: fTipoImp }]);
               alert("Impegno Pubblicato!"); caricaTutto(); setTab('riepilogo');
            }} className="w-full bg-slate-900 text-white p-6 rounded-3xl font-black text-xl uppercase shadow-xl">Pubblica Evento</button>
          </div>
        </div>
      )}

      {tab === 'appello' && (
        <div className="grid md:grid-cols-2 gap-10">
          <div className="space-y-4">
             {impegni.map(i => (
               <div key={i.id} onClick={() => setTab(`appello_list_${i.id}`)} className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-transparent hover:border-blue-600 cursor-pointer transition-all">
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${i.tipo === 'A' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>Comma {i.tipo}</span>
                  <h3 className="text-xl font-black uppercase mt-2">{i.titolo}</h3>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">{i.data} • {i.durata_max} ORE</p>
               </div>
             ))}
          </div>
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl border h-fit sticky top-24">
            {tab.startsWith('appello_list_') ? (
              <div>
                 <h2 className="text-xl font-black mb-8 uppercase text-blue-600 border-b pb-4">Gestione Presenze</h2>
                 {piani.filter(p => p.impegno_id === tab.split('_')[2]).map(p => {
                    const doc = docenti.find(d => d.id === p.docente_id);
                    return (
                      <div key={p.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl mb-2 border">
                        <span className="font-black text-xs uppercase text-slate-700">{doc?.nome}</span>
                        <button onClick={async () => {
                           await supabase.from('piani').update({ presente: !p.presente }).eq('id', p.id);
                           caricaTutto();
                        }} className={`px-6 py-2 rounded-xl font-black text-[9px] uppercase transition-all shadow-sm ${p.presente ? 'bg-green-600 text-white' : 'bg-white text-slate-300 border'}`}>
                          {p.presente ? 'Presente ✓' : 'Assente'}
                        </button>
                      </div>
                    );
                 })}
              </div>
            ) : <p className="text-center py-20 text-slate-200 font-black italic uppercase">Seleziona un evento per l'appello</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/* --- PANNELLO DOCENTE --- */
function DocentePanel({ docenteId, docenteNome, infoDocente, adminMode = false }: any) {
  const [impegni, setImpegni] = useState<any[]>([]);
  const [piani, setPiani] = useState<any[]>([]);
  const [view, setView] = useState('pianifica');

  const fetchDati = useCallback(async () => {
    const { data: i } = await supabase.from('impegni').select('*').order('data');
    const { data: p } = await supabase.from('piani').select('*').eq('docente_id', docenteId);
    setImpegni(i || []); setPiani(p || []);
  }, [docenteId]);

  useEffect(() => { fetchDati(); }, [fetchDati]);

  const aP = piani.filter(p => p.tipo === 'A').reduce((s, c) => s + Number(c.ore_effettive), 0);
  const bP = piani.filter(p => p.tipo === 'B').reduce((s, c) => s + Number(c.ore_effettive), 0);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <nav className="flex gap-4 justify-center mb-10 bg-white p-3 rounded-2xl shadow-sm border w-fit mx-auto">
        <button onClick={() => setView('pianifica')} className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase ${view === 'pianifica' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>Pianificazione</button>
        <button onClick={() => setView('riepilogo')} className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase ${view === 'riepilogo' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>Mio Piano PDF</button>
      </nav>

      <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border-4 border-white mb-10 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
        <h1 className="text-5xl font-black uppercase italic text-slate-800 tracking-tighter">{docenteNome}</h1>
        <div className="flex justify-center gap-10 mt-10">
          <div className="text-center bg-blue-50 px-8 py-4 rounded-3xl border border-blue-100">
            <p className="text-[10px] font-black text-blue-500 uppercase">Dovute A: {infoDocente.ore_a_dovute}H</p>
            <p className="text-4xl font-black text-blue-700">{aP}H</p>
          </div>
          <div className="text-center bg-indigo-50 px-8 py-4 rounded-3xl border border-indigo-100">
            <p className="text-[10px] font-black text-indigo-500 uppercase">Dovute B: {infoDocente.ore_b_dovute}H</p>
            <p className="text-4xl font-black text-indigo-700">{bP}H</p>
          </div>
        </div>
      </div>

      {view === 'pianifica' && (
        <div className="space-y-6">
          {impegni.map(i => {
            const piano = piani.find(p => p.impegno_id === i.id);
            return (
              <div key={i.id} className={`bg-white p-8 rounded-[3rem] border-2 flex flex-col md:flex-row justify-between items-center gap-6 transition-all ${piano ? 'border-blue-400 bg-blue-50/30' : 'border-transparent shadow-sm'}`}>
                <div className="flex-1">
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${i.tipo === 'A' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>Comma {i.tipo}</span>
                  <h3 className="text-2xl font-black text-slate-800 mt-2 uppercase">{i.titolo}</h3>
                  <p className="text-slate-400 font-bold uppercase text-xs">{new Date(i.data).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
                <div className="flex items-center gap-6">
                   <div className="text-center">
                      <label className="text-[9px] font-black text-slate-300 block uppercase">Ore</label>
                      <input id={`input-${i.id}`} type="number" step="0.5" defaultValue={piano ? piano.ore_effettive : i.durata_max} className="w-20 p-4 rounded-2xl bg-slate-100 font-black text-xl text-center outline-none" disabled={piano?.presente && !adminMode} />
                   </div>
                   <button onClick={async () => {
                     const oreVal = (document.getElementById(`input-${i.id}`) as HTMLInputElement).value;
                     if(piano) {
                       if(piano.presente && !adminMode) return alert("Attività già validata. Impossibile modificare.");
                       await supabase.from('piani').delete().eq('id', piano.id);
                     } else {
                       await supabase.from('piani').insert([{ docente_id: docenteId, impegno_id: i.id, ore_effettive: Number(oreVal), tipo: i.tipo, presente: false }]);
                     }
                     fetchDati();
                   }} className={`px-10 py-5 rounded-[1.8rem] font-black text-xs uppercase shadow-xl active:scale-95 transition-all ${piano ? 'bg-red-500 text-white' : 'bg-slate-900 text-white'}`}>
                    {piano ? 'Rimuovi' : 'Pianifica'}
                   </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'riepilogo' && (
        <div className="bg-white p-16 rounded-[4rem] shadow-2xl border" id="stampa">
           <div className="flex justify-between items-start mb-12 border-b-8 border-slate-900 pb-10">
              <div>
                <h1 className="text-5xl font-black uppercase italic tracking-tighter">Piano Attività</h1>
                <p className="text-xl font-bold text-slate-500 uppercase mt-2">Docente: {docenteNome}</p>
                <p className="text-xs font-black text-slate-400 mt-1 uppercase tracking-widest">{infoDocente.contratto} • {infoDocente.ore_settimanali}H SETT.</p>
              </div>
              <button onClick={() => window.print()} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase print:hidden shadow-xl">Stampa PDF</button>
           </div>
           <table className="w-full text-left">
              <thead>
                <tr className="text-[12px] font-black uppercase text-slate-400 border-b-4 border-slate-100">
                  <th className="py-6">Descrizione</th>
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
                      <td className="py-6 text-center"><span className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black">{p.tipo}</span></td>
                      <td className="py-6 text-right font-black text-xl">{p.ore_effettive}H</td>
                    </tr>
                  );
                })}
                <tr className="bg-slate-900 text-white">
                  <td colSpan={3} className="p-8 font-black uppercase text-sm tracking-widest">Totale Ore Pianificate</td>
                  <td className="p-8 text-right font-black text-4xl">{aP + bP}H</td>
                </tr>
              </tbody>
           </table>
           <div className="mt-40 grid grid-cols-2 gap-20 invisible print:visible">
              <div className="border-t-4 border-slate-900 pt-4 text-center text-[10px] font-black uppercase tracking-widest">Firma del Docente</div>
              <div className="border-t-4 border-slate-900 pt-4 text-center text-[10px] font-black uppercase tracking-widest">Firma Dirigente Scolastico</div>
           </div>
        </div>
      )}
    </div>
  );
}
