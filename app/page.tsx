"use client";
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function GestionaleScolasticoDefinitivo() {
  const [user, setUser] = useState<any>(null);
  const [loginCode, setLoginCode] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleLogin = async () => {
    const code = loginCode.trim().toUpperCase();
    if (code === 'ADMIN123') {
      setUser({ id: 'admin', nome: 'Amministratore', role: 'admin' });
      return;
    }
    const { data, error } = await supabase.from('docenti').select('*').eq('codice_accesso', code).single();
    if (data) setUser(data);
    else alert("Accesso negato: codice non valido.");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-200 flex items-center justify-center p-4">
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl w-full max-w-md border-4 border-white">
          <h1 className="text-5xl font-black mb-10 italic text-center text-blue-700 tracking-tighter">SCUOLA PRO</h1>
          <input 
            type="text" placeholder="CODICE ACCESSO" 
            className="w-full p-6 border-4 border-slate-100 rounded-3xl mb-6 text-center text-3xl font-mono focus:border-blue-500 outline-none transition-all uppercase"
            value={loginCode} onChange={(e) => setLoginCode(e.target.value)}
          />
          <button onClick={handleLogin} className="w-full bg-blue-600 text-white p-6 rounded-3xl font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-xl">ENTRA NEL SISTEMA</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20">
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-[100] border-b p-4 flex justify-between items-center shadow-sm">
        <div className="font-black text-xl italic uppercase tracking-tighter text-blue-600">Dashboard {user.role === 'admin' ? 'Admin' : 'Docente'}</div>
        <button onClick={() => {setUser(null); setLoginCode('');}} className="bg-slate-900 text-white px-6 py-2 rounded-full font-black text-[10px] uppercase hover:bg-red-600 transition-all">Esci</button>
      </header>

      {user.role === 'admin' ? <AdminPanel /> : <DocenteView docente={user} />}
    </div>
  );
}

/* --- LOGICA AMMINISTRATORE --- */
function AdminPanel() {
  const [tab, setTab] = useState('docenti');
  const [docenti, setDocenti] = useState<any[]>([]);
  const [impegni, setImpegni] = useState<any[]>([]);
  const [piani, setPiani] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  // Form Stati
  const [fNome, setFNome] = useState('');
  const [fContratto, setFContratto] = useState('INTERA');
  const [fOre, setFOre] = useState(18);
  const [fMesi, setFMesi] = useState(9);

  const fetchData = useCallback(async () => {
    const { data: d } = await supabase.from('docenti').select('*').order('nome');
    const { data: i } = await supabase.from('impegni').select('*').order('data');
    const { data: p } = await supabase.from('piani').select('*');
    const { data: dc } = await supabase.from('documenti').select('*').order('created_at', { ascending: false });
    setDocenti(d || []); setImpegni(i || []); setPiani(p || []); setDocs(dc || []);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData, tab]);

  const creaDocente = async () => {
    if(!fNome) return alert("Inserisci il nome!");
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    let base = 80;
    if (fContratto !== 'INTERA') base = (80 / 18) * fOre;
    const totaleParametrato = base * (fMesi / 9);
    
    const a = Math.floor(totaleParametrato / 2);
    const b = Math.ceil(totaleParametrato / 2);

    const { error } = await supabase.from('docenti').insert([{
      nome: fNome, codice_accesso: code, ore_a_dovute: a, ore_b_dovute: b,
      contratto: fContratto, ore_settimanali: fOre, mesi: fMesi
    }]);

    if (!error) {
      alert(`Docente creato! Codice Accesso: ${code}`);
      setFNome(''); setTab('docenti'); fetchData();
    }
  };

  const eliminaDocente = async (id: string) => {
    if(confirm("Attenzione: eliminando il docente cancellerai permanentemente anche tutti i suoi piani e le sue presenze. Procedere?")) {
      await supabase.from('piani').delete().eq('docente_id', id);
      await supabase.from('docenti').delete().eq('id', id);
      fetchData();
    }
  };

  return (
    <main className="max-w-7xl mx-auto p-6">
      <nav className="flex gap-4 mb-10 overflow-x-auto pb-2">
        <button onClick={() => {setTab('docenti'); setSelectedDoc(null)}} className={`px-8 py-4 rounded-2xl font-black text-xs uppercase transition-all ${tab === 'docenti' ? 'bg-blue-600 text-white shadow-xl scale-105' : 'bg-white text-slate-400 border'}`}>Gestione Personale</button>
        <button onClick={() => setTab('appello')} className={`px-8 py-4 rounded-2xl font-black text-xs uppercase transition-all ${tab === 'appello' ? 'bg-orange-600 text-white shadow-xl scale-105' : 'bg-white text-slate-400 border'}`}>Registro Appello</button>
        <button onClick={() => setTab('crea_doc')} className={`px-8 py-4 rounded-2xl font-black text-xs uppercase transition-all ${tab === 'crea_doc' ? 'bg-green-600 text-white shadow-xl scale-105' : 'bg-white text-slate-400 border'}`}>+ Nuovo Docente</button>
        <button onClick={() => setTab('impegni')} className={`px-8 py-4 rounded-2xl font-black text-xs uppercase transition-all ${tab === 'impegni' ? 'bg-indigo-600 text-white shadow-xl scale-105' : 'bg-white text-slate-400 border'}`}>+ Nuovo Impegno</button>
      </nav>

      {tab === 'docenti' && !selectedDoc && (
        <div className="grid gap-6">
          {docenti.map(d => {
            const pD = piani.filter(p => p.docente_id === d.id);
            const aP = pD.filter(p => p.tipo === 'A').reduce((s, c) => s + Number(c.ore_effettive), 0);
            const aR = pD.filter(p => p.tipo === 'A' && p.presente).reduce((s, c) => s + Number(c.ore_effettive), 0);
            const bP = pD.filter(p => p.tipo === 'B').reduce((s, c) => s + Number(c.ore_effettive), 0);
            const bR = pD.filter(p => p.tipo === 'B' && p.presente).reduce((s, c) => s + Number(c.ore_effettive), 0);

            return (
              <div key={d.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-transparent hover:border-blue-200 transition-all flex flex-wrap justify-between items-center gap-6">
                <div className="flex-1 min-w-[300px]">
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800">{d.nome}</h3>
                  <div className="flex gap-4 mt-2">
                    <span className="bg-slate-100 px-3 py-1 rounded-lg text-[9px] font-black text-slate-500 uppercase">{d.contratto}</span>
                    <span className="bg-slate-100 px-3 py-1 rounded-lg text-[9px] font-black text-slate-500 uppercase">{d.ore_settimanali}H/SETT</span>
                    <span className="bg-slate-100 px-3 py-1 rounded-lg text-[9px] font-black text-slate-500 uppercase">{d.mesi} MESI</span>
                    <span className="bg-blue-50 px-3 py-1 rounded-lg text-[9px] font-black text-blue-600 uppercase italic">COD: {d.codice_accesso}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <p className="text-[9px] font-black text-blue-400 uppercase">Comma A (Dov: {d.ore_a_dovute}h)</p>
                    <p className="text-sm font-bold">Pian: {aP}h | <span className="text-blue-700">Real: {aR}h</span></p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                    <p className="text-[9px] font-black text-indigo-400 uppercase">Comma B (Dov: {d.ore_b_dovute}h)</p>
                    <p className="text-sm font-bold">Pian: {bP}h | <span className="text-indigo-700">Real: {bR}h</span></p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setSelectedDoc(d)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase">Gestisci</button>
                  <button onClick={() => eliminaDocente(d.id)} className="bg-red-50 text-red-600 px-4 py-3 rounded-xl font-black text-[10px] uppercase hover:bg-red-600 hover:text-white transition-all">Elimina</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedDoc && (
        <div className="animate-in slide-in-from-right duration-300">
          <button onClick={() => setSelectedDoc(null)} className="mb-8 font-black text-xs uppercase flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-all">← Torna al riepilogo</button>
          <DocenteView docente={selectedDoc} adminMode={true} />
        </div>
      )}

      {tab === 'crea_doc' && (
        <div className="max-w-xl mx-auto bg-white p-12 rounded-[3.5rem] shadow-2xl border text-center">
          <h2 className="text-3xl font-black mb-10 uppercase italic text-green-600">Configurazione Contrattuale</h2>
          <div className="space-y-6">
            <input type="text" placeholder="NOME E COGNOME" className="w-full p-6 bg-slate-50 rounded-3xl font-bold uppercase border focus:border-green-600 outline-none" onChange={e => setFNome(e.target.value)} />
            
            <div className="text-left">
              <label className="text-[10px] font-black text-slate-400 ml-4 mb-2 block uppercase">Tipo di Inquadramento</label>
              <select className="w-full p-6 bg-slate-50 rounded-3xl font-bold border outline-none" value={fContratto} onChange={e => setFContratto(e.target.value)}>
                <option value="INTERA">Cattedra Intera (18h)</option>
                <option value="COMPLETAMENTO">Completamento Esterno</option>
                <option value="SPEZZONE">Spezzone Orario</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-left">
                <label className="text-[10px] font-black text-slate-400 ml-4 mb-2 block uppercase">Ore Settimanali</label>
                <input type="number" step="0.5" className="w-full p-6 bg-slate-50 rounded-3xl font-bold border text-center" value={fOre} onChange={e => setFOre(Number(e.target.value))} />
              </div>
              <div className="text-left">
                <label className="text-[10px] font-black text-slate-400 ml-4 mb-2 block uppercase">Mesi Servizio</label>
                <input type="number" className="w-full p-6 bg-slate-50 rounded-3xl font-bold border text-center" value={fMesi} onChange={e => setFMesi(Number(e.target.value))} />
              </div>
            </div>

            <button onClick={creaDocente} className="w-full bg-green-600 text-white p-6 rounded-3xl font-black text-xl hover:shadow-2xl transition-all uppercase">Crea Profilo Docente</button>
          </div>
        </div>
      )}

      {tab === 'impegni' && (
        <div className="max-w-xl mx-auto bg-white p-12 rounded-[3.5rem] shadow-2xl border text-center">
          <h2 className="text-3xl font-black mb-10 uppercase italic text-indigo-600">Nuovo Impegno Collegiale</h2>
          <div className="space-y-6">
            <input id="impTit" type="text" placeholder="TITOLO ATTIVITÀ" className="w-full p-6 bg-slate-50 rounded-3xl font-bold border uppercase" />
            <div className="grid grid-cols-2 gap-4">
              <input id="impData" type="date" className="w-full p-6 bg-slate-50 rounded-3xl font-bold border" />
              <input id="impOre" type="number" step="0.5" placeholder="ORE" className="w-full p-6 bg-slate-50 rounded-3xl font-bold border text-center" />
            </div>
            <div className="flex gap-4">
              <button id="btnA" onClick={() => setCommaImp('A')} className={`flex-1 p-6 rounded-3xl font-black text-xs transition-all ${commaImp === 'A' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>COMMA A</button>
              <button id="btnB" onClick={() => setCommaImp('B')} className={`flex-1 p-6 rounded-3xl font-black text-xs transition-all ${commaImp === 'B' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>COMMA B</button>
            </div>
            <button onClick={async () => {
              const t = (document.getElementById('impTit') as HTMLInputElement).value;
              const d = (document.getElementById('impData') as HTMLInputElement).value;
              const o = (document.getElementById('impOre') as HTMLInputElement).value;
              await supabase.from('impegni').insert([{ titolo: t, data: d, durata_max: Number(o), tipo: commaImp }]);
              alert("Impegno aggiunto!"); setTab('docenti');
            }} className="w-full bg-indigo-600 text-white p-6 rounded-3xl font-black text-xl uppercase">Pubblica Impegno</button>
          </div>
        </div>
      )}

      {tab === 'appello' && (
        <div className="grid md:grid-cols-2 gap-10">
          <div className="space-y-4">
            {impegni.map(i => (
              <div key={i.id} onClick={() => setTab('appello_detail_' + i.id)} className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-transparent hover:border-orange-500 cursor-pointer transition-all">
                <span className="text-[10px] font-black bg-orange-100 text-orange-600 px-3 py-1 rounded-full uppercase">COMMA {i.tipo}</span>
                <h3 className="text-xl font-black uppercase mt-2">{i.titolo}</h3>
                <p className="text-slate-400 font-bold text-xs uppercase">{i.data} • {i.durata_max} ORE</p>
                <button onClick={() => setTab(`appello_list_${i.id}`)} className="mt-4 w-full bg-slate-900 text-white p-4 rounded-2xl font-black text-[10px] uppercase">Gestisci Presenze</button>
              </div>
            ))}
          </div>
          
          <div className="bg-white p-10 rounded-[3rem] shadow-xl border h-fit sticky top-24">
            {tab.startsWith('appello_list_') ? (
              <div>
                <h3 className="text-xl font-black mb-6 uppercase border-b pb-4">Registro: {impegni.find(i => i.id === tab.split('_')[2])?.titolo}</h3>
                {piani.filter(p => p.impegno_id === tab.split('_')[2]).map(p => {
                  const d = docenti.find(doc => doc.id === p.docente_id);
                  return (
                    <div key={p.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl mb-2 border">
                      <span className="font-black text-xs uppercase">{d?.nome}</span>
                      <button onClick={async () => {
                        await supabase.from('piani').update({ presente: !p.presente }).eq('id', p.id);
                        fetchData();
                      }} className={`px-6 py-2 rounded-xl font-black text-[9px] uppercase ${p.presente ? 'bg-green-600 text-white' : 'bg-white text-slate-300 border'}`}>
                        {p.presente ? 'Presente ✓' : 'Assente'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-center py-20 font-black text-slate-300 uppercase italic">Seleziona un impegno a sinistra per l'appello</p>}
          </div>
        </div>
      )}
    </main>
  );
}

/* --- VISTA DOCENTE (INTEGRALE) --- */
function DocenteView({ docente, adminMode = false }: { docente: any, adminMode?: boolean }) {
  const [impegni, setImpegni] = useState<any[]>([]);
  const [piani, setPiani] = useState<any[]>([]);
  const [view, setView] = useState('pianifica');

  const fetchDocData = useCallback(async () => {
    const { data: i } = await supabase.from('impegni').select('*').order('data');
    const { data: p } = await supabase.from('piani').select('*').eq('docente_id', docente.id);
    setImpegni(i || []); setPiani(p || []);
  }, [docente.id]);

  useEffect(() => { fetchDocData(); }, [fetchDocData]);

  const aP = piani.filter(p => p.tipo === 'A').reduce((s, c) => s + Number(c.ore_effettive), 0);
  const bP = piani.filter(p => p.tipo === 'B').reduce((s, c) => s + Number(c.ore_effettive), 0);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <nav className="flex gap-4 justify-center mb-10">
        <button onClick={() => setView('pianifica')} className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase ${view === 'pianifica' ? 'bg-blue-600 text-white' : 'bg-white border text-slate-400'}`}>Pianificazione</button>
        <button onClick={() => setView('riepilogo')} className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase ${view === 'riepilogo' ? 'bg-slate-900 text-white' : 'bg-white border text-slate-400'}`}>Mio Piano (Stampa)</button>
      </nav>

      <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border-4 border-white mb-10 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
        <h2 className="text-4xl font-black uppercase italic text-slate-800 tracking-tighter">{docente.nome}</h2>
        <div className="flex justify-center gap-10 mt-8">
          <div className="text-center">
            <p className="text-[10px] font-black text-blue-500 uppercase">Dovute Comma A: {docente.ore_a_dovute}H</p>
            <p className="text-3xl font-black text-blue-700">{aP}H</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black text-indigo-500 uppercase">Dovute Comma B: {docente.ore_b_dovute}H</p>
            <p className="text-3xl font-black text-indigo-700">{bP}H</p>
          </div>
        </div>
      </div>

      {view === 'pianifica' && (
        <div className="space-y-6">
          {impegni.map(i => {
            const piano = piani.find(p => p.impegno_id === i.id);
            return (
              <div key={i.id} className={`bg-white p-8 rounded-[3rem] shadow-sm border-2 flex flex-col md:flex-row justify-between items-center gap-6 transition-all ${piano ? 'border-blue-400 bg-blue-50/20 shadow-md scale-[1.01]' : 'border-transparent'}`}>
                <div className="flex-1 text-center md:text-left">
                  <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase ${i.tipo === 'A' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>Comma {i.tipo}</span>
                  <h4 className="text-2xl font-black text-slate-800 mt-2 uppercase">{i.titolo}</h4>
                  <p className="text-slate-400 font-bold text-xs">{new Date(i.data).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <label className="text-[9px] font-black text-slate-300 block mb-1 uppercase tracking-widest">Ore Effettive</label>
                    <input id={`input-${i.id}`} type="number" step="0.5" defaultValue={piano ? piano.ore_effettive : i.durata_max} className="w-20 p-4 rounded-2xl bg-slate-100 border-2 border-transparent focus:border-blue-500 text-center font-black text-xl outline-none" disabled={piano?.presente && !adminMode} />
                  </div>
                  <button onClick={async () => {
                    const oreInput = (document.getElementById(`input-${i.id}`) as HTMLInputElement).value;
                    if(piano) {
                      if(piano.presente && !adminMode) return alert("Attività già validata dall'ufficio. Non modificabile.");
                      await supabase.from('piani').delete().eq('id', piano.id);
                    } else {
                      await supabase.from('piani').insert([{ docente_id: docente.id, impegno_id: i.id, ore_effettive: Number(oreInput), tipo: i.tipo, presente: false }]);
                    }
                    fetchDocData();
                  }} className={`px-10 py-5 rounded-[1.5rem] font-black text-xs uppercase shadow-xl active:scale-95 transition-all ${piano ? 'bg-red-500 text-white' : 'bg-slate-900 text-white'}`}>
                    {piano ? 'Rimuovi' : 'Pianifica'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'riepilogo' && (
        <div className="bg-white p-16 rounded-[4rem] shadow-2xl border print:p-0 print:border-0 print:shadow-none" id="area-stampa">
          <div className="flex justify-between items-center mb-12 border-b-8 border-slate-900 pb-10">
            <div>
              <h1 className="text-5xl font-black uppercase italic tracking-tighter">Piano Attività</h1>
              <p className="text-xl font-bold text-slate-500 uppercase mt-2">Docente: {docente.nome}</p>
              <p className="text-xs font-black text-slate-400 mt-1 uppercase">Stato: {docente.contratto} • {docente.ore_settimanali}H SETTIMANALI</p>
            </div>
            <button onClick={() => window.print()} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase print:hidden shadow-xl">Salva PDF</button>
          </div>

          <table className="w-full text-left">
            <thead className="text-[10px] font-black uppercase text-slate-400 border-b-2">
              <tr>
                <th className="py-6">Descrizione Impegno</th>
                <th className="py-6 text-center">Data</th>
                <th className="py-6 text-center">Tipo</th>
                <th className="py-6 text-right">Ore</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {piani.map(p => {
                const imp = impegni.find(i => i.id === p.impegno_id);
                return (
                  <tr key={p.id}>
                    <td className="py-6 font-bold uppercase text-sm text-slate-800">{imp?.titolo}</td>
                    <td className="py-6 text-center font-mono text-xs text-slate-500">{imp?.data}</td>
                    <td className="py-6 text-center"><span className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black">{p.tipo}</span></td>
                    <td className="py-6 text-right font-black text-lg">{p.ore_effettive}H</td>
                  </tr>
                );
              })}
              <tr className="bg-slate-900 text-white">
                <td colSpan={3} className="p-8 font-black uppercase text-sm tracking-widest">Totale Ore Dichiarate</td>
                <td className="p-8 text-right font-black text-3xl">{aP + bP}H</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-40 grid grid-cols-2 gap-20 invisible print:visible">
            <div className="border-t-4 border-slate-900 pt-4 text-center text-[10px] font-black uppercase">Firma del Docente</div>
            <div className="border-t-4 border-slate-900 pt-4 text-center text-[10px] font-black uppercase">Firma del Dirigente Scolastico</div>
          </div>
        </div>
      )}
    </div>
  );
}
