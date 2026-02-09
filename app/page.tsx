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
    const { data } = await supabase.from('docenti').select('*').eq('codice_accesso', loginCode).single();
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
    } catch (e) { alert("Errore undo."); }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md text-center">
          <h1 className="text-3xl font-black text-slate-800 mb-8 italic tracking-tighter uppercase">Scuola Control</h1>
          <input type="text" placeholder="CODICE ACCESSO" className="w-full p-5 border-2 rounded-2xl mb-4 text-center text-2xl uppercase font-mono shadow-inner outline-none focus:border-blue-600 transition-all" 
            onChange={(e) => setLoginCode(e.target.value.toUpperCase())} />
          <button onClick={handleLogin} className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-lg hover:bg-blue-700 shadow-lg transition-all">ACCEDI</button>
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

/* --- DASHBOARD AMMINISTRATORE --- */
function AdminDashboard({ setLastAction }: any) {
  const [tab, setTab] = useState('excel');
  const [docenti, setDocenti] = useState<any[]>([]);
  const [impegni, setImpegni] = useState<any[]>([]);
  const [tuttiPiani, setTuttiPiani] = useState<any[]>([]);
  const [documenti, setDocumenti] = useState<any[]>([]);
  const [selectedDocente, setSelectedDocente] = useState<any>(null);

  // Form States
  const [nome, setNome] = useState('');
  const [oreSet, setOreSet] = useState(18);
  const [mesi, setMesi] = useState(9);
  const [docTitolo, setDocTitolo] = useState('');
  const [docUrl, setDocUrl] = useState('');

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
    // Ripartizione con arrotondamento: se dispari, il resto va al comma B
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
    a.href = url; a.download = 'riepilogo_docenti.csv'; a.click();
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <nav className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-2xl shadow-sm border w-fit font-black text-[10px] uppercase tracking-widest">
        <button onClick={() => {setTab('excel'); setSelectedDocente(null)}} className={`px-5 py-2.5 rounded-xl ${tab === 'excel' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>Dashboard Excel</button>
        <button onClick={() => setTab('calendario')} className={`px-5 py-2.5 rounded-xl ${tab === 'calendario' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>Appello</button>
        <button onClick={() => setTab('documenti')} className={`px-5 py-2.5 rounded-xl ${tab === 'documenti' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>Documenti</button>
        <button onClick={() => setTab('nuovo_docente')} className={`px-5 py-2.5 rounded-xl ${tab === 'nuovo_docente' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-400'}`}>+ Docente</button>
      </nav>

      {tab === 'excel' && !selectedDocente && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={exportExcel} className="bg-green-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-green-700 shadow-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Esporta per Excel / Fogli
            </button>
          </div>
          <div className="bg-white rounded-3xl shadow-2xl border overflow-x-auto">
            <table className="w-full text-left min-w-[1000px]">
              <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-wider border-b">
                <tr>
                  <th className="p-4">Docente</th>
                  <th className="p-4 text-center text-blue-600">A Dovute</th>
                  <th className="p-4 text-center text-blue-600">A Pianif.</th>
                  <th className="p-4 text-center bg-blue-600 text-white">A Realiz.</th>
                  <th className="p-4 text-center text-indigo-600">B Dovute</th>
                  <th className="p-4 text-center text-indigo-600">B Pianif.</th>
                  <th className="p-4 text-center bg-indigo-600 text-white">B Realiz.</th>
                  <th className="p-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {docenti.map(d => {
                  const pD = tuttiPiani.filter(p => p.docente_id === d.id);
                  const aP = pD.filter(p => p.tipo === 'A').reduce((s, c) => s + Number(c.ore_effettive), 0);
                  const aR = pD.filter(p => p.tipo === 'A' && p.presente).reduce((s, c) => s + Number(c.ore_effettive), 0);
                  const bP = pD.filter(p => p.tipo === 'B').reduce((s, c) => s + Number(c.ore_effettive), 0);
                  const bR = pD.filter(p => p.tipo === 'B' && p.presente).reduce((s, c) => s + Number(c.ore_effettive), 0);
                  return (
                    <tr key={d.id} className="hover:bg-slate-50 group">
                      <td className="p-4 font-bold border-r">{d.nome}</td>
                      <td className="p-4 text-center border-r font-mono">{d.ore_a_dovute}</td>
                      <td className="p-4 text-center border-r font-mono text-blue-600">{aP}</td>
                      <td className="p-4 text-center border-r font-mono bg-blue-50 font-black text-blue-700">{aR}</td>
                      <td className="p-4 text-center border-r font-mono">{d.ore_b_dovute}</td>
                      <td className="p-4 text-center border-r font-mono text-indigo-600">{bP}</td>
                      <td className="p-4 text-center font-mono bg-indigo-50 font-black text-indigo-700">{bR}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => setSelectedDocente(d)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-blue-600">Gestisci</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'documenti' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border">
            <h2 className="text-xl font-black mb-6 uppercase italic">Carica Documento</h2>
            <div className="space-y-4">
              <input type="text" placeholder="TITOLO (es. Circolare n.1)" className="w-full p-4 bg-slate-50 rounded-xl font-bold" onChange={e => setDocTitolo(e.target.value)} />
              <input type="text" placeholder="URL LINK (Drive, Dropbox, ecc.)" className="w-full p-4 bg-slate-50 rounded-xl font-mono text-sm" onChange={e => setDocUrl(e.target.value)} />
              <button onClick={async () => {
                await supabase.from('documenti').insert([{ titolo: docTitolo, url: docUrl }]);
                alert("Caricato!"); caricaDati();
              }} className="w-full bg-indigo-600 text-white p-4 rounded-xl font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg">Pubblica Documento</button>
            </div>
          </div>
          <div className="space-y-4">
            {documenti.map(d => (
              <div key={d.id} className="bg-white p-6 rounded-2xl border flex justify-between items-center shadow-sm">
                <span className="font-bold text-slate-700">{d.titolo}</span>
                <button onClick={async () => { if(confirm("Elimina?")) { await supabase.from('documenti').delete().eq('id', d.id); caricaDati(); }}} className="text-red-400 hover:text-red-600">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedDocente && (
        <div>
          <button onClick={() => setSelectedDocente(null)} className="mb-6 bg-slate-200 px-6 py-2 rounded-xl font-black text-[10px] uppercase"> ← Esci dalla gestione </button>
          <DocentePanel docenteId={selectedDocente.id} docenteNome={selectedDocente.nome} infoDocente={selectedDocente} adminMode={true} setLastAction={setLastAction} />
        </div>
      )}
      
      {tab === 'nuovo_docente' && (
        <div className="max-w-xl mx-auto bg-white p-10 rounded-[3rem] shadow-2xl border">
          <h2 className="text-2xl font-black mb-8 italic uppercase text-center">Nuovo Profilo</h2>
          <div className="space-y-4">
            <input type="text" placeholder="NOME E COGNOME" className="w-full p-5 bg-slate-50 rounded-2xl font-bold uppercase shadow-inner outline-none" onChange={e => setNome(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
               <input type="number" placeholder="ORE SETT." className="p-5 bg-slate-50 rounded-2xl font-bold text-center" onChange={e => setOreSet(Number(e.target.value))} />
               <input type="number" placeholder="MESI SERV." className="p-5 bg-slate-50 rounded-2xl font-bold text-center" onChange={e => setMesi(Number(e.target.value))} />
            </div>
            <button onClick={salvaDocente} className="w-full bg-slate-900 text-white p-6 rounded-2xl font-black text-lg hover:bg-blue-600 transition-all shadow-xl uppercase">Crea Docente</button>
            <p className="text-[10px] text-slate-400 text-center uppercase font-bold">Il sistema ripartirà le ore automaticamente tra Comma A e Comma B</p>
          </div>
        </div>
      )}

      {/* Sezione Appello (Calendario) inclusa come nelle precedenti versioni... */}
      {tab === 'calendario' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-black italic uppercase mb-6 tracking-tighter">Eventi & Appello</h2>
            {impegni.map(i => (
              <div key={i.id} onClick={() => setSelectedImpegno(i)} className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all ${selectedImpegno?.id === i.id ? 'border-blue-600 bg-blue-50 shadow-xl' : 'bg-white border-transparent hover:border-slate-200 shadow-sm'}`}>
                <span className={`text-[9px] font-black px-2 py-1 rounded uppercase ${i.tipo === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>Comma {i.tipo}</span>
                <h3 className="font-black text-xl mt-1">{i.titolo}</h3>
                <p className="text-slate-400 font-bold text-sm">{i.data} • {i.durata_max}h</p>
              </div>
            ))}
          </div>
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl border h-fit sticky top-8">
            {selectedImpegno ? (
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-800 mb-6 uppercase italic">{selectedImpegno.titolo}</h3>
                {tuttiPiani.filter(p => p.impegno_id === selectedImpegno.id).map(p => {
                  const doc = docenti.find(d => d.id === p.docente_id);
                  return (
                    <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="font-bold text-slate-700">{doc?.nome || 'Docente'}</span>
                      <button onClick={async () => {
                         await supabase.from('piani').update({ presente: !p.presente }).eq('id', p.id);
                         caricaDati();
                      }} className={`px-5 py-2 rounded-xl font-black text-[9px] uppercase shadow-sm transition-all ${p.presente ? 'bg-green-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
                        {p.presente ? 'Presente ✓' : 'Segna Presente'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : <p className="py-20 text-center text-slate-300 font-black uppercase text-[10px]">Seleziona un evento per l'appello</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/* --- PANNELLO DOCENTE --- */
function DocentePanel({ docenteId, docenteNome, infoDocente, adminMode = false, setLastAction }: any) {
  const [impegni, setImpegni] = useState<any[]>([]);
  const [piani, setPiani] = useState<any[]>([]);
  const [documenti, setDocumenti] = useState<any[]>([]);
  const [view, setView] = useState('pianificazione'); // 'pianificazione' | 'riepilogo' | 'documenti'

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
      {/* Menu Docente */}
      <nav className="flex gap-2 mb-8 bg-white p-2 rounded-2xl border w-fit font-black text-[9px] uppercase tracking-tighter mx-auto shadow-sm">
        <button onClick={() => setView('pianificazione')} className={`px-6 py-3 rounded-xl ${view === 'pianificazione' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Pianifica</button>
        <button onClick={() => setView('riepilogo')} className={`px-6 py-3 rounded-xl ${view === 'riepilogo' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>Mio Piano</button>
        <button onClick={() => setView('documenti')} className={`px-6 py-3 rounded-xl ${view === 'documenti' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Documenti</button>
      </nav>

      {view === 'pianificazione' && (
        <>
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl border mb-10 text-center">
            <h1 className="text-4xl font-black italic uppercase text-slate-800 tracking-tighter">{docenteNome}</h1>
            <div className="flex justify-center gap-6 mt-6">
               <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 min-w-[120px]">
                 <p className="text-[9px] font-black text-blue-500 uppercase">A Dovute: {infoDocente.ore_a_dovute}h</p>
                 <p className="text-2xl font-black">{aP}h</p>
               </div>
               <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 min-w-[120px]">
                 <p className="text-[9px] font-black text-indigo-500 uppercase">B Dovute: {infoDocente.ore_b_dovute}h</p>
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
                    <p className="font-black text-xl text-slate-800">{i.titolo}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase">{i.data}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="number" step="0.5" defaultValue={isP ? isP.ore_effettive : i.durata_max} className="w-16 p-3 bg-slate-50 rounded-xl text-center font-black" id={`ore-${i.id}`} />
                    <button onClick={async () => {
                      const val = (document.getElementById(`ore-${i.id}`) as HTMLInputElement).value;
                      if(isP) { await supabase.from('piani').delete().eq('id', isP.id); }
                      else { await supabase.from('piani').insert([{ docente_id: docenteId, impegno_id: i.id, ore_effettive: Number(val), tipo: i.tipo }]); }
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

      {view === 'riepilogo' && (
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border print:shadow-none print:border-none" id="piano-stampa">
          <div className="flex justify-between items-center mb-8 border-b pb-8">
            <div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">Piano Attività</h2>
              <p className="font-bold text-slate-400 uppercase text-xs">{docenteNome}</p>
            </div>
            <button onClick={() => window.print()} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase print:hidden">Salva in PDF</button>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black uppercase text-slate-400 border-b">
                <th className="py-4">Attività</th>
                <th className="py-4">Data</th>
                <th className="py-4 text-center">Comma</th>
                <th className="py-4 text-right">Ore</th>
              </tr>
            </thead>
            <tbody>
              {piani.map(p => {
                const imp = impegni.find(i => i.id === p.impegno_id);
                return (
                  <tr key={p.id} className="border-b">
                    <td className="py-4 font-bold">{imp?.titolo}</td>
                    <td className="py-4 text-slate-500 font-mono text-sm">{imp?.data}</td>
                    <td className="py-4 text-center"><span className="bg-slate-100 px-2 py-1 rounded text-[10px] font-black">{p.tipo}</span></td>
                    <td className="py-4 text-right font-black">{p.ore_effettive}h</td>
                  </tr>
                );
              })}
              <tr className="bg-slate-50 font-black">
                <td colSpan={3} className="p-4 uppercase text-[10px]">Totale Pianificato</td>
                <td className="p-4 text-right text-xl">{aP + bP}h</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-10 text-[9px] text-slate-300 uppercase italic">Documento generato da Scuola Control - 2026</p>
        </div>
      )}

      {view === 'documenti' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-black italic uppercase mb-6 tracking-tighter">Bacheca Documenti</h2>
          {documenti.map(d => (
            <a key={d.id} href={d.url} target="_blank" className="bg-white p-8 rounded-[2rem] border-2 border-transparent hover:border-indigo-600 block transition-all shadow-sm group">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-indigo-600 font-black text-xl">{d.titolo}</p>
                  <p className="text-xs text-slate-400 font-bold uppercase mt-1">Caricato il {new Date(d.created_at).toLocaleDateString()}</p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all text-indigo-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </div>
            </a>
          ))}
          {documenti.length === 0 && <p className="py-20 text-center text-slate-300 font-bold uppercase">Nessun documento caricato.</p>}
        </div>
      )}
    </div>
  );
}
