"use client";
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function SProV3_Ultimate() {
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
      else alert("Codice non riconosciuto dal sistema.");
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
          <div className="space-y-8">
            <input 
              type="text" placeholder="ACCESS CODE" 
              className="w-full p-10 bg-slate-50 border-4 border-transparent focus:border-blue-600 rounded-[3rem] text-center text-5xl font-mono uppercase outline-none transition-all shadow-inner"
              value={loginCode} onChange={(e) => setLoginCode(e.target.value)}
            />
            <button onClick={handleLogin} className="w-full bg-blue-700 text-white p-10 rounded-[3rem] font-black text-3xl uppercase shadow-2xl shadow-blue-200 active:scale-95 transition-all">
              {loading ? 'WAIT...' : 'AUTHENTICATE'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      <header className="bg-white/80 backdrop-blur-3xl border-b border-slate-200 sticky top-0 z-[100] px-10 py-5 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-blue-800 rounded-[1.8rem] flex items-center justify-center text-white font-black italic text-3xl shadow-xl shadow-blue-100">S</div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter leading-none">{user.nome}</h2>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-2">{user.role === 'admin' ? 'Master Admin' : 'Academic Member'}</p>
          </div>
        </div>
        <button onClick={() => setUser(null)} className="bg-slate-900 text-white px-10 py-4 rounded-full font-black text-[11px] uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg">Logout</button>
      </header>
      {user.role === 'admin' ? <AdminEngine /> : <DocenteEngine docente={user} />}
    </div>
  );
}

function AdminEngine() {
  const [tab, setTab] = useState('docenti');
  const [data, setData] = useState({ docenti: [], impegni: [], piani: [], docs: [] });
  const [selDoc, setSelDoc] = useState<any>(null);
  const [activeImp, setActiveImp] = useState<string | null>(null);
  const [formDoc, setFormDoc] = useState({ nome: '', contratto: 'INTERA', ore: 18, mesi: 9 });

  const refresh = useCallback(async () => {
    const [d, i, p, dc] = await Promise.all([
      supabase.from('docenti').select('*').order('nome'),
      supabase.from('impegni').select('*').order('data', { ascending: false }),
      supabase.from('piani').select('*'),
      supabase.from('documenti').select('*').order('created_at', { ascending: false })
    ]);
    setData({ docenti: d.data || [], impegni: i.data || [], piani: p.data || [], docs: dc.data || [] });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const saveDocente = async () => {
    if (!formDoc.nome) return;
    const cod = Math.random().toString(36).substring(2, 7).toUpperCase();
    const oreP = (formDoc.contratto === 'INTERA' ? 80 : (80 / 18) * formDoc.ore) * (formDoc.mesi / 9);
    const { error } = await supabase.from('docenti').insert([{
      nome: formDoc.nome, codice_accesso: cod, contratto: formDoc.contratto,
      ore_settimanali: formDoc.ore, mesi_servizio: formDoc.mesi,
      ore_a_dovute: Math.floor(oreP / 2), ore_b_dovute: Math.ceil(oreP / 2)
    }]);
    if (!error) { alert("DOCENTE CREATO: " + cod); setTab('docenti'); refresh(); }
  };

  return (
    <main className="max-w-[1700px] mx-auto p-8 lg:p-12">
      <nav className="flex flex-wrap gap-4 mb-16 justify-center">
        {['docenti', 'nuovo_doc', 'impegni', 'appello', 'documenti'].map(t => (
          <button 
            key={t} onClick={() => {setTab(t); setSelDoc(null)}}
            className={`px-12 py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.25em] transition-all border-4 ${tab === t ? 'bg-blue-800 border-blue-800 text-white shadow-2xl scale-105' : 'bg-white border-transparent text-slate-300 hover:text-slate-900'}`}
          >
            {t.replace('_', ' ')}
          </button>
        ))}
      </nav>

      {tab === 'docenti' && !selDoc && (
        <div className="grid grid-cols-1 gap-6 animate-in slide-in-from-bottom-10">
          {data.docenti.map((d: any) => {
            const dp = data.piani.filter((p: any) => p.docente_id === d.id);
            const counts = {
              pA: dp.filter((p: any) => p.tipo === 'A').reduce((s, c: any) => s + c.ore_effettive, 0),
              vA: dp.filter((p: any) => p.tipo === 'A' && p.presente).reduce((s, c: any) => s + c.ore_effettive, 0),
              pB: dp.filter((p: any) => p.tipo === 'B').reduce((s, c: any) => s + c.ore_effettive, 0),
              vB: dp.filter((p: any) => p.tipo === 'B' && p.presente).reduce((s, c: any) => s + c.ore_effettive, 0)
            };
            return (
              <div key={d.id} className="bg-white p-8 rounded-[4rem] border border-slate-100 shadow-sm flex flex-col xl:flex-row items-center gap-10 hover:shadow-2xl transition-all group">
                <div className="flex-1">
                  <h3 className="text-4xl font-black uppercase text-slate-800 italic tracking-tighter leading-none">{d.nome}</h3>
                  <div className="flex gap-4 mt-4">
                    <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase italic border border-blue-100">{d.contratto}</span>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1">CODE: {d.codice_accesso}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatMini label="A PIANIF." val={counts.pA} max={d.ore_a_dovute} col="slate" />
                  <StatMini label="A VALID." val={counts.vA} max={d.ore_a_dovute} col="blue" />
                  <StatMini label="B PIANIF." val={counts.pB} max={d.ore_b_dovute} col="slate" />
                  <StatMini label="B VALID." val={counts.vB} max={d.ore_b_dovute} col="indigo" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setSelDoc(d)} className="bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-blue-800 transition-all">Gestisci</button>
                  <button onClick={async () => {if(confirm("Eliminare definitivamente?")) { await supabase.from('docenti').delete().eq('id', d.id); refresh(); }}} className="bg-red-50 text-red-500 p-5 rounded-[2rem] border border-red-100 hover:bg-red-600 hover:text-white transition-all"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M4 8V4h12v4h2v2h-2v10H4V10H2V8h2zm2 2v8h8v-8H6zm2-4h4V4H8v2z"/></svg></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {tab === 'nuovo_doc' && (
        <div className="max-w-4xl mx-auto bg-white p-20 rounded-[5rem] shadow-2xl border border-slate-50 animate-in zoom-in">
          <h2 className="text-5xl font-black mb-16 text-center uppercase italic text-emerald-600 tracking-tighter">Iscrizione Staff</h2>
          <div className="space-y-10">
            <input type="text" placeholder="NOMINATIVO DOCENTE" className="w-full p-10 bg-slate-50 rounded-[3rem] font-black text-3xl uppercase border-4 border-transparent focus:border-emerald-500 outline-none" value={formDoc.nome} onChange={e => setFormDoc({...formDoc, nome: e.target.value})} />
            <div className="grid grid-cols-2 gap-8">
              <select className="p-10 bg-slate-50 rounded-[3rem] font-black text-xl uppercase border-4 border-transparent focus:border-emerald-500 outline-none appearance-none" value={formDoc.contratto} onChange={e => setFormDoc({...formDoc, contratto: e.target.value})}>
                <option value="INTERA">INTERA (18H)</option>
                <option value="COMPLETAMENTO">COMPLETAMENTO</option>
                <option value="SPEZZONE">SPEZZONE</option>
              </select>
              <input type="number" placeholder="ORE SETT." className="p-10 bg-slate-50 rounded-[3rem] font-black text-3xl text-center border-4 border-transparent focus:border-emerald-500 outline-none" value={formDoc.ore} onChange={e => setFormDoc({...formDoc, ore: Number(e.target.value)})} />
            </div>
            <button onClick={saveDocente} className="w-full bg-emerald-600 text-white p-12 rounded-[3.5rem] font-black text-3xl uppercase shadow-2xl hover:bg-slate-900 transition-all">Genera Account</button>
          </div>
        </div>
      )}

      {tab === 'appello' && (
        <div className="grid lg:grid-cols-2 gap-12 animate-in fade-in duration-500">
          <div className="space-y-6">
            <h3 className="text-[12px] font-black uppercase text-slate-400 ml-8 tracking-[0.5em]">Attività Disponibili</h3>
            {data.impegni.map((i: any) => (
              <div 
                key={i.id} onClick={() => setActiveImp(i.id)}
                className={`p-10 rounded-[4rem] border-4 cursor-pointer transition-all flex justify-between items-center group ${activeImp === i.id ? 'bg-white border-blue-700 shadow-2xl scale-[1.02]' : 'bg-white border-transparent shadow-sm'}`}
              >
                <div>
                  <span className={`text-[10px] font-black px-4 py-1.5 rounded-full mb-4 inline-block ${i.tipo === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>COMMA {i.tipo}</span>
                  <h4 className="font-black uppercase text-2xl tracking-tighter leading-none">{i.titolo}</h4>
                  <p className="text-[12px] font-bold text-slate-400 mt-2">{i.data} • Max {i.durata_max}h</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); if(confirm("Eliminare impegno e tutte le ore pianificate?")) { supabase.from('piani').delete().eq('impegno_id', i.id).then(() => { supabase.from('impegni').delete().eq('id', i.id).then(refresh); }); } }} className="text-slate-200 hover:text-red-600 p-4 transition-colors">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"/></svg>
                </button>
              </div>
            ))}
          </div>
          <div className="bg-white p-12 rounded-[5rem] shadow-2xl border min-h-[600px] sticky top-32">
            <h3 className="text-3xl font-black mb-10 uppercase text-blue-800 italic tracking-tighter underline decoration-8 decoration-blue-50">Approvazione Ore</h3>
            <div className="space-y-3">
              {data.piani.filter((p: any) => p.impegno_id === activeImp).map((p: any) => {
                const doc = data.docenti.find((d: any) => d.id === p.docente_id);
                return (
                  <div key={p.id} className="flex justify-between items-center p-8 bg-slate-50 rounded-[3rem] border-2 border-transparent hover:border-blue-100 transition-all">
                    <div>
                      <p className="font-black uppercase text-lg text-slate-800 tracking-tighter leading-none">{doc?.nome}</p>
                      <p className="text-[11px] font-bold text-blue-500 mt-2 italic">Dichiarate: {p.ore_effettive}h</p>
                    </div>
                    <button 
                      onClick={async () => { await supabase.from('piani').update({ presente: !p.presente }).eq('id', p.id); refresh(); }}
                      className={`px-10 py-5 rounded-[2rem] font-black text-[11px] uppercase shadow-xl transition-all ${p.presente ? 'bg-emerald-500 text-white' : 'bg-white text-slate-300 border-2'}`}
                    >
                      {p.presente ? 'Approvato ✓' : 'In Attesa'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'documenti' && (
        <div className="bg-white p-20 rounded-[6rem] shadow-2xl border animate-in zoom-in">
          <div className="grid lg:grid-cols-2 gap-20">
            <div className="bg-slate-50 p-20 rounded-[5rem] border-[10px] border-dashed border-slate-200 text-center relative overflow-hidden group">
               <div className="w-28 h-28 bg-blue-800 rounded-full flex items-center justify-center mx-auto mb-10 text-white shadow-3xl group-hover:scale-110 transition-transform">
                 <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
               </div>
               <p className="font-black uppercase text-sm text-slate-400 mb-10 tracking-[0.3em]">Cloud File System</p>
               <input type="file" className="block w-full text-sm text-slate-400 file:mr-6 file:py-5 file:px-12 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-slate-900 file:text-white hover:file:bg-blue-700 cursor-pointer" onChange={async (e) => {
                 const file = e.target.files?.[0];
                 if(!file) return;
                 const path = `${Date.now()}_${file.name}`;
                 const { error: upErr } = await supabase.storage.from('files').upload(path, file);
                 if(upErr) return alert("ERRORE: Verifica che il bucket 'files' sia PUBLIC su Supabase.");
                 const { data: { publicUrl } } = supabase.storage.from('files').getPublicUrl(path);
                 await supabase.from('documenti').insert([{ nome: file.name, url: publicUrl, storage_path: path }]);
                 refresh();
               }} />
            </div>
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-300 ml-8 mb-8 tracking-[0.6em] italic">Archivio Digitale</h3>
              {data.docs.map((doc: any) => (
                <div key={doc.id} className="p-8 bg-white border-4 border-slate-50 rounded-[3.5rem] flex justify-between items-center shadow-sm hover:shadow-2xl hover:border-blue-100 transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-red-50 text-red-600 rounded-[1.5rem] flex items-center justify-center font-black text-xs">FILE</div>
                    <p className="font-black text-md uppercase text-slate-800 tracking-tighter truncate max-w-[150px]">{doc.nome}</p>
                  </div>
                  <div className="flex gap-3">
                    <a href={doc.url} target="_blank" className="bg-blue-50 text-blue-700 px-8 py-4 rounded-2xl font-black text-[10px] uppercase">Apri</a>
                    <button onClick={async () => { if(confirm("Eliminare definitivamente?")) { if(doc.storage_path) await supabase.storage.from('files').remove([doc.storage_path]); await supabase.from('documenti').delete().eq('id', doc.id); refresh(); }}} className="bg-red-50 text-red-500 px-8 py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-red-600 hover:text-white transition-all">Elimina</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selDoc && (
        <div className="mt-16 border-t-[20px] border-slate-900 pt-16">
           <div className="flex items-center justify-between mb-10 bg-slate-900 p-10 rounded-[4rem] text-white shadow-3xl animate-in slide-in-from-top-10">
              <h2 className="text-5xl font-black uppercase italic tracking-tighter leading-none">Supervisione: {selDoc.nome}</h2>
              <button onClick={() => setSelDoc(null)} className="bg-blue-700 text-white px-12 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest hover:bg-white hover:text-slate-900 transition-all">Chiudi Gestione</button>
           </div>
           <DocenteEngine docente={selDoc} adminMode={true} />
        </div>
      )}
    </main>
  );
}

function DocenteEngine({ docente, adminMode = false }: any) {
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

  const stats = {
    pA: piani.filter(p => p.tipo === 'A').reduce((s, c) => s + c.ore_effettive, 0),
    vA: piani.filter(p => p.tipo === 'A' && p.presente).reduce((s, c) => s + c.ore_effettive, 0),
    pB: piani.filter(p => p.tipo === 'B').reduce((s, c) => s + c.ore_effettive, 0),
    vB: piani.filter(p => p.tipo === 'B' && p.presente).reduce((s, c) => s + c.ore_effettive, 0)
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4">
      <div className={`bg-white rounded-[4rem] shadow-2xl border-t-[16px] border-blue-700 mb-12 flex flex-col lg:flex-row items-center justify-between gap-10 animate-in fade-in duration-700 ${adminMode ? 'p-8' : 'p-16'}`}>
        {!adminMode && (
          <div className="flex items-center gap-10">
            <div className="w-24 h-24 bg-blue-800 rounded-[2.5rem] flex items-center justify-center text-white font-black text-5xl italic shadow-2xl">{docente.nome[0]}</div>
            <div>
              <h2 className="text-5xl font-black uppercase italic tracking-tighter leading-none text-slate-800">{docente.nome}</h2>
              <p className="text-[11px] font-black text-blue-600 mt-4 tracking-[0.4em] uppercase">{docente.contratto} • {docente.ore_settimanali}H SETTIMANALI</p>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-4">
          {['p', 'd', 'r'].map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-12 py-5 rounded-[2.5rem] font-black text-[11px] uppercase tracking-widest shadow-xl transition-all ${tab === t ? 'bg-blue-700 text-white scale-105' : 'bg-white border-2 text-slate-300'}`}>
              {t === 'p' ? 'Piano Ore' : t === 'd' ? 'Bacheca' : 'Report PDF'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 border-l-4 border-slate-50 pl-10">
           <StatMini label="A PIAN/VAL" val={stats.vA} max={docente.ore_a_dovute} col="blue" pian={stats.pA} />
           <StatMini label="B PIAN/VAL" val={stats.vB} max={docente.ore_b_dovute} col="indigo" pian={stats.pB} />
        </div>
      </div>

      {tab === 'p' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in slide-in-from-bottom-10">
          {impegni.map(i => {
            const p = piani.find(x => x.impegno_id === i.id);
            return (
              <div key={i.id} className={`bg-white p-8 rounded-[3.5rem] border-4 transition-all flex flex-col justify-between gap-8 ${p ? 'border-blue-700 shadow-2xl bg-blue-50/20' : 'border-transparent shadow-sm'}`}>
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase ${i.tipo === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>COMMA {i.tipo}</span>
                    {p?.presente && <div className="text-emerald-500 font-black text-2xl">✓</div>}
                  </div>
                  <h4 className="text-2xl font-black uppercase tracking-tighter leading-tight text-slate-800">{i.titolo}</h4>
                  <p className="text-[12px] font-bold text-slate-400 mt-2 uppercase italic">{i.data}</p>
                </div>
                <div className="flex items-center gap-6 pt-6 border-t-2 border-slate-50">
                  <div className="text-center">
                    <p className="text-[9px] font-black text-slate-300 uppercase mb-2 italic">Ore</p>
                    <input id={`ov-${i.id}`} type="number" step="0.5" defaultValue={p ? p.ore_effettive : i.durata_max} disabled={p?.presente && !adminMode} className="w-20 p-4 bg-slate-100 rounded-2xl font-black text-2xl text-center outline-none" />
                  </div>
                  <button 
                    onClick={async () => {
                      const h = (document.getElementById(`ov-${i.id}`) as HTMLInputElement).value;
                      if(p) { if(p.presente && !adminMode) return; await supabase.from('piani').delete().eq('id', p.id); }
                      else { await supabase.from('piani').insert([{ docente_id: docente.id, impegno_id: i.id, ore_effettive: Number(h), tipo: i.tipo, presente: false }]); }
                      load();
                    }}
                    className={`flex-1 py-6 rounded-[2.5rem] font-black text-[11px] uppercase tracking-widest shadow-2xl transition-all ${p ? 'bg-red-50 text-red-500 border-2 border-red-100' : 'bg-slate-900 text-white hover:bg-blue-700'}`}
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 animate-in zoom-in">
           {docs.map(doc => (
              <a key={doc.id} href={doc.url} target="_blank" className="bg-white p-12 rounded-[4rem] border-4 border-slate-50 shadow-sm hover:shadow-2xl hover:border-blue-700 transition-all flex flex-col items-center text-center group">
                 <div className="w-20 h-20 bg-blue-50 text-blue-700 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2-2H6a2 2 0 01-2-2V4z"/></svg></div>
                 <h4 className="font-black uppercase text-xs tracking-tight text-slate-800 leading-tight h-8 overflow-hidden">{doc.nome}</h4>
              </a>
           ))}
        </div>
      )}

      {tab === 'r' && (
        <div className="bg-white p-24 rounded-[6rem] shadow-2xl border print:border-none print:shadow-none animate-in zoom-in">
          <div className="border-b-[16px] border-slate-900 pb-16 mb-16 flex flex-col md:flex-row justify-between items-end gap-12">
            <div>
              <h1 className="text-8xl font-black uppercase italic tracking-tighter leading-none mb-6">REPORT</h1>
              <span className="bg-blue-700 text-white px-12 py-5 rounded-full font-black text-3xl uppercase italic shadow-2xl">{docente.nome}</span>
            </div>
            <p className="text-5xl font-black italic text-slate-900 tracking-tighter">A.S. 2025/26</p>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[12px] font-black uppercase text-slate-400 border-b-8 border-slate-50">
                <th className="py-12">Attività</th>
                <th className="py-12 text-center">Tipo</th>
                <th className="py-12 text-right">Ore Validate</th>
              </tr>
            </thead>
            <tbody className="divide-y-4 divide-slate-50">
              {piani.filter(p => p.presente).map(p => {
                const i = impegni.find(x => x.id === p.impegno_id);
                return (
                  <tr key={p.id}>
                    <td className="py-12 font-black uppercase text-2xl italic tracking-tighter text-slate-800">{i?.titolo}</td>
                    <td className="py-12 text-center font-black text-xs text-slate-400">COMMA {p.tipo}</td>
                    <td className="py-12 text-right font-black text-5xl italic tracking-tighter text-blue-800">{(p.ore_effettive).toFixed(1)}H</td>
                  </tr>
                );
              })}
              <tr className="bg-slate-900 text-white">
                <td colSpan={2} className="p-20 font-black uppercase text-3xl italic tracking-[0.4em]">Totale Ore Maturate</td>
                <td className="p-20 text-right font-black text-9xl italic tracking-tight text-blue-400">{(stats.vA + stats.vB).toFixed(1)}H</td>
              </tr>
            </tbody>
          </table>
          <button onClick={() => window.print()} className="w-full mt-24 bg-blue-700 text-white p-14 rounded-[4rem] font-black text-4xl uppercase shadow-3xl print:hidden hover:bg-slate-900 transition-all">Download Certificato PDF</button>
        </div>
      )}
    </div>
  );
}

function StatMini({ label, val, max, col, pian = 0 }: any) {
  const c = col === 'blue' ? 'text-blue-700' : (col === 'indigo' ? 'text-indigo-700' : 'text-slate-500');
  const bg = col === 'blue' ? 'bg-blue-50' : (col === 'indigo' ? 'bg-indigo-50' : 'bg-slate-100');
  return (
    <div className={`${bg} px-8 py-6 rounded-[2.5rem] border-2 border-white text-center min-w-[180px] shadow-sm`}>
      <p className="text-[9px] font-black text-slate-400 uppercase mb-3 tracking-widest">{label}</p>
      <div className="flex justify-center items-end gap-1">
        <p className={`text-3xl font-black italic tracking-tighter ${c}`}>{val}</p>
        <p className="text-[12px] font-bold text-slate-300 mb-1.5">/ {max}h</p>
      </div>
      {pian > val && (
        <p className="text-[8px] font-black text-orange-600 uppercase mt-2 italic">Pianificate: {pian}h</p>
      )}
      <div className="w-full h-1.5 bg-white rounded-full mt-3 overflow-hidden">
        <div className={`h-full bg-current ${c}`} style={{width: `${Math.min((val/max)*100, 100)}%`}}></div>
      </div>
    </div>
  );
}
