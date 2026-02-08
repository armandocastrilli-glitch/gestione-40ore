"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AppCompleta() {
  const [user, setUser] = useState(null);
  const [loginCode, setLoginCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    if (loginCode === 'ADMIN123') {
      setUser('admin');
    } else {
      const { data } = await supabase.from('docenti').select('*').eq('codice_accesso', loginCode).single();
      if (data) setUser(data);
      else alert("Codice errato!");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {!user ? (
        <div className="max-w-md mx-auto pt-20 p-6 text-center">
          <h1 className="text-3xl font-bold mb-8 text-blue-900">Gestione 40+40</h1>
          <div className="bg-white p-8 rounded-3xl shadow-xl border">
            <input type="text" placeholder="CODICE ACCESSO" className="w-full p-4 border rounded-2xl mb-4 text-center text-2xl uppercase font-mono"
              onChange={(e) => setLoginCode(e.target.value.toUpperCase())} />
            <button onClick={handleLogin} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold hover:bg-blue-700 transition">
              {loading ? 'Accesso in corso...' : 'Entra'}
            </button>
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
  const [tab, setTab] = useState('docenti'); // 'docenti' o 'impegni'
  const [nome, setNome] = useState('');
  const [oreSet, setOreSet] = useState(18);
  const [mesi, setMesi] = useState(9);

  const [titolo, setTitolo] = useState('');
  const [dataImp, setDataImp] = useState('');
  const [durata, setDurata] = useState(2);
  const [tipo, setTipo] = useState('A');

  const salvaDocente = async () => {
    const codice = Math.random().toString(36).substring(2, 7).toUpperCase();
    const oreA = parseFloat(((40 / 18 * oreSet) * (mesi / 9)).toFixed(1));
    const { error } = await supabase.from('docenti').insert([{ 
      nome, codice_accesso: codice, ore_a_dovute: oreA, ore_b_dovute: oreA 
    }]);
    if (!error) alert(`Salvato! Codice: ${codice}`);
  };

  const salvaImpegno = async () => {
    const { error } = await supabase.from('impegni').insert([{ 
      titolo, data: dataImp, durata_max: durata, tipo 
    }]);
    if (!error) alert("Impegno pubblicato!");
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex gap-4 mb-8">
        <button onClick={() => setTab('docenti')} className={`px-6 py-2 rounded-full font-bold ${tab === 'docenti' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>Docenti</button>
        <button onClick={() => setTab('impegni')} className={`px-6 py-2 rounded-full font-bold ${tab === 'impegni' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>Nuovo Impegno</button>
      </div>

      {tab === 'docenti' ? (
        <div className="bg-white p-6 rounded-3xl shadow border">
          <h2 className="text-xl font-bold mb-4">Aggiungi Docente</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="text" placeholder="Nome Cognome" className="p-3 border rounded-xl" onChange={e => setNome(e.target.value)} />
            <input type="number" placeholder="Ore sett." className="p-3 border rounded-xl" onChange={e => setOreSet(Number(e.target.value))} />
            <input type="number" placeholder="Mesi servizio" className="p-3 border rounded-xl" onChange={e => setMesi(Number(e.target.value))} />
          </div>
          <button onClick={salvaDocente} className="mt-4 bg-green-600 text-white px-8 py-3 rounded-xl font-bold">Salva e Genera Codice</button>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-3xl shadow border">
          <h2 className="text-xl font-bold mb-4">Crea Impegno Pomeridiano</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Es: Consiglio di Classe 3A" className="p-3 border rounded-xl" onChange={e => setTitolo(e.target.value)} />
            <input type="date" className="p-3 border rounded-xl" onChange={e => setDataImp(e.target.value)} />
            <input type="number" placeholder="Durata ore" className="p-3 border rounded-xl" onChange={e => setDurata(Number(e.target.value))} />
            <select className="p-3 border rounded-xl" onChange={e => setTipo(e.target.value)}>
              <option value="A">Comma A (Collegiale)</option>
              <option value="B">Comma B (Consigli)</option>
            </select>
          </div>
          <button onClick={salvaImpegno} className="mt-4 bg-blue-600 text-white px-8 py-3 rounded-xl font-bold">Pubblica Impegno</button>
        </div>
      )}
    </div>
  );
}

/* --- PORTALE DOCENTE --- */
function DocentePanel({ docente }) {
  const [impegni, setImpegni] = useState([]);

  useEffect(() => {
    const caricaImpegni = async () => {
      const { data } = await supabase.from('impegni').select('*').order('data', { ascending: true });
      setImpegni(data || []);
    };
    caricaImpegni();
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-8 rounded-3xl shadow-lg mb-8">
        <h1 className="text-2xl font-bold">Prof. {docente.nome}</h1>
        <div className="flex gap-10 mt-6">
          <div><p className="text-xs opacity-70 uppercase">Debito Comma A</p><p className="text-2xl font-bold">{docente.ore_a_dovute}h</p></div>
          <div><p className="text-xs opacity-70 uppercase">Debito Comma B</p><p className="text-2xl font-bold">{docente.ore_b_dovute}h</p></div>
        </div>
      </div>

      <h3 className="text-xl font-bold mb-4">Pianifica le tue ore</h3>
      <div className="space-y-4">
        {impegni.map(imp => (
          <div key={imp.id} className="bg-white p-5 rounded-2xl border shadow-sm flex justify-between items-center">
            <div>
              <p className="font-bold text-lg">{imp.titolo}</p>
              <p className="text-sm text-slate-500">{imp.data} • Max {imp.durata_max}h • Comma {imp.tipo}</p>
            </div>
            <div className="flex gap-2">
              <input type="number" defaultValue={imp.durata_max} className="w-14 p-2 border rounded-lg text-center" />
              <button className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-bold hover:bg-blue-100 transition">Pianifica</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
