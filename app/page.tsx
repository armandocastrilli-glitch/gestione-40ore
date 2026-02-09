"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AppGestionaleScuola() {
  const [user, setUser] = useState<any>(null);
  const [loginCode, setLoginCode] = useState('');
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

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 text-slate-900">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md text-center border">
          <h1 className="text-4xl font-black mb-8 italic tracking-tighter uppercase text-blue-600">Scuola Control Pro</h1>
          <input type="text" placeholder="CODICE ACCESSO" className="w-full p-5 border-2 rounded-2xl mb-4 text-center text-2xl uppercase font-mono shadow-inner outline-none focus:border-blue-600 transition-all" 
            value={loginCode} onChange={(e) => setLoginCode(e.target.value)} />
          <button onClick={handleLogin} className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-lg hover:bg-blue-700 shadow-lg transition-all uppercase tracking-widest">Accedi al Sistema</button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-800 pb-20">
      <button onClick={() => {setUser(null); setLoginCode('');}} className="fixed top-4 right-4 bg-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-sm border z-[60] hover:text-red-600 transition-all">Logout</button>
      {user.role === 'admin' ? <AdminDashboard key={refreshKey} /> : <DocentePanel docenteId={user.id} docenteNome={user.nome} infoDocente={user} />}
    </div>
  );
}

/* --- DASHBOARD AMMINISTRATORE (VERSIONE COMPLESSA) --- */
function AdminDashboard() {
  const [tab, setTab] = useState('riepilogo');
  const [docenti, setDocenti] = useState<any[]>([]);
  const [impegni, setImpegni] = useState<any[]>([]);
  const [tuttiPiani, setTuttiPiani] = useState<any[]>([]);
  const [documenti, setDocumenti] = useState<any[]>([]);
  const [selectedImpegno, setSelectedImpegno] = useState<any>(null);

  // Form Docente
  const [nome, setNome] = useState('');
  const [tipoContratto, setTipoContratto] = useState('INTERA'); // INTERA, COMPLETAMENTO, SPEZZONE
  const [oreSettimanali, setOreSettimanali] = useState(18);
  const [mesiServizio, setMesiServizio] = useState(9);

  // Form Impegno/Documento
  const [titoloImp, setTitoloImp] = useState('');
  const [dataImp, setDataImp] = useState('');
  const [durataImp, setDurataImp] = useState(2);
  const [commaImp, setCommaImp] = useState('A');
  const [docTitolo, setDocTitolo] = useState('');
  const [docUrl, setDocUrl] = useState('');

  useEffect(() => { caricaDati(); }, [tab]);

  const caricaDati = async () => {
    const { data: d } = await supabase.from('docenti').select('*').order('nome');
    const { data: i } = await supabase.from('impegni').select('*').order('data');
    const { data: p } = await supabase.from('piani').select('*');
    const { data: docs } = await supabase.from('documenti').select('*').order('created_at', { ascending: false });
    setDocenti(d || []); setImpegni(i || []); setTuttiPiani(p || []); setDocumenti(docs || []);
  };

  const eliminaDocente = async (id: string) => {
    if (confirm("Sei sicuro? Questo eliminerà anche tutti i piani attività associati al docente.")) {
      await supabase.from('piani').delete().eq('docente_id', id);
      await supabase.from('docenti').delete().eq('id', id);
      caricaDati();
    }
  };

  const salvaDocente = async () => {
    const codice = Math.random().toString(36).substring(2, 7).toUpperCase();
    let baseOre = 80;
    
    if (tipoContratto === 'COMPLETAMENTO' || tipoContratto === 'SPEZZONE') {
      baseOre = (80 / 18) * oreSettimanali;
    }

    const oreFinali = baseOre * (mesiServizio / 9);
    const aDovute = Math.floor(oreFinali / 2);
    const bDovute = Math.ceil(oreFinali / 2);

    await supabase.from('docenti').insert([{ 
      nome, codice_accesso: codice, ore_a_dovute: aDovute, ore_b_dovute: bDovute,
      contratto: tipoContratto, ore_settimanali: oreSettimanali, mesi: mesiServizio
    }]);
    
    alert(`Docente creato. Codice: ${codice}`);
    setTab('riepilogo');
  };

  return (
    <div className="max-w-7xl mx-auto p-8">
      <nav className="flex flex-wrap gap-3 mb-10 bg-white p-3 rounded-3xl shadow-sm border w-fit font-black text-[11px] uppercase mx-auto md:mx-0">
        <button onClick={() => setTab('riepilogo')} className={`px-6 py-3 rounded-2xl transition-all ${tab === 'riepilogo' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>Gestione Docenti</button>
        <button onClick={() => setTab('calendario')} className={`px-6 py-3 rounded-2xl transition-all ${tab === 'calendario' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>Appello & Eventi</button>
        <button onClick={() => setTab('documenti')} className={`px-6 py-3 rounded-2xl transition-all ${tab === 'documenti' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>Bacheca Link</button>
        <button onClick={() => setTab('nuovo_docente')} className={`px-6 py-3 rounded-2xl transition-all ${tab === 'nuovo_docente' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-400'}`}>+ Registra Docente</button>
        <button onClick={() => setTab('nuovo_impegno')} className={`px-6 py-3 rounded-2xl transition-all ${tab === 'nuovo_impegno' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400'}`}>+ Crea Impegno</button>
      </nav>

      {tab === 'riepilogo' && (
        <div className="bg-white rounded-[2.5rem] shadow-2xl border overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest border-b">
              <tr>
                <th className="p-6">Docente / Stato</th>
                <th className="p-6 text-center">Codice</th>
                <th className="p-6 text-center bg-blue-50 text-blue-600">A (Dov/Real)</th>
                <th className="p-6 text-center bg-indigo-50 text-indigo-600">B (Dov/Real)</th>
                <th className="p-6 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {docenti.map(d => {
                const pD = tuttiPiani.filter(p => p.docente_id === d.id);
                const aR = pD.filter(p => p.tipo === 'A' && p.presente).reduce((s, c) => s + Number(c.ore_effettive), 0);
                const bR = pD.filter(p => p.tipo === 'B' && p.presente).reduce((s, c) => s + Number(c.ore_effettive), 0);
                return (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-6">
                      <p className="font-black text-slate-800 uppercase">{d.nome}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{d.contratto} - {d.ore_settimanali}h - {d.mesi} mesi</p>
                    </td>
                    <td className="p-6 text-center font-mono font-bold text-blue-600 bg-slate-50/50">{d.codice_accesso}</td>
                    <td className="p-6 text-center font-black">
                      <span className="text-slate-300">{d.ore_a_dovute}</span> <span className="text-blue-600">/ {aR}</span>
                    </td>
                    <td className="p-6 text-center font-black">
                      <span className="text-slate-300">{d.ore_b_dovute}</span> <span className="text-indigo-600">/ {bR}</span>
                    </td>
                    <td className="p-6 text-right">
                      <button onClick={() => eliminaDocente(d.id)} className="text-red-400 hover:text-red-700 font-black text-[10px] uppercase p-2">Elimina</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'nuovo_docente' && (
        <div className="max-w-2xl mx-auto bg-white p-12 rounded-[3rem] shadow-2xl border">
          <h2 className="text-3xl font-black mb-10 text-center uppercase italic text-green-600 tracking-tighter">Anagrafica Docente</h2>
          <div className="space-y-6">
            <div>
              <label className="text-[11px] font-black uppercase text-slate-400 mb-2 block ml-2">Nome Completo</label>
              <input type="text" placeholder="ES. MARIO ROSSI" className="w-full p-5 bg-slate-50 rounded-2xl font-bold uppercase border focus:border-green-500 outline-none" onChange={e => setNome(e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] font-black uppercase text-slate-400 mb-2 block ml-2">Tipologia Contratto</label>
              <select className="w-full p-5 bg-slate-50 rounded-2xl font-bold border outline-none appearance-none cursor-pointer" 
                value={tipoContratto} onChange={e => setTipoContratto(e.target.value)}>
                <option value="INTERA">CATTEDRA INTERA (18H)</option>
                <option value="COMPLETAMENTO">COMPLETAMENTO ESTERNO</option>
                <option value="SPEZZONE">SPEZZONE ORARIO</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-[11px] font-black uppercase text-slate-400 mb-2 block ml-2">Ore in questa scuola</label>
                <input type="number" step="0.5" className="w-full p-5 bg-slate-50 rounded-2xl font-bold border" value={oreSettimanali} onChange={e => setOreSettimanali(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-[11px] font-black uppercase text-slate-400 mb-2 block ml-2">Mesi di servizio</label>
                <input type="number" className="w-full p-5 bg-slate-50 rounded-2xl font-bold border" value={mesiServizio} onChange={e => setMesiServizio(Number(e.target.value))} />
              </div>
            </div>
            <button onClick={salvaDocente} className="w-full bg-slate-900 text-white p-6 rounded-2xl font-black text-xl hover:bg-green-600 transition-all shadow-xl uppercase mt-4">Registra Docente</button>
          </div>
        </div>
      )}

      {tab === 'nuovo_impegno' && (
        <div className="max-w-2xl mx-auto bg-white p-12 rounded-[3rem] shadow-2xl border animate-in zoom-in duration-300">
          <h2 className="text-3xl font-black mb-10 text-center uppercase italic text-orange-600 tracking-tighter">Nuovo Impegno Collegiale</h2>
          <div className="space-y-6">
            <input type="text" placeholder="TITOLO RIUNIONE (ES. COLLEGIO DOCENTI)" className="w-full p-5 bg-slate-50 rounded-2xl font-bold uppercase border outline-none focus:border-orange-500" onChange={e => setTitoloImp(e.target.value)} />
            <div className="grid grid-cols-2 gap-6">
               <input type="date" className="p-5 bg-slate-50 rounded-2xl font-bold border outline-none" onChange={e => setDataImp(e.target.value)} />
               <input type="number" step="0.5" placeholder="ORE PREVISTE" className="p-5 bg-slate-50 rounded-2xl font-bold border outline-none" onChange={e => setDurataImp(Number(e.target.value))} />
            </div>
            <div className="flex gap-4">
               <button onClick={() => setCommaImp('A')} className={`flex-1 p-5 rounded-2xl font-black transition-all border-2 ${commaImp === 'A' ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>COMMA A (40H)</button>
               <button onClick={() => setCommaImp('B')} className={`flex-1 p-5 rounded-2xl font-black transition-all border-2 ${commaImp === 'B' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>COMMA B (40H)</button>
            </div>
            <button onClick={async () => {
              await supabase.from('impegni').insert([{ titolo: titoloImp, data: dataImp, durata_max: durataImp, tipo: commaImp }]);
              alert("Evento creato e visibile ai docenti!"); setTab('calendario');
            }} className="w-full bg-slate-900 text-white p-6 rounded-2xl font-black text-xl hover:bg-orange-600 transition-all shadow-xl uppercase">Pubblica nel Calendario</button>
          </div>
        </div>
      )}

      {tab === 'calendario' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-4">
            {impegni.map(i => (
              <div key={i.id} onClick={() => setSelectedImpegno(i)} className={`p-8 rounded-[2.5rem] border-2 cursor-pointer transition-all ${selectedImpegno?.id === i.id ? 'border-blue-600 bg-blue-50 shadow-xl scale-[1.02]' : 'bg-white border-transparent shadow-sm hover:border-slate-200'}`}>
                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${i.tipo === 'A' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>Comma {i.tipo}</span>
                <h3 className="font-black text-2xl text-slate-800 mt-2 uppercase">{i.titolo}</h3>
                <p className="text-slate-400 font-bold mt-1">{new Date(i.data).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })} • {i.durata_max} ORE</p>
              </div>
            ))}
          </div>
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl border h-fit sticky top-8">
            {selectedImpegno ? (
              <div>
                <h3 className="text-xl font-black mb-8 uppercase text-blue-600 border-b pb-4">Foglio Presenze: {selectedImpegno.titolo}</h3>
                <div className="space-y-3">
                  {tuttiPiani.filter(p => p.impegno_id === selectedImpegno.id).map(p => {
                    const doc = docenti.find(d => d.id === p.docente_id);
                    return (
                      <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border">
                        <span className="font-black text-slate-700 uppercase text-xs">{doc?.nome}</span>
                        <button onClick={async () => {
                           await supabase.from('piani').update({ presente: !p.presente }).eq('id', p.id);
                           caricaDati();
                        }} className={`px-6 py-2 rounded-xl font-black text-[9px] uppercase transition-all shadow-sm ${p.presente ? 'bg-green-600 text-white' : 'bg-white text-slate-300 border'}`}>
                          {p.presente ? 'Presente ✓' : 'Assente'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : <div className="py-20 text-center text-slate-200 font-black uppercase italic">Seleziona un evento per gestire l'appello</div>}
          </div>
        </div>
      )}

      {tab === 'documenti' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="bg-white p-10 rounded-[3rem] shadow-xl border">
            <h2 className="text-2xl font-black mb-8 uppercase italic text-indigo-600">Condividi Risorsa</h2>
            <div className="space-y-4">
              <input type="text" placeholder="TITOLO (ES. VERBALE N.1)" className="w-full p-5 bg-slate-50 rounded-2xl font-bold border" onChange={e => setDocTitolo(e.target.value)} />
              <input type="text" placeholder="URL LINK (DRIVE/PDF)" className="w-full p-5 bg-slate-50 rounded-2xl font-mono text-sm border" onChange={e => setDocUrl(e.target.value)} />
              <button onClick={async () => {
                await supabase.from('documenti').insert([{ titolo: docTitolo, url: docUrl }]);
                alert("Documento Pubblicato!"); caricaDati();
              }} className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-black uppercase shadow-lg hover:bg-indigo-700">Pubblica in Bacheca</button>
            </div>
          </div>
          <div className="space-y-4">
            {documenti.map(d => (
              <div key={d.id} className="bg-white p-6 rounded-2xl border flex justify-between items-center shadow-sm">
                <div>
                  <p className="font-black text-slate-700 uppercase">{d.titolo}</p>
                  <p className="text-[9px] text-slate-300 font-bold uppercase">{new Date(d.created_at).toLocaleDateString()}</p>
                </div>
                <button onClick={async () => { if(confirm("Eliminare?")) { await supabase.from('documenti').delete().eq('id', d.id); caricaDati(); }}} className="text-red-300 hover:text-red-600 font-black text-[10px] uppercase">Rimuovi</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* --- PANNELLO DOCENTE (VERSIONE COMPLESSA) --- */
function DocentePanel({ docenteId, docenteNome, infoDocente }: any) {
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
    <div className="max-w-5xl mx-auto p-6">
      <nav className="flex gap-3 mb-10 bg-white p-3 rounded-2xl border w-fit font-black text-[10px] uppercase mx-auto shadow-sm sticky top-4 z-50">
        <button onClick={() => setView('pianifica')} className={`px-8 py-3 rounded-xl transition-all ${view === 'pianifica' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}>Pianifica Ore</button>
        <button onClick={() => setView('mio-piano')} className={`px-8 py-3 rounded-xl transition-all ${view === 'mio-piano' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}>Mio Piano (PDF)</button>
        <button onClick={() => setView('docs')} className={`px-8 py-3 rounded-xl transition-all ${view === 'docs' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>Bacheca Link</button>
      </nav>

      {view === 'pianifica' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="bg-white p-12 rounded-[3rem] shadow-2xl border text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-3 bg-blue-600"></div>
            <h1 className="text-5xl font-black italic uppercase text-slate-800 tracking-tighter">{docenteNome}</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase mt-2">Contratto: {infoDocente.contratto} • {infoDocente.ore_settimanali}h settimanali</p>
            <div className="flex justify-center gap-10 mt-10">
               <div className="text-center">
                 <p className="text-[10px] font-black text-blue-500 uppercase mb-1">Comma A (Dovute {infoDocente.ore_a_dovute}h)</p>
                 <div className="bg-blue-50 px-8 py-4 rounded-2xl border border-blue-100 text-3xl font-black text-blue-700">{aP}h</div>
               </div>
               <div className="text-center">
                 <p className="text-[10px] font-black text-indigo-500 uppercase mb-1">Comma B (Dovute {infoDocente.ore_b_dovute}h)</p>
                 <div className="bg-indigo-50 px-8 py-4 rounded-2xl border border-indigo-100 text-3xl font-black text-indigo-700">{bP}h</div>
               </div>
            </div>
          </div>
          
          <div className="space-y-4">
            {impegni.map(i => {
              const isP = piani.find(p => p.impegno_id === i.id);
              return (
                <div key={i.id} className={`bg-white p-8 rounded-[3rem] border-2 flex flex-col md:flex-row justify-between items-center gap-6 transition-all ${isP ? 'border-blue-400 shadow-lg scale-[1.01]' : 'border-transparent shadow-sm'}`}>
                  <div className="flex-1 text-center md:text-left">
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${i.tipo === 'A' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>Comma {i.tipo}</span>
                    <p className="font-black text-2xl text-slate-800 mt-2 uppercase">{i.titolo}</p>
                    <p className="text-sm font-bold text-slate-400 uppercase">{new Date(i.data).toLocaleDateString('it-IT')}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <label className="text-[9px] font-black uppercase text-slate-300 block mb-1">Ore Effettive</label>
                      <input type="number" step="0.5" defaultValue={isP ? isP.ore_effettive : i.durata_max} className="w-20 p-4 bg-slate-50 border rounded-2xl text-center font-black text-xl outline-none focus:border-blue-500" id={`ore-${i.id}`} disabled={isP?.presente} />
                    </div>
                    <button onClick={async () => {
                      const val = (document.getElementById(`ore-${i.id}`) as HTMLInputElement).value;
                      if(isP) { 
                        if(isP.presente) return alert("Questa attività è già stata svolta e validata. Non puoi rimuoverla.");
                        await supabase.from('piani').delete().eq('id', isP.id); 
                      }
                      else { await supabase.from('piani').insert([{ docente_id: docenteId, impegno_id: i.id, ore_effettive: Number(val), tipo: i.tipo, presente: false }]); }
                      caricaTutto();
                    }} className={`px-10 py-5 rounded-[1.5rem] font-black text-xs uppercase shadow-xl transition-all active:scale-95 ${isP ? 'bg-red-500 text-white' : 'bg-slate-900 text-white hover:bg-blue-600'}`}>
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
        <div className="bg-white p-16 rounded-[3rem] shadow-2xl border animate-in zoom-in duration-300" id="print-area">
          <div className="flex justify-between items-start mb-12 border-b-4 border-slate-900 pb-10">
            <div>
              <h2 className="text-5xl font-black uppercase italic tracking-tighter text-slate-900">Piano Attività</h2>
              <p className="text-xl font-bold text-slate-500 mt-2 uppercase">Docente: {docenteNome}</p>
              <p className="text-xs font-black text-slate-400 uppercase">A.S. 2025/2026</p>
            </div>
            <button onClick={() => window.print()} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase print:hidden shadow-2xl hover:bg-blue-600 transition-all">Genera PDF</button>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[12px] font-black uppercase text-slate-400 border-b-2 border-slate-100">
                <th className="py-6">Descrizione Impegno</th>
                <th className="py-6 text-center">Data</th>
                <th className="py-6 text-center">Comma</th>
                <th className="py-6 text-right">Ore</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {piani.map(p => {
                const imp = impegni.find(i => i.id === p.impegno_id);
                return (
                  <tr key={p.id}>
                    <td className="py-6 font-bold text-slate-800 uppercase text-sm">{imp?.titolo}</td>
                    <td className="py-6 text-center text-slate-500 font-mono text-xs">{imp?.data}</td>
                    <td className="py-6 text-center"><span className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black">{p.tipo}</span></td>
                    <td className="py-6 text-right font-black text-lg">{p.ore_effettive}h</td>
                  </tr>
                );
              })}
              <tr className="bg-slate-900 text-white">
                <td colSpan={3} className="p-8 font-black uppercase text-sm tracking-widest">Totale Ore Dichiarate</td>
                <td className="p-8 text-right font-black text-3xl">{aP + bP}h</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-32 grid grid-cols-2 gap-20 invisible print:visible">
             <div className="border-t-2 border-slate-900 pt-4 text-center text-[10px] font-black uppercase tracking-widest">Firma del Docente</div>
             <div className="border-t-2 border-slate-900 pt-4 text-center text-[10px] font-black uppercase tracking-widest">Firma del Dirigente Scolastico</div>
          </div>
        </div>
      )}

      {view === 'docs' && (
        <div className="space-y-6 max-w-3xl mx-auto">
          <h2 className="text-3xl font-black italic uppercase mb-10 tracking-tighter text-center">Area Risorse & Circolari</h2>
          {documenti.map(d => (
            <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer" className="bg-white p-10 rounded-[2.5rem] border-2 border-transparent hover:border-indigo-600 block transition-all shadow-sm group hover:shadow-2xl">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-indigo-600 font-black text-2xl group-hover:underline underline-offset-8 uppercase tracking-tighter">{d.titolo}</p>
                  <p className="text-[10px] text-slate-300 font-black uppercase mt-2 tracking-widest">Pubblicato il {new Date(d.created_at).toLocaleDateString()}</p>
                </div>
                <div className="bg-indigo-50 p-5 rounded-3xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
