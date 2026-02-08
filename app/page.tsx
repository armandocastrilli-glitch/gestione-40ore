"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AppScuola() {
  const [user, setUser] = useState(null);
  const [loginCode, setLoginCode] = useState('');

  const handleLogin = async () => {
    if (loginCode === 'ADMIN123') { setUser({ role: 'admin' }); return; }
    const { data, error } = await supabase.from('docenti').select('*').eq('codice_accesso', loginCode).single();
    if (data) setUser(data);
    else alert("Codice errato!");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-[2rem] shadow-xl w-full max-w-md text-center border border-slate-200">
          <h1 className="text-3xl font-black text-slate-800 mb-6 italic">SCUOLA CONTROL</h1>
          <input type="text" placeholder="CODICE ACCESSO" className="w-full p-4 border-2 rounded-2xl mb-4 text-center text-xl font-mono uppercase" 
            onChange={(e) => setLoginCode(e.target.value.toUpperCase())} />
          <button onClick={handleLogin} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black hover:bg-blue-700 transition shadow-lg">ACCEDI</button>
        </div>
      </div>
    );
  }

  return user.role === 'admin' ? <AdminPanel /> : <DocentePanel docente={user} />;
}

function AdminPanel() {
  const [tab, setTab] = useState('lista');
  const [docenti, setDocenti] = useState([]);
  const [nome, setNome] = useState('');
  const [oreSet, setOreSet] = useState(18);
  const [mesi, setMesi] = useState(9);
  const [tipoRipartizione, setTipoRipartizione] = useState('completamento');

  useEffect(() => { caricaDocenti(); }, []);

  const caricaDocenti = async () => {
    const { data } = await supabase.from('docenti').select('*').order('nome');
    setDocenti(data || []);
  };

  const aggiungiDocente = async () => {
    const codice = Math.random().toString(36).substring(2, 7).toUpperCase();
    let a, b;
    if (tipoRipartizione === 'solo_mia') {
      a = 40; b = parseFloat(((40/18)*oreSet*(mesi/9)).toFixed(1));
    } else {
      const m = parseFloat((((80/18)*oreSet*(mesi/9))/2).toFixed(1));
      a = m; b = m;
    }
    await supabase.from('docenti').insert([{ nome, codice_accesso: codice, ore_a_dovute: a, ore_b_dovute: b }]);
    alert("Creato: " + codice); caricaDocenti(); setTab('lista');
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex gap-4 mb-8">
        <button onClick={() => setTab('lista')} className={`px-6 py-2 rounded-xl font-bold ${tab === 'lista' ? 'bg-blue-600 text-white' : 'bg-white'}`}>Docenti</button>
        <button onClick={() => setTab('nuovo')} className={`px-6 py-2 rounded-xl font-bold ${tab === 'nuovo' ? 'bg-blue-600 text-white' : 'bg-white'}`}>+ Aggiungi</button>
      </div>

      {tab === 'lista' ? (
        <div className="bg-white rounded-3xl shadow overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-4 font-bold">Docente</th>
                <th className="p-4 text-center">Codice</th>
                <th className="p-4 text-center">Comma A</th>
                <th className="p-4 text-center">Comma B</th>
              </tr>
            </thead>
            <tbody>
              {docenti.map(d => (
                <tr key={d.id} className="border-b">
                  <td className="p-4 font-bold">{d.nome}</td>
                  <td className="p-4 text-center font-mono text-blue-600 font-bold">{d.codice_accesso}</td>
                  <td className="p-4 text-center">{d.ore_a_dovute}h</td>
                  <td className="p-4 text-center">{d.ore_b_dovute}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-3xl shadow max-w-md mx-auto">
          <input type="text" placeholder="Nome" className="w-full p-3 border rounded-xl mb-4" onChange={e => setNome(e.target.value)} />
          <div className="flex gap-2 mb-4">
            <input type="number" placeholder="Ore" className="flex-1 p-3 border rounded-xl" onChange={e => setOreSet(Number(e.target.value))} />
            <input type="number" placeholder="Mesi" className="flex-1 p-3 border rounded-xl" onChange={e => setMesi(Number(e.target.value))} />
          </div>
          <select className="w-full p-3 border rounded-xl mb-6 bg-slate-50" onChange={e => setTipoRipartizione(e.target.value)}>
            <option value="completamento">Completamento (A+B)</option>
            <option value="solo_mia">Solo mia scuola (40A fisso)</option>
          </select>
          <button onClick={aggiungiDocente} className="w-full bg-green-600 text-white p-4 rounded-xl font-bold">SALVA</button>
        </div>
      )}
    </div>
  );
}

function DocentePanel({ docente }) {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="bg-white p-10 rounded-[3rem] shadow-xl border-t-8 border-blue-600 text-center">
        <h1 className="text-3xl font-black mb-6 uppercase tracking-tighter italic">{docente.nome}</h1>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-6 rounded-3xl border">
            <p className="text-xs font-bold text-blue-400 uppercase">Debito Comma A</p>
            <p className="text-3xl font-black">{docente.ore_a_dovute}h</p>
          </div>
          <div className="bg-indigo-50 p-6 rounded-3xl border">
            <p className="text-xs font-bold text-indigo-400 uppercase">Debito Comma B</p>
            <p className="text-3xl font-black">{docente.ore_b_dovute}h</p>
          </div>
        </div>
      </div>
    </div>
  );
}
