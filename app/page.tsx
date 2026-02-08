"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AppScuolaDefinitiva() {
  const [user, setUser] = useState(null);
  const [loginCode, setLoginCode] = useState('');

  const handleLogin = async () => {
    if (loginCode === 'ADMIN123') { setUser('admin'); return; }
    const { data } = await supabase.from('docenti').select('*').eq('codice_accesso', loginCode).single();
    if (data) setUser(data);
    else alert("Codice errato!");
  };

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 font-sans">
      {!user ? (
        <div className="max-w-md mx-auto pt-20 p-6">
          <div className="bg-white p-8 rounded-3xl shadow-2xl border text-center">
            <h1 className="text-2xl font-bold mb-6 text-blue-900">Gestione 40+40</h1>
            <input type="text" placeholder="CODICE ACCESSO" className="w-full p-4 border rounded-2xl mb-4 text-center text-2xl uppercase font-mono"
              onChange={(e) => setLoginCode(e.target.value.toUpperCase())} />
            <button onClick={handleLogin} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold hover:bg-blue-700 transition">Entra</button>
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

/* --- PANNELLO AMMINISTRATORE --- */
function AdminPanel() {
  const [tab, setTab] = useState('riepilogo');
  const [docenti, setDocenti] = useState([]);
  const [impegni, setImpegni] = useState([]);
  
  // Stati per nuovo docente
  const [nome, setNome] = useState('');
  const [oreSet, setOreSet] = useState(18);
  const [mesi, setMesi] = useState(9);
  const [tipoRipartizione, setTipoRipartizione] = useState('completamento'); // 'solo_mia' o 'completamento'

  // Stati per nuovo impegno
  const [titolo, setTitolo] = useState('');
  const [dataImp, setDataImp] = useState('');
  const [durata, setDurata] = useState(2);
  const [comma, setComma] = useState('A');

  useEffect(() => {
    caricaDati();
  }, [tab]);

  const caricaDati = async () => {
    const { data: d } = await supabase.from('docenti').select('*');
    const { data: i } = await supabase.from('impegni').select('*');
    setDocenti(d || []);
    setImpegni(i || []);
  };

  const salvaDocente = async () => {
    const codice = Math.random().toString(36).substring(2, 7).toUpperCase();
    let oreA, oreB;

    if (tipoRipartizione === 'solo_mia') {
      oreA = 40; // Obbligatorietà totale
      oreB = parseFloat(((40 / 18 * oreSet) * (mesi / 9)).toFixed(1));
    } else {
      // Proporzionale su 80 ore totali (40A + 40B)
      const totaleRipartito = ((80 / 18 * oreSet) * (mesi / 9)) / 2;
      oreA = parseFloat(totaleRipartito.toFixed(1));
      oreB = parseFloat(totaleRipartito.toFixed(1));
    }

    const { error } = await supabase.from('docenti').insert([{ 
      nome, codice_accesso: codice, ore_a_dovute: oreA, ore_b_dovute: oreB 
    }]);
    if (!error) { alert(`Salvato! Codice: ${codice}`); caricaDati(); }
  };

  const salvaImpegno = async () => {
    await supabase.from('impegni').insert([{ titolo, data: dataImp, durata_max: durata, tipo: comma }]);
    alert("Impegno aggiunto!");
    caricaDati();
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <nav className="flex gap-4 mb-8 bg-white p-2 rounded-2xl shadow-sm w-fit">
        {['riepilogo', 'nuovo_docente', 'nuovo_impegno'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl capitalize ${tab === t ? 'bg-blue-600 text-white' : ''}`}>
            {t.replace('_', ' ')}
          </button>
        ))}
      </nav>

      {tab === 'riepilogo' && (
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 text-slate-600 text-sm uppercase">
              <tr>
                <th className="p-4">Docente (Codice)</th>
                <th className="p-4 text-center">Pianificate (A/B)</th>
                <th className="p-4 text-center">Completate (A/B)</th>
                <th className="p-4 text-center">Debito Residuo</th>
              </tr>
            </thead>
            <tbody>
              {docenti.map(d => (
                <tr key={d.id} className="border-t hover:bg-slate-50 transition">
                  <td className="p-4 font-bold">{d.nome} <span className="text-blue-600 font-mono ml-2">[{d.codice_accesso}]</span></td>
                  <td className="p-4 text-center">0h / 0h</td>
                  <td className="p-4 text-center text-green-600 font-bold">0h / 0h</td>
                  <td className="p-4 text-center font-bold text-red-600">{d.ore_a_dovute + d.ore_b_dovute}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'nuovo_docente' && (
        <div className="bg-white p-8 rounded-3xl shadow-xl border max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Configurazione Docente</h2>
          <div className="space-y-4">
            <input type="text" placeholder="Nome e Cognome" className="w-full p-3 border rounded-xl" onChange={e => setNome(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <input type="number" placeholder="Ore Settimanali" className="p-3 border rounded-xl" onChange={e => setOreSet(Number(e.target.value))} />
              <input type="number" placeholder="Mesi Servizio" className="p-3 border rounded-xl" onChange={e => setMesi(Number(e.target.value))} />
            </div>
            <select className="w-full p-3 border rounded-xl bg-blue-50 font-bold" onChange={e => setTipoRipartizione(e.target.value)}>
              <option value="completamento">Completamento su altra scuola (Ripartisce A e B)</option>
              <option value="solo_mia">Solo mia scuola (40h fisse su A, ripartisce B)</option>
            </select>
            <button onClick={salvaDocente} className="w-full bg-green-600 text-white p-4 rounded-xl font-bold">Salva Docente e Genera Codice</button>
          </div>
        </div>
      )}

      {tab === 'nuovo_impegno' && (
        <div className="bg-white p-8 rounded-3xl shadow-xl border max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Nuovo Impegno</h2>
          <div className="space-y-4">
            <input type="text" placeholder="Titolo (es. Consiglio Classe 2B)" className="w-full p-3 border rounded-xl" onChange={e => setTitolo(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <input type="date" className="p-3 border rounded-xl" onChange={e => setDataImp(e.target.value)} />
              <input type="number" placeholder="Ore" className="p-3 border rounded-xl" onChange={e => setDurata(Number(e.target.value))} />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setComma('A')} className={`flex-1 p-3 rounded-xl font-bold border ${comma === 'A' ? 'bg-blue-600 text-white' : 'bg-white'}`}>Comma A (Collegiale)</button>
              <button onClick={() => setComma('B')} className={`flex-1 p-3 rounded-xl font-bold border ${comma === 'B' ? 'bg-blue-600 text-white' : 'bg-white'}`}>Comma B (Consigli)</button>
            </div>
            <button onClick={salvaImpegno} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold">Pubblica Impegno</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* --- PORTALE DOCENTE --- */
function DocentePanel({ docente }) {
  const [impegni, setImpegni] = useState([]);
  useEffect(() => {
    supabase.from('impegni').select('*').order('data').then(({ data }) => setImpegni(data || []));
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white p-8 rounded-3xl shadow-xl border mb-8 flex flex-col md:flex-row justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-blue-900 italic">Prof. {docente.nome}</h1>
          <p className="text-slate-500">Riepilogo ore obbligatorie</p>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4 md:mt-0 text-center">
          <div className="px-4 py-2 bg-blue-50 rounded-2xl border border-blue-100">
            <p className="text-xs uppercase text-blue-600 font-bold tracking-wider">Comma A</p>
            <p className="text-xl font-black text-blue-900">0h / {docente.ore_a_dovute}h</p>
          </div>
          <div className="px-4 py-2 bg-indigo-50 rounded-2xl border border-indigo-100">
            <p className="text-xs uppercase text-indigo-600 font-bold tracking-wider">Comma B</p>
            <p className="text-xl font-black text-indigo-900">0h / {docente.ore_b_dovute}h</p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-4 ml-2">Impegni Disponibili</h2>
      <div className="space-y-4">
        {impegni.map(i => (
          <div key={i.id} className="bg-white p-5 rounded-2xl border shadow-sm hover:shadow-md transition flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex-1">
              <span className={`px-2 py-1 rounded-lg text-xs font-bold mr-2 ${i.tipo === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
                COMMA {i.tipo}
              </span>
              <span className="font-bold text-slate-800">{i.titolo}</span>
              <p className="text-sm text-slate-500 mt-1">{i.data} • Durata prevista: {i.durata_max} ore</p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <input type="number" defaultValue={i.durata_max} className="w-16 p-2 border rounded-xl text-center font-bold" />
              <button className="flex-1 md:flex-none bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-sm">Pianifica</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
