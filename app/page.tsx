"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AppGestioneTotale() {
  const [user, setUser] = useState(null);
  const [loginCode, setLoginCode] = useState('');

  const handleLogin = async () => {
    if (loginCode === 'ADMIN123') { setUser('admin'); return; }
    const { data } = await supabase.from('docenti').select('*').eq('codice_accesso', loginCode).single();
    if (data) setUser(data);
    else alert("Codice errato!");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {!user ? (
        <div className="max-w-md mx-auto pt-20 p-6 text-center">
          <h1 className="text-4xl font-black mb-8 text-blue-900 tracking-tighter italic">ScuolaControl 40+40</h1>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-100">
            <p className="text-slate-400 mb-6 text-sm font-bold uppercase tracking-widest">Accesso Riservato</p>
            <input type="text" placeholder="CODICE PERSONALE" className="w-full p-5 border-2 border-slate-100 rounded-2xl mb-4 text-center text-2xl uppercase font-mono focus:border-blue-500 outline-none transition-all shadow-inner"
              onChange={(e) => setLoginCode(e.target.value.toUpperCase())} />
            <button onClick={handleLogin} className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-lg active:scale-95">ACCEDI</button>
          </div>
        </div>
      ) : user === 'admin' ? (
        <AdminPanel />
      ) : (
        <DocentePanel docenteId={user.id} />
      )}
    </div>
  );
}

function AdminPanel() {
  const [tab, setTab] = useState('riepilogo');
  const [docenti, setDocenti] = useState([]);
  const [impegni, setImpegni] = useState([]);
  const [selectedDocente, setSelectedDocente] = useState(null);
  const [selectedImpegno, setSelectedImpegno] = useState(null);

  // Form Stati
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
    setDocenti(d || []);
    setImpegni(i || []);
  };

  const salvaDocente = async () => {
    const codice = Math.random().toString(36).substring(2, 7).toUpperCase();
    let oreA, oreB;
    if (tipoRipartizione === 'solo_mia') {
      oreA = 40;
      oreB = parseFloat(((40 / 18 * oreSet) * (mesi / 9)).toFixed(1));
    } else {
      const meta = parseFloat((((80 / 18 * oreSet) * (mesi / 9)) / 2).toFixed(1));
      oreA = meta; oreB = meta;
    }
    await supabase.from('docenti').insert([{ nome, codice_accesso: codice, ore_a_dovute: oreA, ore_b_dovute: oreB }]);
    alert(`Docente creato! Codice: ${codice}`);
    caricaDati(); setTab('riepilogo');
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      {/* NAVIGATION */}
      <nav className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 w-fit">
        {['riepilogo', 'calendario', 'nuovo_docente', 'nuovo_impegno'].map(t => (
          <button key={t} onClick={() => {setTab(t); setSelectedDocente(null)}} 
            className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${tab === t ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
            {t.replace('_', ' ')}
          </button>
        ))}
      </nav>

      {/* VIEW: RIEPILOGO DOCENTI */}
      {tab === 'riepilogo' && !selectedDocente && (
        <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-slate-100">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b">
              <tr>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Docente</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Codice</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Debito A/B</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {docenti.map(d => (
                <tr key={d.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="p-6 font-black text-slate-700 text-lg">{d.nome}</td>
                  <td className="p-6 text-center"><code className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg font-mono font-bold">{d.codice_accesso}</code></td>
                  <td className="p-6 text-center font-bold text-slate-400"><span className="text-blue-600">{d.ore_a_dovute}h</span> / <span className="text-indigo-600">{d.ore_b_dovute}h</span></td>
                  <td className="p-6 text-right space-x-2">
                    <button onClick={() => setSelectedDocente(d)} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">Gestisci Piano</button>
                    <button onClick={async () => {if(confirm("Eliminare?")) {await supabase.from('docenti').delete().eq('id', d.id); caricaDati();}}} className="text-red-300 hover:text-red-500 transition-colors italic text-xs">Elimina</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW: ADMIN MODIFICA PIANO DOCENTE */}
      {selectedDocente && (
        <div>
          <button onClick={() => setSelectedDocente(null)} className="mb-6 text-blue-600 font-bold flex items-center gap-2"> ← Torna alla lista </button>
          <DocentePanel docenteId={selectedDocente.id} adminMode={true} />
        </div>
      )}

      {/* VIEW: CALENDARIO */}
      {tab === 'calendario' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-slate-800 mb-6 uppercase italic">Eventi in Programma</h2>
            {impegni.map(i => (
              <div key={i.id} onClick={() => setSelectedImpegno(i)} 
                className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all shadow-sm ${selectedImpegno?.id === i.id ? 'border-blue-500 bg-blue-50' : 'bg-white border-transparent hover:border-slate-200'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase ${i.tipo === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>Comma {i.tipo}</span>
                    <h3 className="font-black text-xl text-slate-800 mt-2">{i.titolo}</h3>
                    <p className="text-slate-400 font-bold text-sm">{i.data} • {i.durata_max} ore</p>
                  </div>
                  <button onClick={(e) => {e.stopPropagation(); if(confirm("Elimina evento?")) {supabase.from('impegni').delete().eq('id', i.id).then(caricaDati);}}} className="text-slate-300 hover:text-red-500 uppercase text-[10px] font-black">Rimuovi</button>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 h-fit">
            {selectedImpegno ? (
              <>
                <h3 className="text-2xl font-black text-slate-800 mb-1">{selectedImpegno.titolo}</h3>
                <p className="text-slate-400 font-bold mb-8">Elenco partecipanti e pianificazioni</p>
                <div className="space-y-3">
                   <p className="text-center py-20 text-slate-300 italic">Lista aderenti in caricamento...</p>
                </div>
              </>
            ) : (
              <div className="py-40 text-center text-slate-300 font-bold uppercase tracking-widest">Seleziona un evento a sinistra</div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: NUOVO DOCENTE & IMPEGNO (Usa i codici delle risposte precedenti) */}
      {tab === 'nuovo_docente' && (
         <div className="bg-white p-10 rounded-[3rem] shadow-xl border max-w-xl mx-auto">
            <h2 className="text-3xl font-black text-slate-800 mb-8 text-center uppercase tracking-tighter italic">Nuovo Profilo</h2>
            <div className="space-y-4">
               <input type="text" placeholder="NOME E COGNOME" className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-center uppercase shadow-inner" onChange={e => setNome(e.target.value)} />
               <div className="grid grid-cols-2 gap-4">
                  <input type="number" placeholder="ORE SETT." className="p-5 bg-slate-50 border-none rounded-2xl font-bold text-center" onChange={e => setOreSet(Number(e.target.value))} />
                  <input type="number" placeholder="MESI SERV." className="p-5 bg-slate-50 border-none rounded-2xl font-bold text-center" onChange={e => setMesi(Number(e.target.value))} />
               </div>
               <select className="w-full p-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest outline-none shadow-lg cursor-pointer" onChange={e => setTipoRipartizione(e.target.value)}>
                  <option value="completamento">Completamento (Ripartisce A e B)</option>
                  <option value="solo_mia">Solo mia scuola (40h A fisso)</option>
               </select>
               <button onClick={salvaDocente} className="w-full bg-slate-900 text-white p-6 rounded-2xl font-black text-lg hover:scale-[1.02] transition-transform">CREA DOCENTE</button>
            </div>
         </div>
      )}

      {tab === 'nuovo_impegno' && (
         <div className="bg-white p-10 rounded-[3rem] shadow-xl border max-w-xl mx-auto">
            <h2 className="text-3xl font-black text-slate-800 mb-8 text-center uppercase tracking-tighter italic">Crea Evento</h2>
            <div className="space-y-4">
               <input type="text" placeholder="TITOLO RIUNIONE" className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-center uppercase shadow-inner" onChange={e => setTitolo(e.target.value)} />
               <div className="grid grid-cols-2 gap-4">
                  <input type="date" className="p-5 bg-slate-50 border-none rounded-2xl font-bold" onChange={e => setDataImp(e.target.value)} />
                  <input type="number" placeholder="DURATA ORE" className="p-5 bg-slate-50 border-none rounded-2xl font-bold text-center shadow-inner" onChange={e => setDurata(Number(e.target.value))} />
               </div>
               <div className="flex gap-2">
                  <button onClick={() => setComma('A')} className={`flex-1 p-4 rounded-xl font-black text-[10px] tracking-widest ${comma === 'A' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>COMMA A</button>
                  <button onClick={() => setComma('B')} className={`flex-1 p-4 rounded-xl font-black text-[10px] tracking-widest ${comma === 'B' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>COMMA B</button>
               </div>
               <button onClick={async () => {await supabase.from('impegni').insert([{ titolo, data: dataImp, durata_max: durata, tipo: comma }]); alert("Evento Pubblicato!"); setTab('calendario');}} 
                  className="w-full bg-slate-900 text-white p-6 rounded-2xl font-black text-lg hover:scale-[1.02] transition-transform shadow-2xl">PUBBLICA A CALENDARIO</button>
            </div>
         </div>
      )}
    </div>
  );
}

function DocentePanel({ docenteId, adminMode = false }) {
  const [docente, setDocente] = useState(null);
  const [impegni, setImpegni] = useState([]);
  const [piani, setPiani] = useState({}); // {impegnoId: ore}

  useEffect(() => {
    caricaDati();
  }, [docenteId]);

  const caricaDati = async () => {
    const { data: d } = await supabase.from('docenti').select('*').eq('id', docenteId).single();
    const { data: i } = await supabase.from('impegni').select('*').order('data');
    setDocente(d);
    setImpegni(i || []);
  };

  const salvaPianificazione = async (impId, ore) => {
    alert(`Pianificato: ${ore} ore. (In produzione qui salviamo su tabella 'piani')`);
  };

  if (!docente) return <p className="text-center p-20 font-bold text-slate-300">Caricamento profilo...</p>;

  return (
    <div className="max-w-4xl mx-auto pb-20 p-4">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 mb-10 relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-full h-3 bg-gradient-to-r ${adminMode ? 'from-orange-400 to-red-500' : 'from-blue-500 to-indigo-600'}`}></div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">{adminMode ? 'Editing Piano' : 'Profilo Docente'}</p>
                <h1 className="text-4xl font-black text-slate-800 tracking-tighter italic uppercase">{docente.nome}</h1>
            </div>
            <div className="flex gap-4">
                <div className="text-center bg-slate-50 px-6 py-4 rounded-[2rem] border border-slate-100 shadow-inner">
                    <p className="text-[9px] font-black text-blue-500 uppercase mb-1">Debito A</p>
                    <p className="text-2xl font-black text-slate-800">0 / <span className="text-blue-500">{docente.ore_a_dovute}</span></p>
                </div>
                <div className="text-center bg-slate-50 px-6 py-4 rounded-[2rem] border border-slate-100 shadow-inner">
                    <p className="text-[9px] font-black text-indigo-500 uppercase mb-1">Debito B</p>
                    <p className="text-2xl font-black text-slate-800">0 / <span className="text-indigo-500">{docente.ore_b_dovute}</span></p>
                </div>
            </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-black text-slate-700 uppercase italic tracking-widest ml-6 mb-6">Pianificazione Attiva</h2>
        {impegni.map(i => (
          <div key={i.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 hover:shadow-lg transition-all group">
            <div className="flex-1">
              <span className={`px-2 py-1 rounded-lg text-[10px] font-black mr-2 ${i.tipo === 'A' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>COMMA {i.tipo}</span>
              <p className="font-black text-slate-800 text-lg group-hover:text-blue-600 transition-colors">{i.titolo}</p>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">{i.data} • Massimo {i.durata_max} ore</p>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
              <input type="number" defaultValue={i.durata_max} max={i.durata_max} className="w-16 p-3 bg-white border-none rounded-xl text-center font-black text-blue-600 shadow-md outline-none" id={`ore-${i.id}`} />
              <button onClick={() => {
                  const val = document.getElementById(`ore-${i.id}`).value;
                  salvaPianificazione(i.id, val);
              }} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-md active:scale-95">
                  {adminMode ? 'Assegna' : 'Pianifica'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
