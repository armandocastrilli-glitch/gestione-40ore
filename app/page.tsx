"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AppGestionaleScuola() {
  const [user, setUser] = useState<any>(null);
  const [loginCode, setLoginCode] = useState('');
  const [lastAction, setLastAction] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleLogin = async () => {
    if (loginCode === 'ADMIN123') { 
      setUser({ id: 'admin', nome: 'Amministratore', role: 'admin' }); 
      return; 
    }
    const { data } = await supabase.from('docenti').select('*').eq('codice_accesso', loginCode.toUpperCase()).single();
    if (data) setUser(data);
    else alert("Codice errato");
  };

  const triggerUndo = async () => {
    if (!lastAction) return;
    const { type, table, data } = lastAction;
    try {
      if (type === 'INSERT') await supabase.from(table).delete().eq('id', data.id);
      else if (type === 'DELETE') await supabase.from(table).insert([data]);
      else if (type === 'UPDATE') await supabase.from(table).update(data.old).eq('id', data.id);
      setLastAction(null);
      setRefreshKey(prev => prev + 1);
      alert("Operazione annullata!");
    } catch (e) { alert("Errore durante l'undo."); }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 text-slate-900">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md text-center">
          <h1 className="text-3xl font-black mb-8 italic tracking-tighter uppercase">Scuola Control</h1>
          <input type="text" placeholder="CODICE ACCESSO" className="w-full p-5 border-2 rounded-2xl mb-4 text-center text-2xl uppercase font-mono shadow-inner outline-none focus:border-blue-600 transition-all" 
            onChange={(e) => setLoginCode(e.target.value)} />
          <button onClick={handleLogin} className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-lg hover:bg-blue-700 shadow-lg transition-all active:scale-95">ACCEDI</button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-800 pb-20">
      {user.role === 'admin' ? 
        <AdminDashboard key={`adm-${refreshKey}`} setLastAction={setLastAction} /> : 
        <DocentePanel key={`doc-${refreshKey}`} docenteId={user.id} docenteNome={user.nome} infoDocente={user} setLastAction={setLastAction} />
      }

      {lastAction && (
        <button onClick={triggerUndo} className="fixed bottom-8 right-8 bg-orange-500 text-white px-6 py-4 rounded-full font-black shadow-2xl hover:bg-orange-600 transition-all z-50 flex items-center gap-3 uppercase text-[10px] tracking-widest animate-bounce">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
          Annulla Ultima Operazione
        </button>
      )}
    </div>
  );
}

function AdminDashboard({ setLastAction }: any) {
  const [tab, setTab] = useState('excel');
  const [docenti, setDocenti] = useState<any[]>([]);
  const [impegni, setImpegni] = useState<any[]>([]);
  const [tuttiPiani, setTuttiPiani] = useState<any[]>([]);
  const [documenti, setDocumenti] = useState<any[]>([]);
  const [selectedDocente, setSelectedDocente] = useState<any>(null);
  const [selectedImpegno, setSelectedImpegno] = useState<any>(null);

  const [nome, setNome] = useState('');
  const [oreSet, setOreSet] = useState(18);
  const [mesi, setMesi] = useState(9);
  const [docTitolo, setDocTitolo] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [titoloImp, setTitoloImp] = useState('');
  const [dataImp, setDataImp] = useState('');
  const [durataImp, setDurataImp] = useState(2);
  const [commaImp, setCommaImp] = useState('A');

  useEffect(() => { caricaDati(); }, [tab]);

  const caricaDati = async () => {
    const { data: d } = await supabase.from('docenti').select('*').order('nome');
    const { data: i } = await supabase.from('impegni').select('*').order('data');
    const { data: p } = await supabase.from('piani').select('*');
    const { data: docs } = await supabase.from('documenti').select('*').order('created_at', { ascending: false });
    setDocenti(d || []);
    setImpegni(i || []);
    setTuttiPiani(p || []);
    setDocumenti(docs || []);
  };

  const salvaDocente = async () => {
    const codice = Math.random().toString(36).substring(2, 7).toUpperCase();
    const oreTotali = (80 / 18) * oreSet * (mesi / 9);
    const a = Math.floor(oreTotali / 2);
    const b = Math.ceil(oreTotali / 2);
    const { data } = await supabase.from('docenti').insert([{ nome, codice_accesso: codice, ore_a_dovute: a, ore_b_dovute: b }]).select().single();
    if(data) setLastAction({ type: 'INSERT', table: 'docenti', data: data });
    caricaDati(); setTab('excel');
  };

  const exportExcel = () => {
    let csv = "Docente,Codice,A Dovute,A Pianificate,A Realizzate,B Dovute,B Pianificate,B Realizzate\n";
    docenti.forEach(d => {
      const pD = tuttiPiani.filter(p => p.docente_id === d.id);
      const aP = pD.filter(p => p.tipo === 'A').reduce((s, c) => s + Number(c.ore_effettive), 0);
      const aR = pD.filter(p => p.tipo === 'A' && p.presente).reduce((s, c) => s + Number(c.ore_effettive), 0);
      const bP = pD.filter(p => p.tipo === 'B').reduce((s, c) => s + Number(c.ore_effettive), 0);
      const bR = pD.filter(p => p.tipo === 'B' && p.presente).reduce((s, c) => s + Number(c.ore_effettive), 0);
      csv += `${d.nome},${d.codice_accesso},${d.ore_a_dovute},${aP},${aR},${d.ore_b_dovute},${bP},${bR}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'riepilogo_scuola.csv'; a.click();
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <nav className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-2xl shadow-sm border w-fit font-black text-[10px] uppercase tracking-widest">
        <button onClick={() => {setTab('excel'); setSelectedDocente(null)}} className={`px-5 py-2.5 rounded-xl ${tab === 'excel' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>Riepilogo</button>
        <button onClick={() => setTab('calendario')} className={`px-5 py-2.5 rounded-xl ${tab === 'calendario' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>Appello</button>
        <button onClick={() => setTab('documenti')} className={`px-5 py-2.5 rounded-xl ${tab === 'documenti' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>Documenti</button>
        <button onClick={() => setTab('nuovo_docente')} className={`px-5 py-2.5 rounded-xl ${tab === 'nuovo_docente' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-400'}`}>+ Docente</button>
        <button onClick={() => setTab('nuovo_impegno')} className={`px-5 py-2.5 rounded-xl ${tab === 'nuovo_impegno' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400'}`}>+ Impegno</button>
      </nav>

      {tab === 'excel' && !selectedDocente && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={exportExcel} className="bg-green-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-green-700 shadow-lg">Esporta CSV</button>
          </div>
          <div className="bg-white rounded-3xl shadow-2xl border overflow-x-auto">
            <table className="w-full text-left min-w-[1000px]">
              <thead className="bg-slate-50 text-slate-400 font-black text-[10px] border-b">
                <tr>
                  <th className="p-4">Docente</th>
                  <th className="p-4 text-center text-blue-600">A Dov.</th>
                  <th className="p-4 text-center text-blue-600">A Pian.</th>
                  <th className="p-4 text-center bg-blue-600 text-white">A Real.</th>
                  <th className="p-4 text-center text-indigo-600">B Dov.</th>
                  <th className="p-4 text-center text-indigo-600">B Pian.</th>
                  <th className="p-4 text-center bg-indigo-600 text-white">B Real.</th>
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
                      <td className="p-4 font-bold">{d.nome}</td>
                      <td className="p-4 text-center font-mono border-x">{d.ore_a_dovute}</td>
                      <td className="p-4 text-center font-mono text-blue-600">{aP}</td>
                      <td className="p-4 text-center font-mono bg-blue-50 font-black text-blue-700">{aR}</td>
                      <td className="p-4 text-center font-mono border-x">{d.ore_b_dovute}</td>
                      <td className="p-4 text-center font-mono text-indigo-600">{bP}</td>
                      <td className="p-4 text-center font-mono bg-indigo-50 font-black text-indigo-700">{bR}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => setSelectedDocente(d)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase">Gestisci</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedDocente && (
        <DocentePanel docenteId={selectedDocente.id} docenteNome={selectedDocente.nome} infoDocente={selectedDocente} adminMode={true} setLastAction={setLastAction} />
      )}

      {tab === 'documenti' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border">
            <h2 className="text-xl font-black mb-6 uppercase italic">Carica Link</h2>
            <div className="space-y-4">
              <input type="text" placeholder="TITOLO" className="w-full p-4 bg-slate-50 rounded-xl font-bold" onChange={e => setDocTitolo(e.target.value)} />
              <input type="text" placeholder="URL DRIVE/LINK" className="w-full p-4 bg-slate-50 rounded-xl font-mono text-sm" onChange={e => setDocUrl(e.target.value)} />
              <button onClick={async () => {
                await supabase.from('documenti').insert([{ titolo: docTitolo, url: docUrl }]);
                alert("Pubblicato!"); caricaDati();
              }} className="w-full bg-indigo-600 text-white p-4 rounded-xl font-black uppercase shadow-lg">Carica</button>
            </div>
          </div>
          <div className="space-y-4">
            {documenti.map(d => (
              <div key={d.id} className="bg-white p-6 rounded-2xl border flex justify-between items-center shadow-sm">
                <span className="font-bold text-slate-700">{d.titolo}</span>
                <button onClick={async () => { if(confirm("Elimina?")) { await supabase.from('documenti').delete().eq('id', d.id); caricaDati(); }}} className="text-red-400">Elimina</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'nuovo_impegno' && (
        <div className="max-w-xl mx-auto bg-white p-10 rounded-[3rem] shadow-2xl border text-center">
          <h2 className="text-2xl font-black mb-8 italic uppercase">Nuovo Impegno</h2>
          <div className="space-y-4">
            <input type="text" placeholder="TITOLO RIUNIONE" className="w-full p-5 bg-slate-50 rounded-2xl font-bold uppercase shadow-inner outline-none" onChange={e => setTitoloImp(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
               <input type="date" className="p-5 bg-slate-50 rounded-2xl font-bold" onChange={e => setDataImp(e.target.value)} />
               <input type="number" step="0.5" placeholder="ORE" className="p-5 bg-slate-50 rounded-2xl font-bold shadow-inner" onChange={e => setDurataImp(Number(e.target.value))} />
            </div>
            <div className="flex gap-2">
               <button onClick={() => setCommaImp('A')} className={`flex-1 p-4 rounded-xl font-black text-[10px] ${commaImp === 'A' ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>COMMA A</button>
               <button onClick={() => setCommaImp('B')} className={`flex-1 p-4 rounded-xl font-black text-[10px] ${commaImp === 'B' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>COMMA B</button>
            </div>
            <button onClick={async () => {
              const { data } = await supabase.from('impegni').insert([{ titolo: titoloImp, data: dataImp, durata_max: durataImp, tipo: commaImp }]).select().single();
              if(data) setLastAction({ type: 'INSERT', table: 'impegni', data: data });
              alert("Pubblicato!"); setTab('calendario');
            }} className="w-full bg-slate-900 text-white p-6 rounded-2xl font-black text-lg hover:bg-blue-600 transition-all shadow-xl">Pubblica</button>
          </div>
        </div>
      )}

      {tab === 'calendario' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            {impegni.map(i => (
              <div key={i.id} onClick={() => setSelectedImpegno(i)} className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all ${selectedImpegno?.id === i.id ? 'border-blue-600 bg-blue-50 shadow-xl' : 'bg-white border-transparent hover:border-slate-200 shadow-sm'}`}>
                <h3 className="font-black text-xl">{i.titolo}</h3>
                <p className="text-slate-400 font-bold text-sm">{i.data} • {i.durata_max}h • Comma {i.tipo}</p>
              </div>
            ))}
          </div>
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl border h-fit sticky top-8">
            {selectedImpegno ? (
              <div className="space-y-2">
                <h3 className="text-xl font-black mb-6 uppercase">{selectedImpegno.titolo}</h3>
                {tuttiPiani.filter(p => p.impegno_id === selectedImpegno.id).map(p => {
                  const doc = docenti.find(d => d.id === p.docente_id);
                  return (
                    <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border">
                      <span className="font-bold">{doc?.nome || 'Docente'}</span>
                      <button onClick={async () => {
                         await supabase.from('piani').update({ presente: !p.presente }).eq('id', p.id);
                         caricaDati();
                      }} className={`px-5 py-2 rounded-xl font-black text-[9px] uppercase transition-all ${p.presente ? 'bg-green-600 text-white' : 'bg-white text-slate-400 border'}`}>
                        {p.presente ? 'Presente' : 'Assente'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : <p className="py-20 text-center text-slate-300">Seleziona un evento</p>}
          </div>
        </div>
      )}

      {tab === 'nuovo_docente' && (
        <div className="max-w-xl mx-auto bg-white p-10 rounded-[3rem] shadow-2xl border text-center">
          <h2 className="text-2xl font-black mb-8 italic uppercase">Nuovo Profilo</h2>
          <div className="space-y-4">
            <input type="text" placeholder="NOME E COGNOME" className="w-full p-5 bg-slate-50 rounded-2xl font-bold uppercase shadow-inner outline-none" onChange={e => setNome(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
               <input type="number" placeholder="ORE SETT." className="p-5 bg-slate-50 rounded-2xl font-bold" onChange={e => setOreSet(Number(e.target.value))} />
               <input type="number" placeholder="MESI" className="p-5 bg-slate-50 rounded-2xl font-bold shadow-inner" onChange={e => setMesi(Number(e.target.value))} />
            </div>
            <button onClick={salvaDocente} className="w-full bg-slate-900 text-white p-6 rounded-2xl font-black text-lg hover:bg-blue-600 transition-all shadow-xl">Crea</button>
          </div>
        </div>
      )}
    </div>
  );
}

function DocentePanel({ docenteId, docenteNome, infoDocente, adminMode = false, setLastAction }: any) {
  const [impegni, setImpegni] = useState<any[]>([]);
  const [piani, setPiani] = useState<any[]>([]);
  const [documenti, setDocumenti] = useState<any[]>([]);
  const [view, setView] = useState('pianifica');

  useEffect(() => { caricaTutto(); }, [docenteId]);

  const caricaTutto = async () => {
    const { data: i } = await supabase.from('impegni').select('*').order('data');
    const { data: p } = await supabase.from('piani').select('*').eq('docente_id', docenteId);
    const { data: docs } = await supabase.from('documenti').select('*').order('created_at', { ascending: false });
    setImpegni(i || []);
    setPiani(p || []);
    setDocumenti(docs || []);
  };

  const aP = piani.filter(p => p.tipo === 'A').reduce((s, c) => s + Number(c.ore_effettive), 0);
  const bP = piani.filter(p => p.tipo === 'B').reduce((s, c) => s + Number(c.ore_effettive), 0);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <nav className="flex gap-2 mb-8 bg-white p-2 rounded-2xl border w-fit font-black text-[9px] uppercase mx-auto shadow-sm">
        <button onClick={() => setView('pianifica')} className={`px-6 py-3 rounded-xl ${view === 'pianifica' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Pianifica</button>
        <button onClick={() => setView('mio-piano')} className={`px-6 py-3 rounded-xl ${view === 'mio-piano' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>Mio Piano</button>
        <button onClick={() => setView('docs')} className={`px-6 py-3 rounded-xl ${view === 'docs' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Documenti</button>
      </nav>

      {view === 'pianifica' && (
        <>
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl border mb-10 text-center">
            <h1 className="text-4xl font-black italic uppercase text-slate-800">{docenteNome}</h1>
            <div className="flex justify-center gap-6 mt-6">
               <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 min-w-[120px]">
                 <p className="text-[9px] font-black text-blue-500 uppercase">Dovute A: {infoDocente.ore_a_dovute}h</p>
                 <p className="text-2xl font-black">{aP}h</p>
               </div>
               <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 min-w-[120px]">
                 <p className="text-[9px] font-black text-indigo-500 uppercase">Dovute B: {infoDocente.ore_b_dovute}h</p>
                 <p className="text-2xl font-black">{bP}h</p>
               </div>
            </div>
          </div>
          <div className="space-y-4">
            {impegni.map(i => {
              const isP = piani.find(p => p.impegno_id === i.id);
              return (
                <div key={i.id} className={`bg-white p-6 rounded-[2.5rem] border-2 flex flex-col md:flex-row justify-between items-center gap-4 transition-all ${isP ? 'border-blue-400 shadow-md' : 'border-transparent shadow-sm'}`}>
                  <div className="flex-1">
                    <span className="text-[9px] font-black px-2 py-1 bg-slate-100 rounded uppercase">Comma {i.tipo}</span>
                    <p className="font-black text-xl">{i.titolo}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase">{i.data}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="number" step="0.5" defaultValue={isP ? isP.ore_effettive : i.durata_max} className="w-16 p-3 bg-slate-50 rounded-xl text-center font-black" id={`ore-${i.id}`} />
                    <button onClick={async () => {
                      const val = (document.getElementById(`ore-${i.id}`) as HTMLInputElement).value;
                      if(isP) { await supabase.from('piani').delete().eq('id', isP.id); }
                      else { await supabase.from('piani').insert([{ docente_id: docenteId, impegno_id: i.id, ore_effettive: Number(val), tipo: i.tipo, presente: false }]); }
                      caricaTutto();
                    }} className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-md ${isP ? 'bg-red-500 text-white' : 'bg-slate-900 text-white'}`}>
                      {isP ? 'Rimuovi' : 'Pianifica'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {view === 'mio-piano' && (
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border" id="print-area">
          <div className="flex justify-between items-center mb-8 border-b pb-8">
            <h2 className="text-3xl font-black uppercase italic">Piano di {docenteNome}</h2>
            <button onClick={() => window.print()} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] print:hidden">Salva PDF</button>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black uppercase text-slate-400 border-b">
                <th className="py-4">Attività</th>
                <th className="py-4">Data</th>
                <th className="py-4 text-right">Ore</th>
              </tr>
            </thead>
            <tbody>
              {piani.map(p => {
                const imp = impegni.find(i => i.id === p.impegno_id);
                return (
                  <tr key={p.id} className="border-b">
                    <td className="py-4 font-bold">{imp?.titolo}</td>
                    <td className="py-4 text-slate-500">{imp?.data}</td>
                    <td className="py-4 text-right font-black">{p.ore_effettive}h</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {view === 'docs' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-black italic uppercase mb-6 tracking-tighter">Bacheca Documenti</h2>
          {documenti.map(d => (
            <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer" className="bg-white p-8 rounded-[2rem] border-2 border-transparent hover:border-indigo-600 block transition-all shadow-sm group">
              <div className="flex justify-between items-center">
                <p className="text-indigo-600 font-black text-xl">{d.titolo}</p>
                <div className="bg-indigo-50 p-4 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all text-indigo-600">Apri</div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
