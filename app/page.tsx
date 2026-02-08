"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AppGestionaleScuola() {
  const [user, setUser] = useState<any>(null);
  const [loginCode, setLoginCode] = useState('');

  const handleLogin = async () => {
    if (loginCode === 'ADMIN123') { 
      setUser({ id: 'admin', nome: 'Amministratore', role: 'admin' }); 
      return; 
    }
    const { data } = await supabase.from('docenti').select('*').eq('codice_accesso', loginCode).single();
    if (data) setUser(data);
    else alert("Codice errato");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md text-center">
          <h1 className="text-3xl font-black text-slate-800 mb-8 italic tracking-tighter">SCUOLA CONTROL</h1>
          <input type="text" placeholder="CODICE ACCESSO" className="w-full p-5 border-2 rounded-2xl mb-4 text-center text-2xl uppercase font-mono shadow-inner outline-none focus:border-blue-600 transition-all" 
            onChange={(e) => setLoginCode(e.target.value.toUpperCase())} />
          <button onClick={handleLogin} className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-lg hover:bg-blue-700 shadow-lg transition-all active:scale-95">ACCEDI</button>
        </div>
      </div>
    );
  }

  return user.role === 'admin' ? <AdminDashboard /> : <DocentePanel docenteId={user.id} docenteNome={user.nome} infoDocente={user} />;
}

function AdminDashboard() {
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

  const eliminaDocente = async (id: string) => {
    if(confirm("Sei sicuro? Questo eliminerà anche tutto il piano ore del docente.")) {
      await supabase.from('docenti').delete().eq('id', id);
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
    await supabase.from('docenti').insert([{ nome, codice_accesso: codice, ore_a_dovute: a, ore_b_dovute: b }]);
    alert("Docente Creato!");
    caricaDati(); setTab('excel');
  };

  const aggiornaPresenza = async (pianoId: string, statoAttuale: boolean) => {
    await supabase.from('piani').update({ presente: !statoAttuale }).eq('id', pianoId);
    caricaDati();
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <nav className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-2xl shadow-sm border w-fit font-black text-[10px] uppercase tracking-widest">
        <button onClick={() => {setTab('excel'); setSelectedDocente(null)}} className={`px-5 py-2.5 rounded-xl transition-all ${tab === 'excel' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>Dashboard Excel</button>
        <button onClick={() => setTab('calendario')} className={`px-5 py-2.5 rounded-xl transition-all ${tab === 'calendario' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>Calendario & Appello</button>
        <button onClick={() => setTab('nuovo_docente')} className={`px-5 py-2.5 rounded-xl transition-all ${tab === 'nuovo_docente' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>+ Docente</button>
        <button onClick={() => setTab('nuovo_impegno')} className={`px-5 py-2.5 rounded-xl transition-all ${tab === 'nuovo_impegno' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>+ Impegno</button>
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
                  <tr key={d.id} className="hover:bg-slate-50 transition-all group">
                    <td className="p-4 font-bold border-r">
                      <div className="text-slate-800">{d.nome}</div>
                      <div className="text-[10px] font-mono text-blue-500 uppercase">{d.codice_accesso}</div>
                    </td>
                    <td className="p-4 text-center font-mono border-r">{d.ore_a_dovute}</td>
                    <td className="p-4 text-center font-mono border-r text-blue-600">{aP}</td>
                    <td className="p-4 text-center font-mono border-r bg-blue-50 font-black text-blue-700">{aR}</td>
                    <td className="p-4 text-center font-mono border-r">{d.ore_b_dovute}</td>
                    <td className="p-4 text-center font-mono border-r text-indigo-600">{bP}</td>
                    <td className="p-4 text-center font-mono bg-indigo-50 font-black text-indigo-700">{bR}</td>
                    <td className="p-4 text-right space-x-2">
                      <button onClick={() => setSelectedDocente(d)} className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-blue-600">Gestisci</button>
                      <button onClick={() => eliminaDocente(d.id)} className="text-red-300 hover:text-red-600 transition-colors p-1">
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
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => setSelectedDocente(null)} className="flex items-center gap-2 bg-slate-100 px-5 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">
              ← Annulla e torna al riepilogo
            </button>
            <span className="text-[10px] font-black bg-orange-100 text-orange-600 px-3 py-1 rounded-full uppercase">Modalità Admin attiva</span>
          </div>
          <DocentePanel docenteId={selectedDocente.id} docenteNome={selectedDocente.nome} infoDocente={selectedDocente} adminMode={true} onBack={() => setSelectedDocente(null)} />
        </div>
      )}

      {tab === 'calendario' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-black italic uppercase mb-6 tracking-tighter">Eventi & Appello</h2>
            {impegni.map(i => (
              <div key={i.id} onClick={() => setSelectedImpegno(i)} 
                className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all ${selectedImpegno?.id === i.id ? 'border-blue-600 bg-blue-50 shadow-xl' : 'bg-white border-transparent hover:border-slate-200 shadow-sm'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`text-[9px] font-black px-2 py-1 rounded uppercase ${i.tipo === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>Comma {i.tipo}</span>
                    <h3 className="font-black text-xl mt-1 text-slate-800">{i.titolo}</h3>
                    <p className="text-slate-400 font-bold text-sm mt-1">{i.data} • {i.durata_max} ore</p>
                  </div>
                  <button onClick={(e) => {e.stopPropagation(); if(confirm("Elimina evento?")){supabase.from('impegni').delete().eq('id', i.id).then(caricaDati);}}} className="text-slate-300 hover:text-red-500 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl border h-fit sticky top-8">
            {selectedImpegno ? (
              <>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase italic leading-tight">{selectedImpegno.titolo}</h3>
                    <p className="text-blue-500 font-bold text-[10px] uppercase tracking-widest mt-1">Gestione Presenze Reali</p>
                  </div>
                  <button onClick={() => setSelectedImpegno(null)} className="text-slate-300 hover:text-slate-600">Annulla</button>
                </div>
                <div className="space-y-2">
                  {tuttiPiani.filter(p => p.impegno_id === selectedImpegno.id).map(p => {
                    const doc = docenti.find(d => d.id === p.docente_id);
                    return (
                      <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="font-bold text-slate-700">{doc?.nome || 'Docente rimosso'}</span>
                        <button onClick={() => aggiornaPresenza(p.id, p.presente)} 
                          className={`px-5 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-sm ${p.presente ? 'bg-green-600 text-white' : 'bg-white text-slate-400 border border-slate-200 hover:border-green-300'}`}>
                          {p.presente ? 'Presente ✓' : 'Segna Presente'}
                        </button>
                      </div>
                    );
                  })}
                  {tuttiPiani.filter(p => p.impegno_id === selectedImpegno.id).length === 0 && (
                    <div className="py-20 text-center text-slate-300 italic text-sm">Nessuna prenotazione per questo evento.</div>
                  )}
                </div>
              </>
            ) : (
              <div className="py-40 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                </div>
                <p className="text-slate-300 font-black uppercase text-[10px] tracking-widest">Seleziona un evento per l'appello</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'nuovo_docente' && (
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border max-w-xl mx-auto">
          <h2 className="text-2xl font-black mb-8 italic uppercase text-center">Nuovo Profilo</h2>
          <div className="space-y-4">
            <input type="text" placeholder="NOME E COGNOME" className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-center uppercase shadow-inner outline-none focus:ring-2 ring-blue-500" onChange={e => setNome(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
               <input type="number" placeholder="ORE SETT." className="p-5 bg-slate-50 rounded-2xl font-bold text-center" onChange={e => setOreSet(Number(e.target.value))} />
               <input type="number" placeholder="MESI SERV." className="p-5 bg-slate-50 rounded-2xl font-bold text-center" onChange={e => setMesi(Number(e.target.value))} />
            </div>
            <select className="w-full p-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest outline-none shadow-lg cursor-pointer" onChange={e => setTipoRipartizione(e.target.value)}>
              <option value="completamento">Spezzone (Ripartizione 50/50)</option>
              <option value="solo_mia">Intera (40A Fisso + Prop. B)</option>
            </select>
            <button onClick={salvaDocente} className="w-full bg-slate-900 text-white p-6 rounded-2xl font-black text-lg hover:bg-blue-600 transition-all shadow-2xl">CREA DOCENTE</button>
          </div>
        </div>
      )}

      {tab === 'nuovo_impegno' && (
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border max-w-xl mx-auto">
          <h2 className="text-2xl font-black mb-8 italic uppercase text-center">Nuovo Impegno</h2>
          <div className="space-y-4">
            <input type="text" placeholder="TITOLO RIUNIONE" className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-center uppercase shadow-inner outline-none focus:ring-2 ring-blue-500" onChange={e => setTitolo(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
               <input type="date" className="p-5 bg-slate-50 rounded-2xl font-bold text-center" onChange={e => setDataImp(e.target.value)} />
               <input type="number" placeholder="DURATA ORE" className="p-5 bg-slate-50 rounded-2xl font-bold text-center shadow-inner" onChange={e => setDurata(Number(e.target.value))} />
            </div>
            <div className="flex gap-2">
               <button onClick={() => setComma('A')} className={`flex-1 p-4 rounded-xl font-black text-[10px] tracking-widest transition-all ${comma === 'A' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>COMMA A</button>
               <button onClick={() => setComma('B')} className={`flex-1 p-4 rounded-xl font-black text-[10px] tracking-widest transition-all ${comma === 'B' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>COMMA B</button>
            </div>
            <button onClick={async () => {await supabase.from('impegni').insert([{ titolo, data: dataImp, durata_max: durata, tipo: comma }]); alert("Evento Pubblicato!"); setTab('calendario');}} className="w-full bg-slate-900 text-white p-6 rounded-2xl font-black text-lg hover:bg-blue-600 transition-all shadow-2xl uppercase tracking-widest">Pubblica</button>
          </div>
        </div>
      )}
    </div>
  );
}

function DocentePanel({ docenteId, docenteNome, infoDocente, adminMode = false, onBack }: any) {
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
        alert("Impossibile rimuovere un impegno già realizzato. Contatta l'admin.");
        return;
      }
      await supabase.from('piani').delete().eq('id', esistente.id);
    } else {
      await supabase.from('piani').insert([{ 
        docente_id: docenteId, 
        impegno_id: imp.id, 
        ore_effettive: Number(orePianificate),
        tipo: imp.tipo,
        presente: false
      }]);
    }
    caricaTutto();
  };

  const aP = piani.filter(p => p.tipo === 'A').reduce((acc, curr) => acc + Number(curr.ore_effettive), 0);
  const aR = piani.filter(p => p.tipo === 'A' && p.presente).reduce((acc, curr) => acc + Number(curr.ore_effettive), 0);
  const bP = piani.filter(p => p.tipo === 'B').reduce((acc, curr) => acc + Number(curr.ore_effettive), 0);
  const bR = piani.filter(p => p.tipo === 'B' && p.presente).reduce((acc, curr) => acc + Number(curr.ore_effettive), 0);

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl border mb-10 relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-full h-3 bg-gradient-to-r ${adminMode ? 'from-orange-500 to-red-600' : 'from-blue-600 to-indigo-700'}`}></div>
        <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-left gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter italic uppercase text-slate-800">{docenteNome}</h1>
            <p className="text-[10px] font-black text-slate-300 uppercase mt-1 tracking-widest">Resoconto Personale Ore</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-blue-50 px-6 py-4 rounded-3xl border border-blue-100 text-center">
              <p className="text-[9px] font-black text-blue-500 uppercase mb-1">Comma A</p>
              <p className="text-xl font-black text-slate-800">{aP}p / <span className="text-green-600">{aR}r</span></p>
              <p className="text-[10px] font-bold text-slate-400">su {infoDocente?.ore_a_dovute}h</p>
            </div>
            <div className="bg-indigo-50 px-6 py-4 rounded-3xl border border-indigo-100 text-center">
              <p className="text-[9px] font-black text-indigo-500 uppercase mb-1">Comma B</p>
              <p className="text-xl font-black text-slate-800">{bP}p / <span className="text-green-600">{bR}r</span></p>
              <p className="text-[10px] font-bold text-slate-400">su {infoDocente?.ore_b_dovute}h</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {impegni.map(i => {
          const isPianificato = piani.find(p => p.impegno_id === i.id);
          return (
            <div key={i.id} className={`bg-white p-6 rounded-[2.5rem] border-2 transition-all flex flex-col md:flex-row justify-between items-center gap-4 ${isPianificato ? (isPianificato.presente ? 'border-green-500 bg-green-50/20' : 'border-blue-400') : 'border-transparent shadow-sm'}`}>
              <div className="flex-1">
                <span className={`text-[10px] font-black px-2 py-1 rounded-md mr-2 uppercase ${i.tipo === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>Comma {i.tipo}</span>
                <p className={`font-black text-xl ${isPianificato?.presente ? 'text-green-700' : 'text-slate-800'}`}>{i.titolo}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold text-slate-400 uppercase">{i.data} • {i.durata_max}h max</span>
                  {isPianificato?.presente && <span className="text-[9px] bg-green-600 text-white px-2 py-0.5 rounded font-black uppercase shadow-sm">Realizzato</span>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input type="number" defaultValue={isPianificato ? isPianificato.ore_effettive : i.durata_max} className="w-16 p-3 bg-slate-50 border-none rounded-xl text-center font-black text-blue-600 shadow-inner outline-none" id={`ore-${i.id}`} disabled={isPianificato?.presente && !adminMode} />
                <button onClick={() => {
                  const val = (document.getElementById(`ore-${i.id}`) as HTMLInputElement).value;
                  toggleImpegno(i, val);
                }} className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-95 ${isPianificato ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-slate-900 text-white hover:bg-blue-600'}`}>
                  {isPianificato ? 'Rimuovi' : 'Pianifica'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
