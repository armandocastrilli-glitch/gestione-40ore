"use client";
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function SProV3_Complete() {
  const [user, setUser] = useState<any>(null);
  const [loginCode, setLoginCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const code = loginCode.trim().toUpperCase();
    if (!code) return;
    setLoading(true);
    if (code === 'ADMIN123') {
      setUser({ id: 'admin', nome: 'Direzione Generale', role: 'admin' });
    } else {
      const { data } = await supabase.from('docenti').select('*').eq('codice_accesso', code).single();
      if (data) setUser(data);
      else alert("Codice errato.");
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
        <div className="bg-white p-12 md:p-20 rounded-[5rem] shadow-2xl w-full max-w-2xl border-[20px] border-slate-100">
          <div className="text-center mb-16">
            <h1 className="text-8xl font-black italic tracking-[-0.15em] text-blue-800 uppercase leading-none">S-PRO</h1>
            <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.8em] mt-8">Secure Academic Engine</p>
          </div>
          <input 
            type="text" placeholder="ACCESS CODE" 
            className="w-full p-10 bg-slate-50 border-4 border-transparent focus:border-blue-600 rounded-[3rem] text-center text-5xl font-mono uppercase outline-none mb-8"
            value={loginCode} onChange={(e) => setLoginCode(e.target.value)}
          />
          <button onClick={handleLogin} className="w-full bg-blue-700 text-white p-10 rounded-[3rem] font-black text-3xl uppercase shadow-2xl">
            {loading ? 'WAIT...' : 'AUTHENTICATE'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <header className="bg-white/80 backdrop-blur-xl border-b px-10 py-5 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-blue-800 rounded-2xl flex items-center justify-center text-white font-black italic text-2xl shadow-lg">S</div>
          <div>
            <h2 className="text-lg font-black uppercase leading-none">{user.nome}</h2>
            <p className="text-[10px] font-bold text-blue-500 uppercase mt-1 tracking-widest">{user.role === 'admin' ? 'Master Admin' : 'Academic Staff'}</p>
          </div>
        </div>
        <button onClick={() => setUser(null)} className="bg-slate-900 text-white px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all shadow-md">Logout</button>
      </header>
      {user.role === 'admin' ? <AdminPanel /> : <DocentePanel docente={user} />}
    </div>
  );
}
function AdminPanel() {
  const [tab, setTab] = useState('docenti');
  const [data, setData] = useState({ docenti: [], impegni: [], piani: [], docs: [] });
  const [selDoc, setSelDoc] = useState<any>(null);
  const [activeImp, setActiveImp] = useState<string | null>(null);
  
  const [formDoc, setFormDoc] = useState({ nome: '', contratto: 'INTERA', ore: 18, mesi: 9 });
  const [formImp, setFormImp] = useState({ titolo: '', data: '', ore: 2, tipo: 'A' });

  const loadData = useCallback(async () => {
    const [d, i, p, dc] = await Promise.all([
      supabase.from('docenti').select('*').order('nome'),
      supabase.from('impegni').select('*').order('data', { ascending: false }),
      supabase.from('piani').select('*'),
      supabase.from('documenti').select('*').order('created_at', { ascending: false })
    ]);
    setData({ docenti: d.data || [], impegni: i.data || [], piani: p.data || [], docs: dc.data || [] });
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const saveDocente = async () => {
    if (!formDoc.nome) return alert("Nome obbligatorio");
    const cod = Math.random().toString(36).substring(2, 7).toUpperCase();
    const baseOre = formDoc.contratto === 'INTERA' ? 80 : (80 / 18) * formDoc.ore;
    const oreP = baseOre * (formDoc.mesi / 9);
    const { error } = await supabase.from('docenti').insert([{
      nome: formDoc.nome, codice_accesso: cod, contratto: formDoc.contratto,
      ore_settimanali: formDoc.ore, mesi_servizio: formDoc.mesi,
      ore_a_dovute: Math.floor(oreP / 2), ore_b_dovute: Math.ceil(oreP / 2)
    }]);
    if (!error) { alert("Creato Codice: " + cod); setTab('docenti'); loadData(); }
  };

  const saveImpegno = async () => {
    if (!formImp.titolo || !formImp.data) return alert("Compila tutto");
    const { error } = await supabase.from('impegni').insert([{
      titolo: formImp.titolo, data: formImp.data, durata_max: Number(formImp.ore), tipo: formImp.tipo
    }]);
    if (!error) { alert("Impegno Pubblicato"); setTab('appello'); loadData(); }
  };

  return (
    <main className="max-w-[1600px] mx-auto p-8">
      <nav className="flex flex-wrap gap-3 mb-12 justify-center">
        {['docenti', 'nuovo_doc', 'impegni', 'appello', 'documenti'].map(t => (
          <button key={t} onClick={() => {setTab(t); setSelDoc(null)}} className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${tab === t ? 'bg-blue-800 text-white border-blue-800 shadow-lg scale-105' : 'bg-white text-slate-400 border-transparent hover:text-slate-900'}`}>
            {t.replace('_', ' ')}
          </button>
        ))}
      </nav>

      {tab === 'docenti' && !selDoc && (
        <div className="grid gap-4 animate-in fade-in">
          {data.docenti.map((d: any) => (
            <div key={d.id} className="bg-white p-6 rounded-[3rem] border flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
              <div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-800">{d.nome}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cod: {d.codice_accesso} • {d.contratto} • {d.ore_settimanali}H</p>
              </div>
              <button onClick={() => setSelDoc(d)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-md hover:bg-blue-800">Gestisci</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'nuovo_doc' && (
        <div className="max-w-2xl mx-auto bg-white p-12 rounded-[4rem] shadow-2xl border animate-in zoom-in">
          <h2 className="text-3xl font-black mb-8 uppercase italic text-blue-800">Nuovo Membro Staff</h2>
          <div className="space-y-6">
            <input type="text" placeholder="NOMINATIVO" className="w-full p-6 bg-slate-50 rounded-2xl font-bold uppercase outline-none border-2 focus:border-blue-500" value={formDoc.nome} onChange={e => setFormDoc({...formDoc, nome: e.target.value})} />
            <select className="w-full p-6 bg-slate-50 rounded-2xl font-bold uppercase outline-none border-2 appearance-none cursor-pointer" value={formDoc.contratto} onChange={e => setFormDoc({...formDoc, contratto: e.target.value})}>
              <option value="INTERA">CATTEDRA INTERA (18H)</option>
              <option value="COMPLETAMENTO">COMPLETAMENTO</option>
              <option value="SPEZZONE">SPEZZONE / PART-TIME</option>
            </select>
            <div className="grid grid-cols-2 gap-4">
              <input type="number" placeholder="ORE SETT." className="p-6 bg-slate-50 rounded-2xl font-bold outline-none border-2" value={formDoc.ore} onChange={e => setFormDoc({...formDoc, ore: Number(e.target.value)})} />
              <input type="number" placeholder="MESI" className="p-6 bg-slate-50 rounded-2xl font-bold outline-none border-2" value={formDoc.mesi} onChange={e => setFormDoc({...formDoc, mesi: Number(e.target.value)})} />
            </div>
            <button onClick={saveDocente} className="w-full bg-blue-700 text-white p-8 rounded-3xl font-black uppercase text-xl shadow-xl active:scale-95 transition-all">Genera Accesso</button>
          </div>
        </div>
      )}

      {tab === 'impegni' && (
        <div className="max-w-2xl mx-auto bg-white p-12 rounded-[4rem] shadow-2xl border animate-in zoom-in">
          <h2 className="text-3xl font-black mb-8 uppercase italic text-orange-600">Crea Attività</h2>
          <div className="space-y-6">
            <input type="text" placeholder="TITOLO (ES. CDD)" className="w-full p-6 bg-slate-50 rounded-2xl font-bold uppercase outline-none focus:border-orange-500 border-2" value={formImp.titolo} onChange={e => setFormImp({...formImp, titolo: e.target.value})} />
            <input type="date" className="w-full p-6 bg-slate-50 rounded-2xl font-bold outline-none" value={formImp.data} onChange={e => setFormImp({...formImp, data: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
              <input type="number" step="0.5" placeholder="ORE" className="p-6 bg-slate-50 rounded-2xl font-bold outline-none" value={formImp.ore} onChange={e => setFormImp({...formImp, ore: Number(e.target.value)})} />
              <select className="p-6 bg-slate-50 rounded-2xl font-bold outline-none border-2" value={formImp.tipo} onChange={e => setFormImp({...formImp, tipo: e.target.value})}>
                <option value="A">COMMA A</option>
                <option value="B">COMMA B</option>
              </select>
            </div>
            <button onClick={saveImpegno} className="w-full bg-orange-600 text-white p-8 rounded-3xl font-black uppercase text-xl shadow-xl">Pubblica Calendario</button>
          </div>
        </div>
      )}

      {tab === 'appello' && (
        <div className="grid lg:grid-cols-2 gap-8 animate-in fade-in">
          <div className="space-y-4">
            {data.impegni.map((i: any) => (
              <div key={i.id} onClick={() => setActiveImp(i.id)} className={`p-8 rounded-[3rem] border-4 cursor-pointer transition-all ${activeImp === i.id ? 'border-blue-700 bg-white shadow-xl scale-[1.02]' : 'border-transparent bg-white/50 shadow-sm'}`}>
                <span className={`text-[9px] font-black px-3 py-1 rounded-full mb-3 inline-block ${i.tipo === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>COMMA {i.tipo}</span>
                <h4 className="font-black uppercase text-xl tracking-tighter">{i.titolo}</h4>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase italic">{i.data} • Max {i.durata_max}H</p>
              </div>
            ))}
          </div>
          <div className="bg-white p-10 rounded-[4rem] shadow-2xl border sticky top-32">
            <h3 className="font-black uppercase mb-10 text-2xl italic tracking-tighter underline decoration-4 decoration-blue-100 underline-offset-8">Validazione Ore</h3>
            <div className="space-y-4">
              {data.piani.filter((p: any) => p.impegno_id === activeImp).map((p: any) => {
                const d = data.docenti.find((x: any) => x.id === p.docente_id);
                return (
                  <div key={p.id} className="flex justify-between items-center p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <div>
                      <span className="font-black uppercase text-sm text-slate-800 leading-none">{d?.nome}</span>
                      <p className="text-[10px] font-bold text-blue-600 mt-1 uppercase">Dichiarate: {p.ore_effettive}H</p>
                    </div>
                    <button onClick={async () => { await supabase.from('piani').update({ presente: !p.presente }).eq('id', p.id); loadData(); }} className={`px-8 py-3 rounded-full font-black text-[10px] uppercase transition-all shadow-md ${p.presente ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
                      {p.presente ? 'Validato ✓' : 'Da Validare'}
                    </button>
                  </div>
                );
              })}
              {!activeImp && <p className="text-center py-20 text-slate-300 font-black uppercase text-xs tracking-widest">Seleziona un'attività a sinistra</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'documenti' && (
        <div className="bg-white p-12 rounded-[5rem] shadow-2xl border animate-in zoom-in">
          <div className="bg-slate-50 p-10 rounded-[3rem] border-4 border-dashed border-slate-200 text-center mb-12">
            <input type="file" className="block w-full text-sm text-slate-500 file:mr-6 file:py-4 file:px-10 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-slate-900 file:text-white hover:file:bg-blue-700 transition-all cursor-pointer" onChange={async (e) => {
              const file = e.target.files?.[0];
              if(!file) return;
              const path = `${Date.now()}_${file.name}`;
              const { error: upErr } = await supabase.storage.from('files').upload(path, file);
              if(upErr) return alert("Errore Storage: Verifica bucket 'files' e policy Public.");
              const { data: { publicUrl } } = supabase.storage.from('files').getPublicUrl(path);
              await supabase.from('documenti').insert([{ nome: file.name, url: publicUrl, storage_path: path }]);
              loadData();
            }} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.docs.map((doc: any) => (
              <div key={doc.id} className="flex justify-between items-center p-6 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all">
                <span className="font-black uppercase text-[11px] text-slate-800 tracking-tighter truncate max-w-[200px]">{doc.nome}</span>
                <div className="flex gap-4">
                  <a href={doc.url} target="_blank" className="text-blue-600 font-black text-[10px] uppercase tracking-widest hover:underline">Apri</a>
                  <button onClick={async () => { if(confirm("Eliminare?")) { await supabase.storage.from('files').remove([doc.storage_path]); await supabase.from('documenti').delete().eq('id', doc.id); loadData(); }}} className="text-red-500 font-black text-[10px] uppercase tracking-widest">Rimuovi</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selDoc && (
        <div className="mt-20 border-t-[10px] border-slate-900 pt-16 animate-in slide-in-from-bottom-20">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-4xl font-black uppercase italic tracking-tighter bg-slate-900 text-white px-10 py-4 rounded-full shadow-2xl">Supervisione Docente</h2>
            <button onClick={() => setSelDoc(null)} className="text-slate-400 font-black uppercase text-xs hover:text-red-600">Chiudi Editor ×</button>
          </div>
          <DocentePanel docente={selDoc} adminMode={true} />
        </div>
      )}
    </main>
  );
}
function DocentePanel({ docente, adminMode = false }: any) {
  const [impegni, setImpegni] = useState<any[]>([]);
  const [piani, setPiani] = useState<any[]>([]);
  const [tab, setTab] = useState('p');

  const load = useCallback(async () => {
    const [i, p] = await Promise.all([
      supabase.from('impegni').select('*').order('data', { ascending: false }),
      supabase.from('piani').select('*').eq('docente_id', docente.id)
    ]);
    setImpegni(i.data || []); 
    setPiani(p.data || []);
  }, [docente.id]);

  useEffect(() => { load(); }, [load]);

  const stats = {
    pA: piani.filter(p => p.tipo === 'A').reduce((s, c) => s + c.ore_effettive, 0),
    vA: piani.filter(p => p.tipo === 'A' && p.presente).reduce((s, c) => s + c.ore_effettive, 0),
    pB: piani.filter(p => p.tipo === 'B').reduce((s, c) => s + c.ore_effettive, 0),
    vB: piani.filter(p => p.tipo === 'B' && p.presente).reduce((s, c) => s + c.ore_effettive, 0)
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Header Profilo e Statistiche */}
      <div className="bg-white p-10 md:p-14 rounded-[4rem] shadow-2xl flex flex-wrap justify-between items-center gap-10 border-t-[15px] border-blue-700">
        {!adminMode && (
          <div className="flex items-center gap-8">
            <div className="w-20 h-20 bg-blue-800 rounded-3xl flex items-center justify-center text-white font-black text-4xl shadow-xl italic">{docente.nome[0]}</div>
            <div>
              <h2 className="text-5xl font-black uppercase italic tracking-tighter text-slate-800">{docente.nome}</h2>
              <p className="text-blue-600 font-black uppercase text-[11px] tracking-[0.3em] mt-2">{docente.contratto} • {docente.ore_settimanali}H SETTIMANALI</p>
            </div>
          </div>
        )}
        
        <div className="flex gap-4">
          <StatMini label="COMMA A (40H)" val={stats.vA} max={docente.ore_a_dovute} col="blue" pian={stats.pA} />
          <StatMini label="COMMA B (40H)" val={stats.vB} max={docente.ore_b_dovute} col="indigo" pian={stats.pB} />
        </div>

        <div className="flex gap-2 bg-slate-100 p-2 rounded-full shadow-inner print:hidden">
          <button onClick={() => setTab('p')} className={`px-8 py-3 rounded-full font-black text-[10px] uppercase transition-all ${tab === 'p' ? 'bg-white shadow-md text-blue-700' : 'text-slate-400'}`}>Piano Ore</button>
          <button onClick={() => setTab('r')} className={`px-8 py-3 rounded-full font-black text-[10px] uppercase transition-all ${tab === 'r' ? 'bg-slate-900 shadow-md text-white' : 'text-slate-400'}`}>Report PDF</button>
        </div>
      </div>

      {/* Tab: Pianificazione */}
      {tab === 'p' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-10">
          {impegni.map(i => {
            const p = piani.find(x => x.impegno_id === i.id);
            return (
              <div key={i.id} className={`p-8 bg-white rounded-[3.5rem] shadow-lg border-4 transition-all flex flex-col justify-between min-h-[300px] ${p ? 'border-blue-700 bg-blue-50/10' : 'border-transparent'}`}>
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <span className={`text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${i.tipo === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>COMMA {i.tipo}</span>
                    {p?.presente && <div className="bg-emerald-500 text-white p-2 rounded-full shadow-lg scale-90"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg></div>}
                  </div>
                  <h4 className="font-black uppercase text-2xl tracking-tighter leading-tight text-slate-800">{i.titolo}</h4>
                  <p className="text-[11px] font-bold text-slate-400 mt-2 uppercase italic tracking-tighter">{i.data} • Previste {i.durata_max}h</p>
                </div>

                <div className="mt-8 pt-6 border-t-2 border-slate-50 flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-[8px] font-black text-slate-300 uppercase mb-1">Ore Eff.</p>
                    <input id={`h-${i.id}`} type="number" step="0.5" defaultValue={p ? p.ore_effettive : i.durata_max} disabled={p?.presente && !adminMode} className="w-16 p-3 bg-slate-100 rounded-2xl font-black text-xl text-center outline-none focus:ring-2 ring-blue-500" />
                  </div>
                  <button 
                    onClick={async () => {
                      const h = (document.getElementById(`h-${i.id}`) as HTMLInputElement).value;
                      if(p) { 
                        if(p.presente && !adminMode) return; 
                        await supabase.from('piani').delete().eq('id', p.id); 
                      } else { 
                        await supabase.from('piani').insert([{ docente_id: docente.id, impegno_id: i.id, ore_effettive: Number(h), tipo: i.tipo, presente: false }]); 
                      }
                      load();
                    }}
                    className={`flex-1 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 ${p ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-slate-900 text-white hover:bg-blue-800'}`}
                  >
                    {p ? 'Rimuovi Dichiarazione' : 'Invia Presenza'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Report PDF Certificato */}
      {tab === 'r' && (
        <div className="bg-white p-12 md:p-24 rounded-[5rem] shadow-2xl border print:border-none print:shadow-none animate-in zoom-in">
          <div className="border-b-[12px] border-slate-900 pb-12 mb-12 flex justify-between items-end">
            <div>
              <h1 className="text-7xl font-black uppercase italic tracking-tighter leading-none text-slate-900">PROSPETTO ORE</h1>
              <p className="text-blue-700 font-black text-2xl mt-4 uppercase tracking-tighter">{docente.nome} • A.S. 2025/2026</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-slate-300 uppercase tracking-[0.5em]">Secret Document</p>
              <p className="text-xl font-black text-slate-900 italic uppercase">S-PRO ENGINE V3</p>
            </div>
          </div>
          
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black uppercase text-slate-400 border-b-4 border-slate-50">
                <th className="py-8">Descrizione Attività</th>
                <th className="py-8 text-center">Tipo</th>
                <th className="py-8 text-right">Ore Certificate</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-50">
              {piani.filter(p => p.presente).map(p => {
                const i = impegni.find(x => x.id === p.impegno_id);
                return (
                  <tr key={p.id}>
                    <td className="py-8 font-black uppercase text-xl italic tracking-tighter text-slate-700">{i?.titolo}</td>
                    <td className="py-8 text-center font-black text-[10px] text-slate-400">COMMA {p.tipo}</td>
                    <td className="py-8 text-right font-black text-4xl italic text-blue-800">{p.ore_effettive.toFixed(1)}H</td>
                  </tr>
                );
              })}
              <tr className="bg-slate-900 text-white">
                <td colSpan={2} className="p-12 font-black uppercase text-2xl italic tracking-widest">Totale Ore Maturate</td>
                <td className="p-12 text-right font-black text-8xl italic text-blue-400 tracking-tighter">{(stats.vA + stats.vB).toFixed(1)}H</td>
              </tr>
            </tbody>
          </table>
          <button onClick={() => window.print()} className="w-full mt-16 bg-blue-700 text-white p-10 rounded-[3rem] font-black text-3xl uppercase shadow-2xl print:hidden hover:bg-slate-900 transition-all">Scarica PDF / Stampa</button>
        </div>
      )}
    </div>
  );
}

function StatMini({ label, val, max, col, pian = 0 }: any) {
  const c = col === 'blue' ? 'text-blue-700' : 'text-indigo-700';
  const bg = col === 'blue' ? 'bg-blue-50' : 'bg-indigo-50';
  return (
    <div className={`${bg} px-8 py-5 rounded-[2.5rem] border-2 border-white text-center min-w-[160px] shadow-sm`}>
      <p className="text-[8px] font-black text-slate-400 uppercase mb-2 tracking-widest">{label}</p>
      <div className="flex justify-center items-baseline gap-1">
        <p className={`text-4xl font-black italic tracking-tighter ${c}`}>{val}</p>
        <p className="text-[10px] font-bold text-slate-300">/ {max}H</p>
      </div>
      {pian > val && <p className="text-[7px] font-black text-orange-600 uppercase mt-1 italic leading-none">Pianificate: {pian}h</p>}
    </div>
  );
}
