"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Questa parte collega l'app al tuo database Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AppScuola() {
  const [user, setUser] = useState(null); // Qui salviamo chi è entrato
  const [loginCode, setLoginCode] = useState('');
  const [error, setError] = useState('');

  // Funzione per controllare il codice del docente
  const handleLogin = async () => {
    if (loginCode === 'ADMIN123') { 
      setUser('admin'); 
      return; 
    }
    
    const { data, error } = await supabase
      .from('docenti')
      .select('*')
      .eq('codice_accesso', loginCode)
      .single();

    if (error || !data) {
      setError('Codice errato o docente non trovato');
    } else {
      setUser(data);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-900">
      {!user ? (
        /* --- SCHERMATA DI LOGIN --- */
        <div className="max-w-md mx-auto mt-20 bg-white p-8 rounded-2xl shadow-xl border border-slate-200 text-center">
          <h1 className="text-2xl font-bold mb-6 text-blue-800">Accesso Impegni 40+40</h1>
          <input 
            type="text" 
            placeholder="INSERISCI IL TUO CODICE" 
            className="w-full p-4 border rounded-xl mb-4 text-center text-2xl uppercase font-mono"
            onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
          />
          <button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-bold transition">
            Entra nel Portale
          </button>
          {error && <p className="text-red-500 text-sm mt-4 font-semibold">{error}</p>}
        </div>
      ) : user === 'admin' ? (
        /* --- SE SEI L'AMMINISTRATORE --- */
        <AdminDashboard />
      ) : (
        /* --- SE SEI UN DOCENTE --- */
        <DocentePortal docente={user} />
      )}
    </div>
  );
}

function AdminDashboard() {
  const [nome, setNome] = useState('');
  const [oreSet, setOreSet] = useState(18);
  const [mesi, setMesi] = useState(9);

  const salvaDocente = async () => {
    const codice = Math.random().toString(36).substring(2, 7).toUpperCase();
    // Formula Pro-Rata che tiene conto di ore settimanali e mesi di servizio
    const oreA = parseFloat(((40 / 18 * oreSet) * (mesi / 9)).toFixed(1));
    const oreB = parseFloat(((40 / 18 * oreSet) * (mesi / 9)).toFixed(1));

    const { error } = await supabase.from('docenti').insert([{ 
      nome, 
      codice_accesso: codice, 
      ore_a_dovute: oreA, 
      ore_b_dovute: oreB,
      mesi_servizio: mesi,
      ore_settimanali: oreSet
    }]);

    if (error) alert("Errore nel salvataggio: " + error.message);
    else alert(`Docente Salvato! Codice per l'accesso: ${codice}`);
  };

  return (
    <div className="max-w-4xl mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8 text-blue-900">Pannello Amministratore</h1>
      <div className="bg-white p-6 rounded-2xl shadow-sm border mb-6">
        <h2 className="text-xl font-bold mb-4">Aggiungi Docente (Calcolo Automatico Spezzone)</h2>
        <div className="grid gap-4">
          <input type="text" placeholder="Nome e Cognome Docente" className="p-3 border rounded-lg" onChange={e => setNome(e.target.value)} />
          <div className="flex gap-4">
            <label className="flex-1">
              <span className="text-xs text-gray-500 uppercase">Ore Settimanali</span>
              <input type="number" value={oreSet} className="w-full p-2 border rounded mt-1" onChange={e => setOreSet(Number(e.target.value))} />
            </label>
            <label className="flex-1">
              <span className="text-xs text-gray-500 uppercase">Mesi di Servizio</span>
              <input type="number" value={mesi} className="w-full p-2 border rounded mt-1" onChange={e => setMesi(Number(e.target.value))} />
            </label>
          </div>
          <button onClick={salvaDocente} className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-xl font-bold">
            Genera Codice e Salva
          </button>
        </div>
      </div>
    </div>
  );
}

function DocentePortal({ docente }) {
  return (
    <div className="max-w-2xl mx-auto py-10">
      <div className="bg-blue-600 text-white p-8 rounded-3xl shadow-lg mb-8 text-center">
        <h1 className="text-2xl font-bold italic">Benvenuto, {docente.nome}</h1>
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-white/10 p-4 rounded-xl">
            <p className="text-sm opacity-80">Monte Ore Comma A</p>
            <p className="text-3xl font-bold">{docente.ore_a_dovute}h</p>
          </div>
          <div className="bg-white/10 p-4 rounded-xl">
            <p className="text-sm opacity-80">Monte Ore Comma B</p>
            <p className="text-3xl font-bold">{docente.ore_b_dovute}h</p>
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl border text-center text-gray-500">
        <p>Qui vedrai gli impegni che pubblicherà l'amministratore.</p>
      </div>
    </div>
  );
}
