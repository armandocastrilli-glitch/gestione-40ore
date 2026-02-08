"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AppGestionaleScuola() {
  const [user, setUser] = useState<any>(null);
  const [loginCode, setLoginCode] = useState('');
  const [lastAction, setLastAction] = useState<any>(null); // Per la funzione UNDO

  const handleLogin = async () => {
    if (loginCode === 'ADMIN123') { 
      setUser({ id: 'admin', nome: 'Amministratore', role: 'admin' }); 
      return; 
    }
    const { data } = await supabase.from('docenti').select('*').eq('codice_accesso', loginCode).single();
    if (data) setUser(data);
    else alert("Codice errato");
  };

  // --- FUNZIONE UNDO UNIVERSALE ---
  const triggerUndo = async () => {
    if (!lastAction) return;
    const { type, table, data } = lastAction;

    try {
      if (type === 'INSERT') {
        await supabase.from(table).delete().eq('id', data.id);
      } else if (type === 'DELETE') {
        await supabase.from(table).insert([data]);
      } else if (type === 'UPDATE') {
        await supabase.from(table).update(data.old).eq('id', data.id);
      }
      setLastAction(null);
      alert("Azione annullata con successo!");
      window.location.reload(); // Ricarica per pulire lo stato
    } catch (e) {
      alert("Errore durante l'annullamento.");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md text-center">
          <h1 className="text-3xl font-black text-slate-800 mb-8 italic tracking-tighter uppercase">Scuola Control</h1>
          <input type="text" placeholder="CODICE ACCESSO" className="w-full p-5 border-2 rounded-2xl mb-4 text-center text-2xl uppercase font-mono shadow-inner outline-none focus:border-blue-600 transition-all" 
            onChange={(e) => setLoginCode(e.target.value.toUpperCase())} />
          <button onClick={handleLogin} className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-lg hover:bg-blue-700 shadow-lg active:scale-95 transition-all">ACCEDI</button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {user.role === 'admin' ? 
        <AdminDashboard setLastAction={setLastAction} /> : 
        <DocentePanel docenteId={user.id} docenteNome={user.nome} infoDocente={user} setLastAction={setLastAction} />
      }

      {/* TASTO UNDO FLUTTUANTE */}
      {lastAction && (
        <button 
          onClick={triggerUndo}
          className="fixed bottom-8 right-8 bg-orange-500 text-white px-6 py-4 rounded-2xl font-black shadow-2xl hover:bg-orange-600 transition-all animate-bounce flex items-center gap-2 z-50 uppercase text-xs tracking-widest"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
          Annulla Ultima Operazione
        </button>
      )}
    </div>
  );
}

/* --- DASHBOARD ADMIN --- */
function AdminDashboard({ setLastAction }: any) {
  const [tab, setTab] = useState('excel');
  const [docenti, setDocenti] = useState<any[]>([]);
  const [impegni, setImpegni] = useState<any[]>([]);
  const [tuttiPiani, setTuttiPiani] = useState<any[]>([]);
  const [selectedImpegno, setSelectedImpegno] = useState<any>(null);
  const [selectedDocente, setSelectedDocente] = useState<any>(null);

  // Form states
  const [nome, setNome] = useState('');
  const [oreSet, setOreSet] = useState(18);
  const [mesi, setMesi] = useState(9);
  const [tipoRipartizione, setTipoRipartizione] = useState('completamento');
  const [titolo, setTitolo] = useState('');
  const [dataImp, setDataImp] = useState('');
  const [durata, setDurata] = useState(2);
  const [comma, setComma] = useState('A');

  useEffect(() => { caricaDati(); }, [tab]);

  const caricaDati = async () => {
    const { data: d } = await supabase.from('docenti').select('*').order('nome');
    const { data: i } = await supabase.from('impegni').select('*').order('data');
    const { data: p } = await supabase.from('piani').select('*');
    setDocenti(d || []);
    setImpegni(i || []);
    setTuttiPiani(p || []);
  };

  const eliminaDocente = async (doc: any) => {
    if(confirm(`Eliminare ${doc.nome}?`)) {
      setLastAction({ type: 'DELETE', table: 'docenti', data: doc });
      await supabase.from('docenti').delete().eq('id', doc.id);
      caricaDati();
    }
  };

  const salvaDocente = async () => {
    const codice = Math.random().toString(36).substring(2, 7).toUpperCase();
    let a, b;
    if (tipoRipartizione === 'solo_mia') {
      a = 40; b = parseFloat(((40/18)*oreSet*(mesi/9)).toFixed(1));
    } else {
      const meta = parseFloat((((80/18)*oreSet*(mesi/9))/2).toFixed(1));
      a = meta; b = meta;
    }
    const { data } = await supabase.from('docenti').insert([{ nome, codice_accesso: codice, ore_a_dovute: a, ore_b_dovute: b }]).select().single();
    if(data) setLastAction({ type: 'INSERT', table: 'docenti', data: data });
    caricaDati(); setTab('excel');
  };

  const aggiornaPresenza = async (piano: any) => {
    const vecchioStato = piano.presente;
    setLastAction({ type: 'UPDATE', table: 'piani', data: { id: piano.id, old: { presente: vecchioStato } } });
    await supabase.from('piani').update({ presente: !vecchioStato }).eq('id', piano.id);
    caricaDati();
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 pb-32">
      <nav className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-2xl shadow-sm border w-fit font-black text-[10px] uppercase tracking-widest">
        <button onClick={() => {setTab('excel'); setSelectedDocente(null)}} className={`px-5 py-2.5 rounded-xl ${tab === 'excel' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>Riepilogo Excel</button>
        <button onClick={() => setTab('calendario')} className={`px-5 py-2.5 rounded-xl ${tab === 'calendario' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Calendario & Appello</button>
        <button onClick={() => setTab('nuovo_docente')} className={`px-5 py-2.5 rounded-xl ${tab === 'nuovo_docente' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>+ Docente</button>
        <button onClick={() => setTab('nuovo_impegno')} className={`px-5 py-2.5 rounded-xl ${tab === 'nuovo_impegno' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>+ Impegno</button>
      </nav>

      {tab === 'excel' && !selectedDocente && (
        <div className="bg-white rounded-3xl shadow-2xl border overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-wider border-b">
                <th className="p-4">Docente</th>
                <th className="p-4 text-center bg-blue-50 text-blue-600">A - Dovute</th>
                <th className="p-4 text-center bg-blue-50 text-blue-600">A - Pianif.</th>
                <th className="p-4 text-center bg-blue-600 text-white">A - Realiz.</th>
                <th className="p-4 text-center bg-indigo-50 text-indigo-600">B - Dovute</th>
                <th className="p-4 text-center bg-indigo-50 text-indigo-600">B - Pianif.</th>
                <th className="p-4 text-center bg-indigo-600 text-white">B - Realiz.</th>
                <th className="p-4 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docenti.map(d => {
                const pD = tuttiPiani.filter(p => p.docente_id === d.id);
                const aP = pD.filter(p => p.tipo === 'A').reduce((s, c) => s + Number(c.ore_effettive), 0);
                const aR = pD.filter(p => p.tipo === 'A' && p.presente).reduce((s, c) => s + Number(c.ore_effettive), 0);
                const bP = pD.filter(p => p.tipo === 'B').reduce((s, c) => s + Number(c.ore_effettive), 0);
                const bR = pD.filter(p => p.tipo === 'B' && p.presente).reduce((s, c) => s + Number(c.ore_effettive), 0);

                return (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="p-4 font-bold border-r">
                      <div>{d.nome}</div>
                      <div className="text-[10px] text-blue-500 font-mono uppercase">{d.codice_accesso}</div>
                    </td>
                    <td className="p-4 text-center font-mono border-r">{d.ore_a_dovute}</td>
                    <td className="p-4 text-center font-mono border-r text-blue-600">{aP}</td>
                    <td className="p-4 text-center font-mono border-r bg-blue-50 font-black text-blue-700">{aR}</td>
                    <td className="p-4 text-center font-mono border-r">{d.ore_b_dovute}</td>
                    <td className="p-4 text-center font-mono border-r text-indigo-600">{bP}</td>
                    <td className="p-4 text-center font-mono bg-indigo-50 font-black text-indigo-700">{bR}</td>
                    <td className="p-4 text-right space-x-2">
                      <button onClick={() => setSelectedDocente(d)} className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-blue-600 transition-all">Gestisci</button>
                      <button onClick={() => eliminaDocente(d)} className="text-red-300 hover:text-red-600 transition-all p-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
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
          <button onClick={() => setSelectedDocente(null)} className="mb-6 bg-slate-100 px-5 py-2 rounded-2xl font-black text-[10px] uppercase"> ← Torna al riepilogo </button>
          <DocentePanel docenteId={selectedDocente.id} docenteNome={selectedDocente.nome} infoDocente={selectedDocente} adminMode={true} setLastAction={setLastAction} />
        </div>
      )}

      {tab === 'calendario' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-black italic uppercase mb-6">Appello Eventi</h2>
            {impegni.map(i => (
              <div key={i.id} onClick={() => setSelectedImpegno(i)} 
                className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all ${selectedImpegno?.id === i.id ? 'border-blue-600 bg-blue-50 shadow-xl' : 'bg-white border-transparent hover:border-slate-200 shadow-sm'}`}>
                <span className={`text-[9px] font-black px-2 py-1 rounded uppercase ${i.tipo === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>Comma {i.tipo}</span>
                <h3 className="font-black text-xl mt-1 text-slate-800 uppercase">{i.titolo}</h3>
                <p className="text-slate-400 font-bold text-sm">{i.data} • {i.durata_max}h</p>
              </div>
            ))}
          </div>
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl border h-fit sticky top-8">
            {selectedImpegno ? (
              <div className="space-y-2">
                <h3 className="text-xl font-black mb-6 uppercase italic">{selectedImpegno.titolo}</h3>
                {tuttiPiani.filter(p => p.impegno_id === selectedImpegno.id).map(p => {
                  const doc = docenti.find(d => d.id === p.docente_id);
                  return (
                    <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="font-bold text-slate-700">{doc?.nome || 'Docente'}</span>
                      <button onClick={() => aggiornaPresenza(p)} 
                        className={`px-5 py-2 rounded-xl font-black text-[9px] uppercase transition-all shadow-sm ${p.presente ? 'bg-green-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
                        {p.presente ? 'Presente ✓' : 'Assente'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-20 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest">Seleziona un evento per l'appello</p>
            )}
          </div>
        </div>
      )}

      {tab === 'nuovo_docente' && (
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-black mb-8 italic uppercase">Nuovo Docente</h2>
          <div className="space-y-4">
            <input type="text" placeholder="NOME E COGNOME" className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-center uppercase shadow-inner outline-none" onChange={e => setNome(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
               <input type="number" placeholder="ORE SETT." className="p-5 bg-slate-50 rounded-2xl font-bold text-center shadow-inner" onChange={e => setOreSet(Number(e.target.value))} />
               <input type="number" placeholder="MESI SERV." className="p-5 bg-slate-50 rounded-2xl font-bold text-center shadow-inner" onChange={e => setMesi(Number(e.target.value))} />
            </div>
            <select className="w-full p-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest outline-none cursor-pointer" onChange={e => setTipoRipartizione(e.target.value)}>
              <option value="completamento">Spezzone (50/50)</option>
              <option value="solo_mia">Intera (40A + Prop. B)</option>
            </select>
            <button onClick={salvaDocente} className="w-full bg-slate-900 text-white p-6 rounded-2xl font-black text-lg hover:bg-blue-600 transition-all shadow-2xl">CREA PROFILO</button>
          </div>
        </div>
      )}

      {tab === 'nuovo_impegno' && (
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-black mb-8 italic uppercase">Nuovo Evento</h2>
          <div className="space-y-4">
            <input type="text" placeholder="TITOLO RIUNIONE" className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-center uppercase shadow-inner outline-none" onChange={e => setTitolo(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
               <input type="date" className="p-5 bg-slate-50 rounded-2xl font-bold text-center shadow-inner" onChange={e => setDataImp(e.target.value)} />
               <input type="number" placeholder="DURATA ORE" className="p-5 bg-slate-50 rounded-2xl font-bold text-center shadow-inner" onChange={e => setDurata(Number(e.target.value))} />
            </div>
            <div className="flex gap-2">
               <button onClick={() => setComma('A')} className={`flex-1 p-4 rounded-xl font-black text-[10px] tracking-widest ${comma === 'A' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>COMMA A</button>
               <button onClick={() => setComma('B')} className={`flex-1 p-4 rounded-xl font-black text-[10px] tracking-widest ${comma === 'B' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>COMMA B</button>
            </div>
            <button onClick={async () => {
              const { data } = await supabase.from('impegni').insert([{ titolo, data: dataImp, durata_max: durata, tipo: comma }]).select().single();
              if(data) setLastAction({ type: 'INSERT', table: 'impegni', data: data });
              alert("Pubblicato!"); setTab('calendario');
            }} className="w-full bg-slate-900 text-white p-6 rounded-2xl font-black text-lg hover:bg-blue-600 transition-all shadow-2xl uppercase tracking-widest">Pubblica</button>
          </div>
        </div>
      )}
    </div>
  );
}

function DocentePanel({ docenteId, docenteNome, infoDocente, adminMode = false, setLastAction }: any) {
  const [impegni, setImpegni] = useState<any[]>([]);
  const [piani, setPiani] = useState<any[]>([]);

  useEffect(() => { caricaTutto(); }, [docenteId]);

  const caricaTutto = async () => {
    const { data: i } = await supabase.from('impegni').select('*').order('data');
    const { data: p } = await supabase.from('piani').select('*').eq('docente_id', docenteId);
    setImpegni(i || []);
    setPiani(p || []);
  };

  const toggleImpegno = async (imp: any, orePianificate: any) => {
    const esistente = piani.find(p => p.impegno_id === imp.id);
    if (esistente) {
      if(esistente.presente && !adminMode) {
        alert("Già realizzato. Contatta l'admin."); return;
      }
      setLastAction({ type: 'DELETE', table: 'piani', data: esistente });
      await supabase.from('piani').delete().eq('id', esistente.id);
    } else {
      const { data } = await supabase.from('piani').insert([{ 
        docente_id: docenteId, impegno_id: imp.id, ore_effettive: Number(orePianificate), tipo: imp.tipo, presente: false
      }]).select().single();
      if(data) setLastAction({ type: 'INSERT', table: 'piani', data: data });
    }
    caricaTutto();
  };

  const aP = piani.filter(p => p.tipo === 'A').reduce((acc, curr) => acc + Number(curr.ore_effettive), 0);
  const aR = piani.filter(p => p.tipo === 'A' && p.presente).reduce((acc, curr) => acc + Number(curr.ore_effettive), 0);
  const bP = piani.filter(p => p.tipo === 'B').reduce((acc, curr) => acc + Number(curr.ore_effettive), 0);
  const bR = piani.filter(p => p.tipo === 'B' && p.presente).reduce((acc, curr) => acc + Number(curr.ore_effettive), 0);

  return (
    <div className="max-w-4xl mx-auto pb-20 p-4">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl border mb-10 relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-full h-3 bg-gradient-to-r ${adminMode ? 'from-orange-500 to-red-600' : 'from-blue-600 to-indigo-700'}`}></div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <h1 className="text-4xl font-black italic uppercase text-slate-800">{docenteNome}</h1>
          <div className="flex gap-4">
            <div className="bg-blue-50 px-6 py-4 rounded-3xl border border-blue-100 text-center">
              <p className="text-[9px] font-black text-blue-500 uppercase">A ({infoDocente?.ore_a_dovute}h)</p>
              <p className="text-xl font-black">{aP}p / <span className="text-green-600">{aR}r</span></p>
            </div>
            <div className="bg-indigo-50 px-6 py-4 rounded-3xl border border-indigo-100 text-center">
              <p className="text-[9px] font-black text-indigo-500 uppercase">B ({infoDocente?.ore_b_dovute}h)</p>
              <p className="text-xl font-black">{bP}p / <span className="text-green-600">{bR}r</span></p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {impegni.map(i => {
          const isP = piani.find(p => p.impegno_id === i.id);
          return (
            <div key={i.id} className={`bg-white p-6 rounded-[2.5rem] border-2 transition-all flex flex-col md:flex-row justify-between items-center gap-4 ${isP ? (isP.presente ? 'border-green-500 bg-green-50/20' : 'border-blue-400') : 'border-transparent shadow-sm'}`}>
              <div className="flex-1 text-center md:text-left">
                <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${i.tipo === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>Comma {i.tipo}</span>
                <p className="font-black text-xl text-slate-800">{i.titolo}</p>
                <p className="text-xs font-bold text-slate-400 uppercase">{i.data} • {i.durata_max}h max</p>
              </div>
              <div className="flex items-center gap-3">
                <input type="number" defaultValue={isP ? isP.ore_effettive : i.durata_max} className="w-16 p-3 bg-slate-50 rounded-xl text-center font-black text-blue-600" id={`ore-${i.id}`} disabled={isP?.presente && !adminMode} />
                <button onClick={() => {
                  const val = (document.getElementById(`ore-${i.id}`) as HTMLInputElement).value;
                  toggleImpegno(i, val);
                }} className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-md ${isP ? 'bg-red-500 text-white' : 'bg-slate-900 text-white hover:bg-blue-600'}`}>
                  {isP ? 'Rimuovi' : 'Pianifica'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
