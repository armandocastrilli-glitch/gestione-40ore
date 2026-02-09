"use client";
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function SProV3_Evolution() {
  const [user, setUser] = useState<any>(null);
  const [loginCode, setLoginCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const code = loginCode.trim().toUpperCase();
    if (!code) return;
    setLoading(true);
    if (code === 'ADMIN123') {
      setUser({ id: 'admin', nome: 'Direzione Strategica', role: 'admin' });
    } else {
      const { data, error } = await supabase.from('docenti').select('*').eq('codice_accesso', code).single();
      if (data) setUser(data);
      else alert("Codice errato o utente non trovato.");
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
        <div className="bg-white p-10 md:p-16 rounded-[4rem] shadow-2xl w-full max-w-xl border-[16px] border-slate-100/50">
          <div className="text-center mb-12">
            <h1 className="text-7xl font-black italic tracking-[ -0.1em] text-blue-700 uppercase leading-none">S-PRO</h1>
            <div className="h-2 w-24 bg-blue-700 mx-auto mt-4 rounded-full"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.6em] mt-6">Secure Access Gateway</p>
          </div>
          <div className="space-y-6">
            <input 
              type="text" placeholder="ENTER ACCESS CODE" 
              className="w-full p-8 bg-slate-50 border-4 border-transparent focus:border-blue-600 rounded-[2.5rem] text-center text-4xl font-mono uppercase outline-none transition-all shadow-inner"
              value={loginCode} onChange={(e) => setLoginCode(e.target.value)}
            />
            <button onClick={handleLogin} className="w-full bg-blue-600 text-white p-8 rounded-[2.5rem] font-black text-2xl hover:bg-slate-900 transition-all uppercase shadow-2xl shadow-blue-200 active:scale-95">
              {loading ? 'Verifying...' : 'Authenticate'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900 font-sans selection:bg-blue-200">
      <header className="bg-white/90 backdrop-blur-2xl border-b border-slate-200 sticky top-0 z-[100] px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black italic text-xl shadow-lg">S</div>
          <div>
            <h2 className="text-md font-black uppercase tracking-tighter leading-none">{user.nome}</h2>
            <p className="text-[8px] font-bold text-blue-600 uppercase tracking-widest mt-1">{user.role === 'admin' ? 'System Administrator' : 'Academic Staff'}</p>
          </div>
        </div>
        <button onClick={() => setUser(null)} className="bg-white text-red-600 px-6 py-2 rounded-full font-black text-[10px] uppercase border-2 border-red-50 hover:bg-red-600 hover:text-white transition-all shadow-sm">Sign Out</button>
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

  const refreshData = useCallback(async () => {
    const [d, i, p, dc] = await Promise.all([
      supabase.from('docenti').select('*').order('nome'),
      supabase.from('impegni').select('*').order('data', { ascending: false }),
      supabase.from('piani').select('*'),
      supabase.from('documenti').select('*').order('created_at', { ascending: false })
    ]);
    setData({ docenti: d.data || [], impegni: i.data || [], piani: p.data || [], docs: dc.data || [] });
  }, []);

  useEffect(() => { refreshData(); }, [refreshData]);

  const saveDocente = async () => {
    if (!formDoc.nome) return alert("Missing Name");
    const cod = Math.random().toString(36).substring(2, 7).toUpperCase();
    const oreP = (formDoc.contratto === 'INTERA' ? 80 : (80 / 18) * formDoc.ore) * (formDoc.mesi / 9);
    const { error } = await supabase.from('docenti').insert([{
      nome: formDoc.nome, codice_accesso: cod, contratto: formDoc.contratto,
      ore_settimanali: formDoc.ore, mesi_servizio: formDoc.mesi,
      ore_a_dovute: Math.floor(oreP / 2), ore_b_dovute: Math.ceil(oreP / 2)
    }]);
    if (!error) { alert("DOCENTE SALVATO - CODICE: " + cod); setTab('docenti'); refreshData(); }
  };

  const deleteImpegno = async (id: string) => {
    if (!confirm("Eliminando l'impegno cancellerai anche tutte le ore pianificate dai docenti per questa data. Procedere?")) return;
    await supabase.from('piani').delete().eq('impegno_id', id);
    await supabase.from('impegni').delete().eq('id', id);
    refreshData();
  };

  return (
    <main className="max-w-[1600px] mx-auto p-6 md:p-10">
      <nav className="flex flex-wrap gap-3 mb-12 justify-center">
        {['docenti', 'nuovo_doc', 'impegni', 'appello', 'documenti'].map(t => (
          <button 
            key={t} onClick={() => {setTab(t); setSelDoc(null)}}
            className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-sm border-2 ${tab === t ? 'bg-blue-600 border-blue-600 text-white scale-105 shadow-blue-100' : 'bg-white border-transparent text-slate-400 hover:bg-slate-50'}`}
          >
            {t.replace('_', ' ')}
          </button>
        ))}
      </nav>

      {tab === 'docenti' && !selDoc && (
        <div className="grid grid-cols-1 gap-4 animate-in slide-in-from-bottom-5">
          {data.docenti.map((d: any) => {
            const dp = data.piani.filter((p: any) => p.docente_id === d.id);
            const vA = dp.filter((p: any) => p.tipo === 'A' && p.presente).reduce((s, c: any) => s + c.ore_effettive, 0);
            const vB = dp.filter((p: any) => p.tipo === 'B' && p.presente).reduce((s, c: any) => s + c.ore_effettive, 0);
            return (
              <div key={d.id} className="bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-6 hover:shadow-xl transition-all">
                <div className="flex-1">
                  <h3 className="text-xl font-black uppercase text-slate-800 leading-none italic">{d.nome}</h3>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-2 py-1 rounded-md">{d.contratto}</span>
                    <span className="text-[8px] font-black bg-slate-50 text-slate-400 px-2 py-1 rounded-md">CODE: {d.codice_accesso}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <AdminStatMini label="COMMA A" val={vA} max={d.ore_a_dovute} color="blue" />
                  <AdminStatMini label="COMMA B" val={vB} max={d.ore_b_dovute} color="indigo" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setSelDoc(d)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-600">Gestisci</button>
                  <button onClick={async () => {if(confirm("Eliminare docente?")) { await supabase.from('docenti').delete().eq('id', d.id); refreshData(); }}} className="bg-red-50 text-red-500 p-3 rounded-xl hover:bg-red-500 hover:text-white transition-all"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M4 8V4h12v4h2v2h-2v10H4V10H2V8h2zm2 2v8h8v-8H6zm2-4h4V4H8v2z"/></svg></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'nuovo_doc' && (
        <div className="max-w-2xl mx-auto bg-white p-12 rounded-[4rem] shadow-2xl border border-slate-50">
          <h2 className="text-3xl font-black mb-10 text-center uppercase italic text-emerald-600">Nuova Anagrafica</h2>
          <div className="space-y-6">
            <input type="text" placeholder="FULL NAME" className="w-full p-6 bg-slate-50 rounded-[2rem] font-black text-xl uppercase border-4 border-transparent focus:border-emerald-500 outline-none" value={formDoc.nome} onChange={e => setFormDoc({...formDoc, nome: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
              <select className="p-6 bg-slate-50 rounded-[2rem] font-black uppercase border-4 border-transparent focus:border-emerald-500 outline-none appearance-none" value={formDoc.contratto} onChange={e => setFormDoc({...formDoc, contratto: e.target.value})}>
                <option value="INTERA">INTERA (18H)</option>
                <option value="COMPLETAMENTO">COMPLETAMENTO</option>
                <option value="SPEZZONE">SPEZZONE</option>
              </select>
              <input type="number" placeholder="WEEKLY HOURS" className="p-6 bg-slate-50 rounded-[2rem] font-black text-center border-4 border-transparent focus:border-emerald-500 outline-none" value={formDoc.ore} onChange={e => setFormDoc({...formDoc, ore: Number(e.target.value)})} />
            </div>
            <div className="bg-slate-50 p-8 rounded-[2rem]">
               <label className="text-[9px] font-black text-slate-400 uppercase block mb-4 text-center">Active Service Months (1-9)</label>
               <input type="range" min="1" max="9" value={formDoc.mesi} onChange={e => setFormDoc({...formDoc, mesi: Number(e.target.value)})} className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer accent-emerald-600" />
               <p className="text-3xl font-black text-emerald-600 mt-4 text-center italic">{formDoc.mesi} MONTHS</p>
            </div>
            <button onClick={saveDocente} className="w-full bg-emerald-600 text-white p-8 rounded-[2.5rem] font-black text-xl uppercase shadow-xl hover:bg-slate-900 transition-all">Create Profile</button>
          </div>
        </div>
      )}

      {tab === 'impegni' && (
        <div className="max-w-2xl mx-auto bg-white p-12 rounded-[4rem] shadow-2xl border">
          <h2 className="text-3xl font-black mb-10 text-center uppercase italic text-orange-600">Crea Attività Collegiale</h2>
          <div className="space-y-4">
            <input id="tI" type="text" placeholder="DESCRIPTION" className="w-full p-6 bg-slate-50 rounded-[2rem] font-black uppercase border-4 border-transparent focus:border-orange-500 outline-none" />
            <div className="grid grid-cols-2 gap-4">
              <input id="dI" type="date" className="p-6 bg-slate-50 rounded-[2rem] font-black border-4 border-transparent focus:border-orange-500 outline-none" />
              <input id="hI" type="number" step="0.5" placeholder="MAX HOURS" className="p-6 bg-slate-50 rounded-[2rem] font-black border-4 border-transparent focus:border-orange-500 outline-none text-center" />
            </div>
            <div className="flex gap-3 p-2 bg-slate-100 rounded-[2rem]">
               <button onClick={() => (window as any).tmpT = 'A'} className="flex-1 py-4 rounded-xl font-black text-[9px] uppercase transition-all bg-white shadow-sm focus:bg-blue-600 focus:text-white">Comma A</button>
               <button onClick={() => (window as any).tmpT = 'B'} className="flex-1 py-4 rounded-xl font-black text-[9px] uppercase transition-all bg-white shadow-sm focus:bg-indigo-600 focus:text-white">Comma B</button>
            </div>
            <button onClick={async () => {
              const t = (document.getElementById('tI') as HTMLInputElement).value;
              const d = (document.getElementById('dI') as HTMLInputElement).value;
              const h = (document.getElementById('hI') as HTMLInputElement).value;
              const tip = (window as any).tmpT || 'A';
              if(!t || !d || !h) return alert("Missing Data");
              await supabase.from('impegni').insert([{ titolo: t, data: d, durata_max: Number(h), tipo: tip }]);
              refreshData(); setTab('docenti');
            }} className="w-full bg-orange-600 text-white p-8 rounded-[2.5rem] font-black text-xl uppercase shadow-xl hover:bg-slate-900 transition-all">Publish Activity</button>
          </div>
        </div>
      )}
      {tab === 'appello' && (
        <div className="grid lg:grid-cols-2 gap-10 animate-in fade-in duration-500">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase text-slate-400 ml-6 tracking-[0.4em]">Archivio Impegni</h3>
            {data.impegni.map((i: any) => (
              <div 
                key={i.id} onClick={() => setActiveImp(i.id)}
                className={`p-8 rounded-[3rem] border-4 cursor-pointer transition-all flex justify-between items-center group ${activeImp === i.id ? 'bg-white border-indigo-600 shadow-2xl scale-[1.02]' : 'bg-white border-transparent shadow-sm'}`}
              >
                <div>
                  <span className={`text-[8px] font-black px-3 py-1 rounded-full mb-2 inline-block ${i.tipo === 'A' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>COMMA {i.tipo}</span>
                  <h4 className="font-black uppercase text-lg tracking-tighter">{i.titolo}</h4>
                  <p className="text-[10px] font-bold text-slate-400">{i.data} • Max {i.durata_max}h</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteImpegno(i.id); }} className="text-red-200 hover:text-red-600 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"/></svg>
                </button>
              </div>
            ))}
          </div>
          <div className="bg-white p-10 rounded-[4rem] shadow-2xl border min-h-[500px] sticky top-32">
            <h3 className="text-2xl font-black mb-8 uppercase text-indigo-600 italic tracking-tighter">Validazione Ore</h3>
            <div className="space-y-2">
              {data.piani.filter((p: any) => p.impegno_id === activeImp).map((p: any) => {
                const doc = data.docenti.find((d: any) => d.id === p.docente_id);
                return (
                  <div key={p.id} className="flex justify-between items-center p-5 bg-slate-50 rounded-[2rem] border-2 border-transparent hover:border-slate-200 transition-all">
                    <div>
                      <p className="font-black uppercase text-xs text-slate-700">{doc?.nome}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase italic">Dichiarate: {p.ore_effettive}h</p>
                    </div>
                    <button 
                      onClick={async () => { await supabase.from('piani').update({ presente: !p.presente }).eq('id', p.id); refreshData(); }}
                      className={`px-6 py-3 rounded-xl font-black text-[9px] uppercase shadow-md transition-all ${p.presente ? 'bg-emerald-500 text-white' : 'bg-white text-slate-300 border'}`}
                    >
                      {p.presente ? 'Validato ✓' : 'Da Validare'}
                    </button>
                  </div>
                );
              })}
              {!activeImp && <div className="text-center py-40 opacity-20 font-black uppercase italic tracking-widest text-sm">Seleziona un impegno a sinistra</div>}
            </div>
          </div>
        </div>
      )}

      {tab === 'documenti' && (
        <div className="bg-white p-16 rounded-[5rem] shadow-2xl border animate-in zoom-in duration-500">
          <div className="grid lg:grid-cols-2 gap-16">
            <div className="bg-slate-50 p-16 rounded-[4rem] border-8 border-dashed border-slate-200 text-center group">
               <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-xl shadow-blue-100">
                 <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
               </div>
               <p className="font-black uppercase text-xs text-slate-400 mb-8 tracking-widest">Storage System (Bucket: files)</p>
               <input type="file" className="block w-full text-xs text-slate-400 file:mr-4 file:py-3 file:px-8 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-slate-900 file:text-white hover:file:bg-blue-600 cursor-pointer" onChange={async (e) => {
                 const file = e.target.files?.[0];
                 if(!file) return;
                 const path = `${Date.now()}_${file.name}`;
                 const { error: upErr } = await supabase.storage.from('files').upload(path, file);
                 if(upErr) return alert("Errore Storage: " + upErr.message);
                 const { data: { publicUrl } } = supabase.storage.from('files').getPublicUrl(path);
                 await supabase.from('documenti').insert([{ nome: file.name, url: publicUrl, storage_path: path }]);
                 refreshData();
               }} />
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-300 ml-4 mb-6 tracking-widest italic">File Disponibili</h3>
              {data.docs.map((doc: any) => (
                <div key={doc.id} className="p-6 bg-white border-2 border-slate-50 rounded-[2.5rem] flex justify-between items-center shadow-sm group hover:border-blue-100 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center font-black text-[10px]">DOC</div>
                    <p className="font-black text-xs uppercase text-slate-700 tracking-tighter truncate max-w-[150px]">{doc.nome}</p>
                  </div>
                  <div className="flex gap-2">
                    <a href={doc.url} target="_blank" className="bg-blue-50 text-blue-600 px-5 py-2 rounded-xl font-black text-[8px] uppercase">Apri</a>
                    <button onClick={async () => {
                      if(!confirm("Eliminare definitivamente il file?")) return;
                      if(doc.storage_path) await supabase.storage.from('files').remove([doc.storage_path]);
                      await supabase.from('documenti').delete().eq('id', doc.id);
                      refreshData();
                    }} className="bg-red-50 text-red-500 px-5 py-2 rounded-xl font-black text-[8px] uppercase hover:bg-red-500 hover:text-white transition-all">Elimina</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selDoc && (
        <div className="mt-10 border-t-[12px] border-slate-900 pt-10">
           <div className="flex items-center justify-between mb-8 bg-blue-700 p-8 rounded-[3rem] text-white shadow-xl">
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">Gestione: {selDoc.nome}</h2>
              <button onClick={() => setSelDoc(null)} className="bg-white text-blue-700 px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg">Chiudi Sessione</button>
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
  const [docs, setDocs] = useState<any[]>([]);
  const [tab, setTab] = useState('p');

  const load = useCallback(async () => {
    const [i, p, d] = await Promise.all([
      supabase.from('impegni').select('*').order('data', { ascending: false }),
      supabase.from('piani').select('*').eq('docente_id', docente.id),
      supabase.from('documenti').select('*').order('created_at', { ascending: false })
    ]);
    setImpegni(i.data || []); setPiani(p.data || []); setDocs(d.data || []);
  }, [docente.id]);

  useEffect(() => { load(); }, [load]);

  const vA = piani.filter(p => p.tipo === 'A' && p.presente).reduce((s, c) => s + c.ore_effettive, 0);
  const vB = piani.filter(p => p.tipo === 'B' && p.presente).reduce((s, c) => s + c.ore_effettive, 0);

  return (
    <div className="max-w-[1400px] mx-auto p-2">
      <div className={`bg-white rounded-[3.5rem] shadow-2xl border-l-[16px] border-blue-600 mb-8 flex flex-col lg:flex-row items-center justify-between gap-8 animate-in slide-in-from-top duration-500 ${adminMode ? 'p-6' : 'p-12'}`}>
        {!adminMode && (
          <div className="flex items-center gap-8">
            <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white font-black text-4xl italic shadow-2xl">{docente.nome[0]}</div>
            <div>
              <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none">{docente.nome}</h2>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mt-2">{docente.contratto} • {docente.ore_settimanali}H SETTIMANALI</p>
            </div>
          </div>
        )}
        <div className="flex gap-4">
          <button onClick={() => setTab('p')} className={`px-10 py-5 rounded-[2rem] font-black text-[10px] uppercase shadow-lg transition-all ${tab === 'p' ? 'bg-blue-600 text-white scale-105' : 'bg-white border text-slate-400'}`}>Pianificazione</button>
          <button onClick={() => setTab('d')} className={`px-10 py-5 rounded-[2rem] font-black text-[10px] uppercase shadow-lg transition-all ${tab === 'd' ? 'bg-blue-600 text-white scale-105' : 'bg-white border text-slate-400'}`}>Bacheca</button>
          <button onClick={() => setTab('r')} className={`px-10 py-5 rounded-[2rem] font-black text-[10px] uppercase shadow-lg transition-all ${tab === 'r' ? 'bg-slate-900 text-white scale-105' : 'bg-white border text-slate-400'}`}>PDF Report</button>
        </div>
        <div className="flex gap-6 border-l-4 border-slate-50 pl-8">
           <AdminStatMini label="COMMA A" val={vA} max={docente.ore_a_dovute} color="blue" />
           <AdminStatMini label="COMMA B" val={vB} max={docente.ore_b_dovute} color="indigo" />
        </div>
      </div>

      {tab === 'p' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {impegni.map(i => {
            const p = piani.find(x => x.impegno_id === i.id);
            return (
              <div key={i.id} className={`bg-white p-6 rounded-[2.5rem] border-2 transition-all flex flex-col justify-between gap-6 ${p ? 'border-blue-600 shadow-xl' : 'border-transparent shadow-sm'}`}>
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className={`text-[8px] font-black px-3 py-1 rounded-full uppercase ${i.tipo === 'A' ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'}`}>COMMA {i.tipo}</span>
                    {p?.presente && <span className="text-emerald-500 font-black text-[18px]">✓</span>}
                  </div>
                  <h4 className="text-lg font-black uppercase tracking-tighter leading-tight mb-1">{i.titolo}</h4>
                  <p className="text-[10px] font-bold text-slate-400 italic">{i.data}</p>
                </div>
                <div className="flex items-center gap-4 pt-4 border-t border-slate-50">
                  <input id={`ov-${i.id}`} type="number" step="0.5" defaultValue={p ? p.ore_effettive : i.durata_max} disabled={p?.presente && !adminMode} className="w-16 p-3 bg-slate-100 rounded-xl font-black text-xl text-center outline-none" />
                  <button 
                    onClick={async () => {
                      const h = (document.getElementById(`ov-${i.id}`) as HTMLInputElement).value;
                      if(p) { if(p.presente && !adminMode) return; await supabase.from('piani').delete().eq('id', p.id); }
                      else { await supabase.from('piani').insert([{ docente_id: docente.id, impegno_id: i.id, ore_effettive: Number(h), tipo: i.tipo, presente: false }]); }
                      load();
                    }}
                    className={`flex-1 py-4 rounded-2xl font-black text-[9px] uppercase transition-all ${p ? 'bg-red-50 text-red-500' : 'bg-slate-900 text-white'}`}
                  >
                    {p ? 'Rimuovi' : 'Pianifica'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'd' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 animate-in zoom-in">
           {docs.map(doc => (
              <a key={doc.id} href={doc.url} target="_blank" className="bg-white p-8 rounded-[3rem] border-2 border-slate-50 shadow-sm hover:shadow-2xl hover:border-blue-600 transition-all flex flex-col items-center text-center group">
                 <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2-2H6a2 2 0 01-2-2V4z"/></svg></div>
                 <h4 className="font-black uppercase text-[10px] tracking-tight truncate w-full">{doc.nome}</h4>
              </a>
           ))}
        </div>
      )}

      {tab === 'r' && (
        <div className="bg-white p-16 lg:p-24 rounded-[4rem] shadow-2xl border print:border-none print:shadow-none animate-in zoom-in">
          <div className="border-b-8 border-slate-900 pb-12 mb-12 flex flex-col md:flex-row justify-between items-end gap-10">
            <div>
              <h1 className="text-6xl font-black uppercase italic tracking-tighter leading-none mb-4">Final Report</h1>
              <span className="bg-blue-600 text-white px-8 py-3 rounded-full font-black text-xl uppercase italic shadow-lg">{docente.nome}</span>
            </div>
            <p className="text-3xl font-black italic text-slate-300">A.S. 2025/26</p>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black uppercase text-slate-300 border-b-4 border-slate-50">
                <th className="py-8">Descrizione Attività</th>
                <th className="py-8 text-center">Tipo</th>
                <th className="py-8 text-right">Ore</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-50">
              {piani.map(p => {
                const i = impegni.find(x => x.id === p.impegno_id);
                return (
                  <tr key={p.id}>
                    <td className="py-8 font-black uppercase text-sm italic">{i?.titolo}</td>
                    <td className="py-8 text-center font-black text-[10px] text-slate-400">COMMA {p.tipo}</td>
                    <td className="py-8 text-right font-black text-2xl italic">{(p.ore_effettive).toFixed(1)}H</td>
                  </tr>
                );
              })}
              <tr className="bg-slate-900 text-white">
                <td colSpan={2} className="p-12 font-black uppercase text-lg italic tracking-[0.3em]">Totale Ore Certificate</td>
                <td className="p-12 text-right font-black text-6xl italic text-blue-400">{(vA + vB).toFixed(1)}H</td>
              </tr>
            </tbody>
          </table>
          <button onClick={() => window.print()} className="w-full mt-16 bg-blue-600 text-white p-10 rounded-[2.5rem] font-black text-2xl uppercase shadow-2xl print:hidden hover:bg-slate-900 transition-all">Download PDF</button>
        </div>
      )}
    </div>
  );
}

function AdminStatMini({ label, val, max, color }: any) {
  const c = color === 'blue' ? 'text-blue-600' : 'text-indigo-600';
  const bg = color === 'blue' ? 'bg-blue-50' : 'bg-indigo-50';
  return (
    <div className={`${bg} px-6 py-4 rounded-2xl border border-white text-center min-w-[140px] shadow-sm`}>
      <p className="text-[8px] font-black text-slate-400 uppercase mb-2 tracking-widest">{label}</p>
      <p className={`text-xl font-black italic ${c}`}>{val} / {max}h</p>
      <div className="w-full h-1 bg-white/50 rounded-full mt-2 overflow-hidden">
        <div className={`h-full bg-current ${c}`} style={{width: `${Math.min((val/max)*100, 100)}%`}}></div>
      </div>
    </div>
  );
}
