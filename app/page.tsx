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
    const code = loginCode.trim().toUpperCase();
    if (code === 'ADMIN123') { 
      setUser({ id: 'admin', nome: 'Amministratore', role: 'admin' }); 
      return; 
    }
    const { data } = await supabase.from('docenti').select('*').eq('codice_accesso', code).single();
    if (data) setUser(data);
    else alert("Codice errato o docente non trovato.");
  };

  const handleLogout = () => { setUser(null); setLoginCode(''); };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 text-slate-900 font-sans">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md text-center border border-white">
          <h1 className="text-4xl font-black mb-8 italic tracking-tighter uppercase text-blue-600">Scuola Control</h1>
          <input type="text" placeholder="CODICE ACCESSO" className="w-full p-5 border-2 rounded-2xl mb-4 text-center text-2xl uppercase font-mono shadow-inner outline-none focus:border-blue-600 transition-all" 
            value={loginCode} onChange={(e) => setLoginCode(e.target.value)} />
          <button onClick={handleLogin} className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-lg hover:bg-blue-700 shadow-lg transition-all uppercase tracking-widest">Entra</button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-800 pb-20">
      <button onClick={handleLogout} className="fixed top-4 right-4 bg-white/80 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-sm border z-[60] hover:text-red-600 transition-all">Esci</button>
      {user.role === 'admin' ? <AdminDashboard key={`adm-${refreshKey}`} setLastAction={setLastAction} /> : <DocentePanel key={`doc-${refreshKey}`} docenteId={user.id} docenteNome={user.nome} infoDocente={user} setLastAction={setLastAction} />}
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
  const [selectedImpegno, setSelectedImpegno] = useState<any>(null);

  // Form Nuovo Docente (Dati Ripristinati)
  const [nome, setNome] = useState('');
  const [oreSettimanali, setOreSettimanali] = useState(18);
  const [mesiServizio, setMesiServizio] = useState(9);
  const [isCompletamento, setIsCompletamento] = useState(false);

  // Form Altri
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
    setDocenti(d || []); setImpegni(i || []); setTuttiPiani(p || []); setDocumenti(docs || []);
  };

  const salvaDocente = async () => {
    const codice = Math.random().toString(36).substring(2, 7).toUpperCase();
    
    // Logica di calcolo proporzionale
    // Se è completamento (es. 10h su 18h), le ore 80 diventano proporzionali.
    let baseOre = isCompletamento ? (80 / 18) * oreSettimanali : 80;
    
    // Proporzione sui mesi di servizio
    let oreFinali = baseOre * (mesiServizio / 9);

    // Ripartizione intelligente (Se dispari, il resto va a B)
    const aDovute = Math.floor(oreFinali / 2);
    const bDovute = Math.ceil(oreFinali / 2);

    const { data } = await supabase.from('docenti').insert([{ 
      nome, 
      codice_accesso: codice, 
      ore_a_dovute: aDovute, 
      ore_b_dovute: bDovute,
      is_completamento: isCompletamento,
      ore_settimanali: oreSettimanali
    }]).select().single();
    
    if(data) { alert(`Docente Creato! Codice: ${codice}`); caricaDati(); setTab('excel'); }
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
    const a = document.createElement('a'); a.href = url; a.download = 'riepilogo_docenti.csv'; a.click();
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <nav className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-2xl shadow-sm border w-fit font-black text-[10px] uppercase mx-auto md:mx-0">
        <button onClick={() => {setTab('excel'); setSelectedDocente(null)}} className={`px-5 py-2.5 rounded-xl ${tab === 'excel' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>Riepilogo</button>
        <button onClick={() => setTab('calendario')} className={`px-5 py-2.5 rounded-xl ${tab === 'calendario' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Appello</button>
        <button onClick={() => setTab('documenti')} className={`px-5 py-2.5 rounded-xl ${tab === 'documenti' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Documenti</button>
        <button onClick={() => setTab('nuovo_docente')} className={`px-5 py-2.5 rounded-xl ${tab === 'nuovo_docente' ? 'bg-green-600 text-white' : 'text-slate-400'}`}>+ Docente</button>
        <button onClick={() => setTab('nuovo_impegno')} className={`px-5 py-2.5 rounded-xl ${tab === 'nuovo_impegno' ? 'bg-orange-600 text-white' : 'text-slate-400'}`}>+ Impegno</button>
      </nav>

      {tab === 'excel' && !selectedDocente && (
        <div className="space-y-4">
          <div className="flex justify-end"><button onClick={exportExcel} className="bg-green-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase">Esporta Excel/Fogli</button></div>
          <div className="bg-white rounded-3xl shadow-2xl border overflow-x-auto">
            <table className="w-full text-left min-w-[1000px]">
              <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase border-b">
                <tr>
                  <th className="p-4">Docente</th>
                  <th className="p-4 text-center">A Dov.</th><th className="p-4 text-center">A Real.</th>
                  <th className="p-4 text-center">B Dov.</th><th className="p-4 text-center">B Real.</th>
                  <th className="p-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docenti.map(d => {
                   const pD = tuttiPiani.filter(p => p.docente_id === d.id);
                   const aR = pD.filter(p => p.tipo === 'A' && p.presente).reduce((s, c) => s + Number(c.ore_effettive), 0);
                   const bR = pD.filter(p => p.tipo === 'B' && p.presente).reduce((s, c) => s + Number(c.ore_effettive), 0);
                   return (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="p-4 font-bold">{d.nome}</td>
                      <td className="p-4 text-center font-mono">{d.ore_a_dovute}</td>
                      <td className="p-4 text-center font-mono bg-blue-50 text-blue-700 font-black">{aR}</td>
                      <td className="p-4 text-center font-mono">{d.ore_b_dovute}</td>
                      <td className="p-4 text-center font-mono bg-indigo-50 text-indigo-700 font-black">{bR}</td>
                      <td className="p-4 text-right"><button onClick={() => setSelectedDocente(d)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase">Gestisci</button></td>
                    </tr>
                   )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedDocente && (
        <div>
          <button onClick={() => setSelectedDocente(null)} className="mb-6 bg-slate-200 px-4 py-2 rounded-lg font-black text-[10px] uppercase">← Chiudi Gestione</button>
          <DocentePanel docenteId={selectedDocente.id} docenteNome={selectedDocente.nome} infoDocente={selectedDocente} adminMode={true} />
        </div>
      )}

      {tab === 'nuovo_docente' && (
        <div className="max-w-xl mx-auto bg-white p-10 rounded-[3rem] shadow-2xl border">
          <h2 className="text-2xl font-black mb-8 italic uppercase text-green-600 text-center">Configura Docente</h2>
          <div className="space-y-4">
            <input type="text" placeholder="NOME E COGNOME" className="w-full p-5 bg-slate-50 rounded-2xl font-bold uppercase border" onChange={e => setNome(e.target.value)} />
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border">
              <input type="checkbox" id="comp" className="w-6 h-6" checked={isCompletamento} onChange={e => setIsCompletamento(e.target.checked)} />
              <label htmlFor="comp" className="font-black text-xs uppercase text-slate-500">Completamento / Spezzone (Proporzionale)</label>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Ore in questa scuola</label>
                 <input type="number" placeholder="18" className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-center border" onChange={e => setOreSettimanali(Number(e.target.value))} />
               </div>
               <div>
                 <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Mesi di contratto</label>
                 <input type="number" placeholder="9" className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-center border" onChange={e => setMesiServizio(Number(e.target.value))} />
               </div>
            </div>
            <button onClick={salvaDocente} className="w-full bg-slate-900 text-white p-6 rounded-2xl font-black text-lg hover:bg-green-600 transition-all shadow-xl uppercase">Crea Profilo</button>
          </div>
        </div>
      )}

      {tab === 'documenti' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border">
            <h2 className="text-xl font-black mb-6 uppercase italic text-indigo-600">Carica Documento</h2>
            <div className="space-y-4">
              <input type="text" placeholder="TITOLO" className="w-full p-4 bg-slate-50 rounded-xl font-bold border" onChange={e => setDocTitolo(e.target.value)} />
              <input type="text" placeholder="URL DRIVE / DROPBOX" className="w-full p-4 bg-slate-50 rounded-xl font-mono text-sm border" onChange={e => setDocUrl(e.target.value)} />
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
                <button onClick={async () => { if(confirm("Elimina?")) { await supabase.from('documenti').delete().eq('id', d.id); caricaDati(); }}} className="text-red-400 uppercase text-[10px] font-black">Elimina</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'nuovo_impegno' && (
        <div className="max-w-xl mx-auto bg-white p-10 rounded-[3rem] shadow-2xl border">
          <h2 className="text-2xl font-black mb-8 italic uppercase text-orange-600 text-center">Nuovo Impegno</h2>
          <div className="space-y-4">
            <input type="text" placeholder="TITOLO INCONTRO" className="w-full p-5 bg-slate-50 rounded-2xl font-bold uppercase border" onChange={e => setTitoloImp(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
               <input type="date" className="p-5 bg-slate-50 rounded-2xl font-bold border" onChange={e => setDataImp(e.target.value)} />
               <input type="number" step="0.5" placeholder="ORE" className="p-5 bg-slate-50 rounded-2xl font-bold border" onChange={e => setDurataImp(Number(e.target.value))} />
            </div>
            <div className="flex gap-2">
               <button onClick={() => setCommaImp('A')} className={`flex-1 p-4 rounded-xl font-black text-[10px] transition-all ${commaImp === 'A' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>COMMA A</button>
               <button onClick={() => setCommaImp('B')} className={`flex-1 p-4 rounded-xl font-black text-[10px] transition-all ${commaImp === 'B' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>COMMA B</button>
            </div>
            <button onClick={async () => {
              await supabase.from('impegni').insert([{ titolo: titoloImp, data: dataImp, durata_max: durataImp, tipo: commaImp }]);
              alert("Pubblicato!"); setTab('calendario');
            }} className="w-full bg-slate-900 text-white p-6 rounded-2xl font-black text-lg hover:bg-blue-600 transition-all shadow-xl uppercase">Salva Impegno</button>
          </div>
        </div>
      )}

      {tab === 'calendario' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-black italic uppercase mb-4 tracking-tighter">Eventi Pubblicati</h2>
            {impegni.map(i => (
              <div key={i.id} onClick={() => setSelectedImpegno(i)} className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all ${selectedImpegno?.id === i.id ? 'border-blue-600 bg-blue-50 shadow-xl' : 'bg-white border-transparent hover:border-slate-200 shadow-sm'}`}>
                <span className={`text-[9px] font-black px-2 py-1 rounded uppercase ${i.tipo === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>Comma {i.tipo}</span>
                <h3 className="font-black text-xl mt-1">{i.titolo}</h3>
                <p className="text-slate-400 font-bold text-sm uppercase">{i.data} • {i.durata_max}h</p>
              </div>
            ))}
          </div>
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl border h-fit sticky top-8 text-center">
            {selectedImpegno ? (
              <div className="space-y-2">
                <h3 className="text-xl font-black mb-6 uppercase text-blue-600">{selectedImpegno.titolo} - Appello</h3>
                {tuttiPiani.filter(p => p.impegno_id === selectedImpegno.id).map(p => {
                  const doc = docenti.find(d => d.id === p.docente_id);
                  return (
                    <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border mb-2">
                      <span className="font-bold text-slate-700 uppercase text-[10px]">{doc?.nome}</span>
                      <button onClick={async () => {
                         await supabase.from('piani').update({ presente: !p.presente }).eq('id', p.id);
                         caricaDati();
                      }} className={`px-5 py-2 rounded-xl font-black text-[9px] uppercase shadow-sm transition-all ${p.presente ? 'bg-green-600 text-white' : 'bg-white text-slate-400 border'}`}>
                        {p.presente ? 'Presente ✓' : 'Assente'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : <p className="py-20 text-slate-300 font-black uppercase text-xs">Seleziona un evento per l'appello</p>}
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
  const [documenti, setDocumenti] = useState<any[]>([]);
  const [view, setView] = useState('pianifica');

  useEffect(() => { caricaTutto(); }, [docenteId]);

  const caricaTutto = async () => {
    const { data: i } = await supabase.from('impegni').select('*').order('data');
    const { data: p } = await supabase.from('piani').select('*').eq('docente_id', docenteId);
    const { data: docs } = await supabase.from('documenti').select('*').order('created_at', { ascending: false });
    setImpegni(i || []); setPiani(p || []); setDocumenti(docs || []);
  };

  const aP = piani.filter(p => p.tipo === 'A').reduce((s, c) => s + Number(c.ore_effettive), 0);
  const bP = piani.filter(p => p.tipo === 'B').reduce((s, c) => s + Number(c.ore_effettive), 0);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <nav className="flex gap-2 mb-8 bg-white p-2 rounded-2xl border w-fit font-black text-[9px] uppercase mx-auto shadow-sm sticky top-4 z-50">
        <button onClick={() => setView('pianifica')} className={`px-6 py-3 rounded-xl transition-all ${view === 'pianifica' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Pianifica</button>
        <button onClick={() => setView('mio-piano')} className={`px-6 py-3 rounded-xl transition-all ${view === 'mio-piano' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>Mio Piano</button>
        <button onClick={() => setView('docs')} className={`px-6 py-3 rounded-xl transition-all ${view === 'docs' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Documenti</button>
      </nav>

      {view === 'pianifica' && (
        <div className="space-y-6">
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl border text-center">
            <h1 className="text-4xl font-black italic uppercase text-slate-800 tracking-tighter">{docenteNome}</h1>
            <div className="flex justify-center gap-6 mt-6">
               <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 min-w-[120px]">
                 <p className="text-[9px] font-black text-blue-500 uppercase">Dovute A: {infoDocente.ore_a_dovute}h</p>
                 <p className="text-2xl font-black text-blue-700">{aP}h</p>
               </div>
               <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 min-w-[120px]">
                 <p className="text-[9px] font-black text-indigo-500 uppercase">Dovute B: {infoDocente.ore_b_dovute}h</p>
                 <p className="text-2xl font-black text-indigo-700">{bP}h</p>
               </div>
            </div>
          </div>
          <div className="space-y-4">
            {impegni.map(i => {
              const isP = piani.find(p => p.impegno_id === i.id);
              return (
                <div key={i.id} className={`bg-white p-6 rounded-[2.5rem] border-2 flex flex-col md:flex-row justify-between items-center gap-4 transition-all ${isP ? 'border-blue-400 shadow-md' : 'border-transparent shadow-sm'}`}>
                  <div className="flex-1">
                    <span className={`text-[9px] font-black px-2 py-1 rounded uppercase ${i.tipo === 'A' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>Comma {i.tipo}</span>
                    <p className="font-black text-xl text-slate-800 mt-1">{i.titolo}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase">{i.data}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="number" step="0.5" defaultValue={isP ? isP.ore_effettive : i.durata_max} className="w-16 p-3 bg-slate-50 border rounded-xl text-center font-black" id={`ore-${i.id}`} />
                    <button onClick={async () => {
                      const input = document.getElementById(`ore-${i.id}`) as HTMLInputElement;
                      if(isP) { await supabase.from('piani').delete().eq('id', isP.id); }
                      else { await supabase.from('piani').insert([{ docente_id: docenteId, impegno_id: i.id, ore_effettive: Number(input.value), tipo: i.tipo, presente: false }]); }
                      caricaTutto();
                    }} className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-md transition-all active:scale-95 ${isP ? 'bg-red-500 text-white' : 'bg-slate-900 text-white hover:bg-blue-600'}`}>
                      {isP ? 'Rimuovi' : 'Pianifica'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === 'mio-piano' && (
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border" id="print-area">
          <div className="flex justify-between items-center mb-8 border-b pb-8">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">Piano di {docenteNome}</h2>
            <button onClick={() => window.print()} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase print:hidden shadow-lg">Salva PDF</button>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black uppercase text-slate-400 border-b">
                <th className="py-4">Attività</th>
                <th className="py-4 text-center">Data</th>
                <th className="py-4 text-right">Ore</th>
              </tr>
            </thead>
            <tbody>
              {piani.map(p => {
                const imp = impegni.find(i => i.id === p.impegno_id);
                return (
                  <tr key={p.id} className="border-b">
                    <td className="py-4 font-bold text-slate-700 uppercase text-xs">{imp?.titolo}</td>
                    <td className="py-4 text-center text-slate-500 font-mono text-xs">{imp?.data}</td>
                    <td className="py-4 text-right font-black">{p.ore_effettive}h</td>
                  </tr>
                );
              })}
              <tr className="bg-slate-50">
                <td colSpan={2} className="p-4 font-black uppercase text-xs">Totale Ore Pianificate</td>
                <td className="p-4 text-right font-black text-xl text-blue-600">{aP + bP}h</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-20 flex justify-between items-end invisible print:visible">
             <div className="border-t border-slate-300 pt-2 w-48 text-center text-[10px] font-bold uppercase">Firma Docente</div>
             <div className="border-t border-slate-300 pt-2 w-48 text-center text-[10px] font-bold uppercase">Firma Dirigente</div>
          </div>
        </div>
      )}

      {view === 'docs' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-black italic uppercase mb-6 tracking-tighter text-center">Bacheca Documenti</h2>
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
