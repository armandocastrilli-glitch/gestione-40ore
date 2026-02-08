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
    if (loginCode === 'ADMIN123') { setUser({ id: 'admin', nome: 'Amministratore', role: 'admin' }); return; }
    const { data } = await supabase.from('docenti').select('*').eq('codice_accesso', loginCode).single();
    if (data) setUser(data);
    else alert("Codice errato!");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {!user ? (
        <div className="max-w-md mx-auto pt-20 p-6 text-center">
          <h1 className="text-4xl font-black mb-8 text-blue-900 tracking-tighter italic text-center">GESTIONE 40+40</h1>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-100">
            <input type="text" placeholder="CODICE PERSONALE" className="w-full p-5 border-2 border-slate-100 rounded-2xl mb-4 text-center text-2xl uppercase font-mono shadow-inner outline-none focus:border-blue-500 transition-all"
              onChange={(e) => setLoginCode(e.target.value.toUpperCase())} />
            <button onClick={handleLogin} className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-lg active:scale-95 uppercase tracking-widest">Entra</button>
          </div>
        </div>
      ) : user.role === 'admin' ? (
        <AdminPanel />
      ) : (
        <DocentePanel docenteId={user.id} docenteNome={user.nome} infoDocente={user} />
      )}
    </div>
  );
}

function AdminPanel() {
  const [tab, setTab] = useState('riepilogo');
  const [docenti, setDocenti] = useState([]);
  const [impegni, setImpegni] = useState([]);
  const [selectedDocente, setSelectedDocente] = useState(null);

  // Stati Form
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
    let a, b;
    if (tipoRipartizione === 'solo_mia') {
      a = 40; b = parseFloat(((40/18)*oreSet*(mesi/9)).toFixed(1));
    } else {
      const meta = parseFloat((((80/18)*oreSet*(mesi/9))/2).toFixed(1));
      a = meta; b = meta;
    }
    await supabase.from('docenti').insert([{ nome, codice_accesso: codice, ore_a_dovute: a, ore_b_dovute: b }]);
    alert("Docente Creato! Codice: " + codice);
    caricaDati(); setTab('riepilogo');
  };

  const eliminaImpegno = async (id) => {
    if(confirm("Eliminare l'impegno?")) {
      await supabase.from('impegni').delete().eq('id', id);
      caricaDati();
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <nav className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 w-fit">
        {['riepilogo', 'calendario', 'nuovo_docente', 'nuovo_impegno'].map(t => (
          <button key={t} onClick={() => {setTab(t); setSelectedDocente(null)}} 
            className={`px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${tab === t ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
            {t.replace('_', ' ')}
          </button>
        ))}
      </nav>

      {tab === 'riepilogo' && !selectedDocente && (
        <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase">Docente</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase text-center">Codice</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase text-center">Ore A/B</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {docenti.map(d => (
                <tr key={d.id} className="hover:bg-blue-50/20 transition-colors">
                  <td className="p-6 font-black text-slate-700">{d.nome}</td>
                  <td className="p-6 text-center font-mono font-bold text-blue-600 uppercase tracking-tighter">{d.codice_accesso}</td>
                  <td className="p-6 text-center text-sm font-bold text-slate-400"><span className="text-blue-600">{d.ore_a_dovute}</span> / <span className="text-indigo-600">{d.ore_b_dovute}</span></td>
                  <td className="p-6 text-right space-x-2">
                    <button onClick={() => setSelectedDocente(d)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all">Gestisci Piano</button>
                    <button onClick={async () => {if(confirm("Eliminare?")){await supabase.from('docenti').delete().eq('id', d.id); caricaDati();}}} className="text-red-300 hover:text-red-500 text-xs italic">Elimina</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedDocente && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button onClick={() => setSelectedDocente(null)} className="mb-6 bg-slate-200 px-4 py-2 rounded-full font-bold text-xs uppercase"> ← Torna alla lista </button>
          <DocentePanel docenteId={selectedDocente.id} docenteNome={selectedDocente.nome} infoDocente={selectedDocente} adminMode={true} />
        </div>
      )}

      {tab === 'calendario' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-4">
              <h2 className="text-2xl font-black italic uppercase mb-6">Impegni Pubblicati</h2>
              {impegni.map(i => (
                <div key={i.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex justify-between items-center group">
                  <div>
                    <span className={`text-[9px] font-black px-2 py-1 rounded uppercase ${i.tipo === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>Comma {i.tipo}</span>
                    <h3 className="font-black text-xl mt-1">{i.titolo}</h3>
                    <p className="text-slate-400 font-bold text-sm">{i.data} • {i.durata_max}h</p>
                  </div>
                  <button onClick={() => eliminaImpegno(i.id)} className="text-slate-200 hover:text-red-500 font-black text-[10px] uppercase">Rimuovi</button>
                </div>
              ))}
           </div>
           <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 h-fit text-center">
              <h3 className="text-xl font-black mb-4 uppercase">Riepilogo Scuola</h3>
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-6 bg-slate-50 rounded-3xl"><p className="text-xs font-bold text-slate-400">DOCENTI</p><p className="text-3xl font-black">{docenti.length}</p></div>
                 <div className="p-6 bg-slate-50 rounded-3xl"><p className="text-xs font-bold text-slate-400">EVENTI</p><p className="text-3xl font-black">{impegni.length}</p></div>
              </div>
           </div>
        </div>
      )}

      {tab === 'nuovo_docente' && (
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-black mb-8 italic uppercase tracking-tighter">Nuova Anagrafica</h2>
          <div className="space-y-4">
            <input type="text" placeholder="NOME E COGNOME" className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-center uppercase" onChange={e => setNome(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
               <input type="number" placeholder="ORE SETT." className="p-5 bg-slate-50 rounded-2xl font-bold text-center" onChange={e => setOreSet(Number(e.target.value))} />
               <input type="number" placeholder="MESI SERV." className="p-5 bg-slate-50 rounded-2xl font-bold text-center" onChange={e => setMesi(Number(e.target.value))} />
            </div>
            <select className="w-full p-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest outline-none cursor-pointer" onChange={e => setTipoRipartizione(e.target.value)}>
              <option value="completamento">Completamento (Ripartisce A e B)</option>
              <option value="solo_mia">Solo mia scuola (40A fisse + proporzionale B)</option>
            </select>
            <button onClick={salvaDocente} className="w-full bg-slate-900 text-white p-6 rounded-2xl font-black text-lg hover:scale-[1.02] transition-transform uppercase tracking-widest shadow-2xl">Crea Docente</button>
          </div>
        </div>
      )}

      {tab === 'nuovo_impegno' && (
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-black mb-8 italic uppercase tracking-tighter">Nuovo Evento Calendario</h2>
          <div className="space-y-4">
            <input type="text" placeholder="TITOLO RIUNIONE" className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-center uppercase" onChange={e => setTitolo(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
               <input type="date" className="p-5 bg-slate-50 rounded-2xl font-bold text-center" onChange={e => setDataImp(e.target.value)} />
               <input type="number" placeholder="DURATA ORE" className="p-5 bg-slate-50 rounded-2xl font-bold text-center shadow-inner" onChange={e => setDurata(Number(e.target.value))} />
            </div>
            <div className="flex gap-2">
               <button onClick={() => setComma('A')} className={`flex-1 p-4 rounded-xl font-black text-[10px] tracking-widest transition-all ${comma === 'A' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>COMMA A</button>
               <button onClick={() => setComma('B')} className={`flex-1 p-4 rounded-xl font-black text-[10px] tracking-widest transition-all ${comma === 'B' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>COMMA B</button>
            </div>
            <button onClick={async () => {await supabase.from('impegni').insert([{ titolo, data: dataImp, durata_max: durata, tipo: comma }]); alert("Evento Pubblicato!"); setTab('calendario');}} className="w-full bg-slate-900 text-white p-6 rounded-2xl font-black text-lg hover:scale-[1.02] transition-transform uppercase tracking-widest shadow-2xl">Pubblica Riunione</button>
          </div>
        </div>
      )}
    </div>
  );
}

function DocentePanel({ docenteId, docenteNome, infoDocente, adminMode = false }) {
  const [impegni, setImpegni] = useState([]);
  const [piani, setPiani] = useState([]);

  useEffect(() => {
    caricaTutto();
  }, [docenteId]);

  const caricaTutto = async () => {
    const { data: i } = await supabase.from('impegni').select('*').order('data');
    const { data: p } = await supabase.from('piani').select('*').eq('docente_id', docenteId);
    setImpegni(i || []);
    setPiani(p || []);
  };

  const toggleImpegno = async (imp, orePianificate) => {
    const esistente = piani.find(p => p.impegno_id === imp.id);
    if (esistente) {
      await supabase.from('piani').delete().eq('id', esistente.id);
    } else {
      await supabase.from('piani').insert([{ 
        docente_id: docenteId, 
        impegno_id: imp.id, 
        ore_effettive: orePianificate,
        tipo: imp.tipo 
      }]);
    }
    caricaTutto();
  };

  const orePianificateA = piani.filter(p => p.tipo === 'A').reduce((acc, curr) => acc + Number(curr.ore_effettive), 0);
  const orePianificateB = piani.filter(p => p.tipo === 'B').reduce((acc, curr) => acc + Number(curr.ore_effettive), 0);

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 mb-10 relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-full h-3 bg-gradient-to-r ${adminMode ? 'from-orange-500 to-red-600' : 'from-blue-600 to-indigo-700'}`}></div>
        <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-left gap-6">
          <div>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-1">{adminMode ? 'Configurazione Admin' : 'Area Personale Docente'}</p>
            <h1 className="text-4xl font-black tracking-tighter italic uppercase text-slate-800">{docenteNome}</h1>
          </div>
          <div className="flex gap-4">
            <div className="bg-slate-50 px-6 py-4 rounded-3xl border border-slate-100 shadow-inner text-center">
              <p className="text-[9px] font-black text-blue-500 uppercase mb-1">Piano A</p>
              <p className="text-2xl font-black text-slate-800">{orePianificateA} / <span className="text-blue-500">{infoDocente.ore_a_dovute}</span></p>
            </div>
            <div className="bg-slate-50 px-6 py-4 rounded-3xl border border-slate-100 shadow-inner text-center">
              <p className="text-[9px] font-black text-indigo-500 uppercase mb-1">Piano B</p>
              <p className="text-2xl font-black text-slate-800">{orePianificateB} / <span className="text-indigo-500">{infoDocente.ore_b_dovute}</span></p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-black italic ml-6 mb-6 uppercase tracking-widest text-slate-500">Seleziona Impegni per il Piano</h2>
        {impegni.map(i => {
          const isPianificato = piani.find(p => p.impegno_id === i.id);
          return (
            <div key={i.id} className={`bg-white p-6 rounded-[2.5rem] border-2 transition-all flex flex-col md:flex-row justify-between items-center gap-4 group ${isPianificato ? 'border-green-500 shadow-md' : 'border-transparent shadow-sm hover:border-slate-200'}`}>
              <div className="flex-1">
                <span className={`text-[10px] font-black px-2 py-1 rounded-md mr-2 uppercase ${i.tipo === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>Comma {i.tipo}</span>
                <p className={`font-black text-xl transition-colors ${isPianificato ? 'text-green-600' : 'text-slate-800'}`}>{i.titolo}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{i.data} • Massimo {i.durata_max} ore</p>
              </div>
              <div className="flex items-center gap-3">
                <input type="number" defaultValue={isPianificato ? isPianificato.ore_effettive : i.durata_max} className="w-16 p-3 bg-slate-50 border-none rounded-2xl text-center font-black text-blue-600 shadow-inner outline-none" id={`ore-${i.id}`} />
                <button onClick={() => {
                  const val = document.getElementById(`ore-${i.id}`).value;
                  toggleImpegno(i, val);
                }} className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-95 ${isPianificato ? 'bg-red-500 text-white' : 'bg-slate-900 text-white hover:bg-blue-600'}`}>
                  {isPianificato ? 'Rimuovi' : 'Aggiungi'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
