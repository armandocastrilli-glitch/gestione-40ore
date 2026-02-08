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
          <h1 className="text-3xl font-bold mb-8 text-blue-900 font-serif">Gestione 40+40</h1>
          <div className="bg-white p-8 rounded-3xl shadow-2xl border">
            <input type="text" placeholder="CODICE ACCESSO" className="w-full p-4 border rounded-2xl mb-4 text-center text-2xl uppercase font-mono shadow-inner"
              onChange={(e) => setLoginCode(e.target.value.toUpperCase())} />
            <button onClick={handleLogin} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold hover:bg-blue-700 transition shadow-lg">Entra</button>
          </div>
        </div>
      ) : user === 'admin' ? (
        <AdminPanel />
      ) : (
        <DocentePanel docente={user} />
      )}
    </div>
  );
}

function AdminPanel() {
  const [tab, setTab] = useState('riepilogo');
  const [docenti, setDocenti] = useState([]);
  const [impegni, setImpegni] = useState([]);
  const [selectedImpegno, setSelectedImpegno] = useState(null);

  // Form Docente
  const [nome, setNome] = useState('');
  const [oreSet, setOreSet] = useState(18);
  const [mesi, setMesi] = useState(9);
  const [tipoRipartizione, setTipoRipartizione] = useState('completamento');

  // Form Impegno
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
    let totale;
    if (tipoRipartizione === 'solo_mia') {
        // 40h fisse su A + proporzionale su B
        totale = (40 / 18 * oreSet) * (mesi / 9);
        const oreA = 40; 
        const oreB = parseFloat(totale.toFixed(1));
        await supabase.from('docenti').insert([{ nome, codice_accesso: codice, ore_a_dovute: oreA, ore_b_dovute: oreB }]);
    } else {
        // Ripartizione 50/50 su tutto (Spezzone in completamento)
        totale = ((80 / 18 * oreSet) * (mesi / 9)) / 2;
        const oreMeta = parseFloat(totale.toFixed(1));
        await supabase.from('docenti').insert([{ nome, codice_accesso: codice, ore_a_dovute: oreMeta, ore_b_dovute: oreMeta }]);
    }
    alert(`Docente aggiunto! Codice: ${codice}`);
    caricaDati(); setTab('riepilogo');
  };

  const eliminaDocente = async (id) => {
    if(confirm("Sei sicuro di voler eliminare questo docente?")) {
        await supabase.from('docenti').delete().eq('id', id);
        caricaDati();
    }
  };

  const eliminaImpegno = async (id) => {
    if(confirm("Eliminare l'impegno? Verrà rimosso anche dai piani dei docenti.")) {
        await supabase.from('impegni').delete().eq('id', id);
        caricaDati();
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      {/* HEADER STATISTICHE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl shadow-sm border-b-4 border-blue-500">
            <p className="text-slate-500 text-sm font-bold uppercase">Docenti Totali</p>
            <p className="text-4xl font-black">{docenti.length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border-b-4 border-indigo-500">
            <p className="text-slate-500 text-sm font-bold uppercase">Impegni a Calendario</p>
            <p className="text-4xl font-black">{impegni.length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border-b-4 border-green-500">
            <p className="text-slate-500 text-sm font-bold uppercase">Codice Admin</p>
            <p className="text-2xl font-mono mt-2">ADMIN123</p>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 mb-8 bg-slate-200 p-1.5 rounded-2xl w-fit">
        <button onClick={() => setTab('riepilogo')} className={`px-6 py-2.5 rounded-xl font-bold transition ${tab === 'riepilogo' ? 'bg-white shadow-md text-blue-600' : 'text-slate-600'}`}>Docenti</button>
        <button onClick={() => setTab('calendario')} className={`px-6 py-2.5 rounded-xl font-bold transition ${tab === 'calendario' ? 'bg-white shadow-md text-blue-600' : 'text-slate-600'}`}>Calendario Impegni</button>
        <button onClick={() => setTab('nuovo_docente')} className={`px-6 py-2.5 rounded-xl font-bold transition ${tab === 'nuovo_docente' ? 'bg-white shadow-md text-blue-600' : 'text-slate-600'}`}>+ Docente</button>
        <button onClick={() => setTab('nuovo_impegno')} className={`px-6 py-2.5 rounded-xl font-bold transition ${tab === 'nuovo_impegno' ? 'bg-white shadow-md text-blue-600' : 'text-slate-600'}`}>+ Impegno</button>
      </nav>

      {/* TABELLA RIEPILOGO DOCENTI */}
      {tab === 'riepilogo' && (
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-5 text-sm font-bold text-slate-400 uppercase">Docente / Codice</th>
                <th className="p-5 text-sm font-bold text-slate-400 uppercase text-center">Debito A</th>
                <th className="p-5 text-sm font-bold text-slate-400 uppercase text-center">Debito B</th>
                <th className="p-5 text-sm font-bold text-slate-400 uppercase text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docenti.map(d => (
                <tr key={d.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-5">
                    <p className="font-bold text-lg text-slate-800">{d.nome}</p>
                    <code className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-sm font-bold tracking-widest">{d.codice_accesso}</code>
                  </td>
                  <td className="p-5 text-center font-bold text-blue-900">{d.ore_a_dovute}h</td>
                  <td className="p-5 text-center font-bold text-indigo-900">{d.ore_b_dovute}h</td>
                  <td className="p-5 text-right">
                    <button onClick={() => eliminaDocente(d.id)} className="text-red-400 hover:text-red-600 p-2 transition">Elimina</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CALENDARIO E PARTECIPANTI */}
      {tab === 'calendario' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
                <h2 className="text-2xl font-bold mb-4">Seleziona un impegno</h2>
                {impegni.map(i => (
                    <div key={i.id} onClick={() => setSelectedImpegno(i)} 
                        className={`p-5 rounded-2xl border-2 cursor-pointer transition ${selectedImpegno?.id === i.id ? 'border-blue-500 bg-blue-50' : 'bg-white border-transparent shadow-sm hover:border-slate-300'}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${i.tipo === 'A' ? 'bg-blue-200 text-blue-800' : 'bg-indigo-200 text-indigo-800'}`}>Comma {i.tipo}</span>
                                <p className="font-bold text-lg mt-1">{i.titolo}</p>
                                <p className="text-sm text-slate-500">{i.data} • {i.durata_max} ore</p>
                            </div>
                            <button onClick={(e) => {e.stopPropagation(); eliminaImpegno(i.id)}} className="text-slate-300 hover:text-red-500 text-xs">Rimuovi</button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-xl border min-h-[400px]">
                {selectedImpegno ? (
                    <>
                        <h3 className="text-xl font-bold mb-2">Partecipanti: {selectedImpegno.titolo}</h3>
                        <p className="text-slate-400 text-sm mb-6 italic text-center">La funzione di appello presenze verrà caricata qui sotto...</p>
                        <div className="border-t pt-4">
                            <p className="text-center text-slate-300 py-10">In questa sezione vedrai l'elenco dei docenti che hanno aderito a questo specifico impegno.</p>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 italic">Clicca su un impegno a sinistra per vedere i dettagli</div>
                )}
            </div>
        </div>
      )}

      {/* FORM AGGIUNTA DOCENTE */}
      {tab === 'nuovo_docente' && (
        <div className="bg-white p-8 rounded-3xl shadow-xl border max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-center">Anagrafica Docente</h2>
          <div className="space-y-6">
            <input type="text" placeholder="Nome e Cognome" className="w-full p-4 border rounded-2xl text-lg shadow-sm focus:ring-2 ring-blue-500 outline-none transition" onChange={e => setNome(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                  <span className="text-xs font-bold text-slate-400 uppercase ml-2">Ore Settimanali</span>
                  <input type="number" defaultValue="18" className="w-full p-4 border rounded-2xl mt-1 font-bold" onChange={e => setOreSet(Number(e.target.value))} />
              </label>
              <label className="block">
                  <span className="text-xs font-bold text-slate-400 uppercase ml-2">Mesi Servizio</span>
                  <input type="number" defaultValue="9" className="w-full p-4 border rounded-2xl mt-1 font-bold" onChange={e => setMesi(Number(e.target.value))} />
              </label>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-200">
                <p className="text-xs font-bold text-slate-500 mb-3 text-center uppercase">Situazione Cattedra</p>
                <div className="flex gap-4">
                    <button onClick={() => setTipoRipartizione('completamento')} className={`flex-1 p-4 rounded-xl text-sm font-bold transition ${tipoRipartizione === 'completamento' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white border'}`}>Completamento (A+B)</button>
                    <button onClick={() => setTipoRipartizione('solo_mia')} className={`flex-1 p-4 rounded-xl text-sm font-bold transition ${tipoRipartizione === 'solo_mia' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white border'}`}>Solo mia scuola (40A fixed)</button>
                </div>
            </div>
            <button onClick={salvaDocente} className="w-full bg-blue-600 text-white p-5 rounded-2xl font-bold text-lg hover:bg-blue-700 shadow-xl transition">Salva e Genera Codice</button>
          </div>
        </div>
      )}

      {/* FORM NUOVO IMPEGNO */}
      {tab === 'nuovo_impegno' && (
        <div className="bg-white p-8 rounded-3xl shadow-xl border max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-8">Nuova Riunione a Calendario</h2>
            <div className="space-y-5">
                <input type="text" placeholder="Es: Collegio Docenti Unitario" className="w-full p-4 border rounded-2xl text-center font-bold" onChange={e => setTitolo(e.target.value)} />
                <div className="grid grid-cols-2 gap-4">
                    <input type="date" className="p-4 border rounded-2xl font-bold" onChange={e => setDataImp(e.target.value)} />
                    <input type="number" placeholder="Durata ore" className="p-4 border rounded-2xl font-bold text-center" onChange={e => setDurata(Number(e.target.value))} />
                </div>
                <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
                    <button onClick={() => setComma('A')} className={`flex-1 p-3 rounded-xl font-bold transition ${comma === 'A' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>COMMA A</button>
                    <button onClick={() => setComma('B')} className={`flex-1 p-3 rounded-xl font-bold transition ${comma === 'B' ? 'bg-white text-indigo-600 shadow' : 'text-slate-500'}`}>COMMA B</button>
                </div>
                <button onClick={async () => {
                    await supabase.from('impegni').insert([{ titolo, data: dataImp, durata_max: durata, tipo: comma }]);
                    alert("Impegno Pubblicato!"); caricaDati(); setTab('calendario');
                }} className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-bold text-lg hover:bg-indigo-700 shadow-xl transition">Pubblica a Calendario</button>
            </div>
        </div>
      )}
    </div>
  );
}

function DocentePanel({ docente }) {
  const [impegni, setImpegni] = useState([]);
  useEffect(() => {
    supabase.from('impegni').select('*').order('data').then(({ data }) => setImpegni(data || []));
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl border mb-10 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 to-indigo-600"></div>
        <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Prof. {docente.nome}</h1>
        <p className="text-slate-400 mt-1 font-medium tracking-widest text-xs">Pannello Personale Docente</p>
        
        <div className="grid grid-cols-2 gap-6 mt-10">
          <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
            <p className="text-[10px] uppercase font-black text-blue-500 tracking-widest mb-2">Piano Comma A</p>
            <p className="text-4xl font-black text-slate-800">0 / <span className="text-blue-500">{docente.ore_a_dovute}</span></p>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Ore Obbligatorie</p>
          </div>
          <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
            <p className="text-[10px] uppercase font-black text-indigo-500 tracking-widest mb-2">Piano Comma B</p>
            <p className="text-4xl font-black text-slate-800">0 / <span className="text-indigo-500">{docente.ore_b_dovute}</span></p>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Ore Obbligatorie</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-black ml-4 text-slate-700 uppercase tracking-wider italic">Impegni Disponibili</h2>
        {impegni.map(i => (
          <div key={i.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 hover:shadow-md transition">
            <div className="flex-1">
              <span className={`px-2 py-1 rounded-lg text-[10px] font-black mr-2 ${i.tipo === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>COMMA {i.tipo}</span>
              <p className="font-black text-slate-800 text-lg">{i.titolo}</p>
              <p className="text-sm text-slate-400 font-medium">{i.data} • {i.durata_max} ore massime</p>
            </div>
            <div className="flex items-center gap-3">
              <input type="number" defaultValue={i.durata_max} className="w-16 p-3 border rounded-2xl text-center font-black text-blue-600 bg-slate-50 shadow-inner" />
              <button className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition shadow-lg">Pianifica</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
