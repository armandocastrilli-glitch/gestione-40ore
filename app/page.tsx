"use client";
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function SProV3() {
  const [user, setUser] = useState<any>(null);
  const [loginCode, setLoginCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const code = loginCode.trim().toUpperCase();
    if (!code) return;
    setLoading(true);
    if (code === 'ADMIN123') {
      setUser({ id: 'admin', nome: 'Direzione', role: 'admin' });
    } else {
      const { data, error } = await supabase.from('docenti').select('*').eq('codice_accesso', code).single();
      if (data) setUser(data);
      else alert("Codice errato.");
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
        <div className="bg-white p-12 rounded-[4rem] shadow-2xl w-full max-w-lg border-[16px] border-slate-100">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-black italic tracking-tighter text-blue-700 uppercase leading-none">S-PRO</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mt-3">Advanced Management</p>
          </div>
          <input 
            type="text" placeholder="CODICE" 
            className="w-full p-8 bg-slate-50 border-4 border-transparent focus:border-blue-600 rounded-[2.5rem] text-center text-4xl font-mono uppercase outline-none transition-all mb-6"
            value={loginCode} onChange={(e) => setLoginCode(e.target.value)}
          />
          <button onClick={handleLogin} className="w-full bg-blue-600 text-white p-8 rounded-[2.5rem] font-black text-2xl hover:bg-slate-900 transition-all uppercase shadow-2xl shadow-blue-200">
            {loading ? 'Entrata...' : 'Accedi'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-slate-900 font-sans selection:bg-blue-100">
      <header className="bg-white/80 backdrop-blur-xl border-b sticky top-0 z-[100] px-10 py-6 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white font-black italic text-2xl shadow-lg shadow-blue-200">S</div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tighter">{user.nome}</h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{user.role === 'admin' ? 'Master Control' : 'Area Riservata'}</p>
          </div>
        </div>
        <button onClick={() => setUser(null)} className="bg-red-50 text-red-600 px-8 py-3 rounded-full font-black text-[11px] uppercase border border-red-100 hover:bg-red-600 hover:text-white transition-all shadow-sm">Logout</button>
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

  const handleUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const fName = `${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from('files').upload(fName, file);
    if (upErr) return alert(upErr.message);
    const { data: { publicUrl } } = supabase.storage.from('files').getPublicUrl(fName);
    await supabase.from('documenti').insert([{ nome: file.name, url: publicUrl }]);
    refresh();
  };

  const saveDoc = async () => {
    if (!formDoc.nome) return;
    const cod = Math.random().toString(36).substring(2, 7).toUpperCase();
    const oreP = (formDoc.contratto === 'INTERA' ? 80 : (80 / 18) * formDoc.ore) * (formDoc.mesi / 9);
    const { error } = await supabase.from('docenti').insert([{
      nome: formDoc.nome, codice_accesso: cod, contratto: formDoc.contratto,
      ore_settimanali: formDoc.ore, mesi_servizio: formDoc.mesi,
      ore_a_dovute: Math.floor(oreP / 2), ore_b_dovute: Math.ceil(oreP / 2)
    }]);
    if (!error) { alert("CODICE: " + cod); setTab('docenti'); refresh(); }
  };

  return (
    <main className="max-w-7xl mx-auto p-10">
      <nav className="flex flex-wrap gap-4 mb-16">
        {['docenti', 'nuovo_doc', 'impegni', 'appello', 'documenti'].map(t => (
          <button 
            key={t} onClick={() => {setTab(t); setSelDoc(null)}}
            className={`px-10 py-5 rounded-3xl font-black text-[11px] uppercase tracking-widest transition-all shadow-md ${tab === t ? 'bg-slate-900 text-white scale-105 shadow-xl' : 'bg-white border text-slate-400 hover:text-slate-900'}`}
          >
            {t.replace('_', ' ')}
          </button>
        ))}
      </nav>

      {tab === 'docenti' && !selDoc && (
        <div className="grid gap-6 animate-in slide-in-from-bottom-5 duration-500">
          {data.docenti.map((d: any) => {
            const dp = data.piani.filter((p: any) => p.docente_id === d.id);
            const vA = dp.filter((p: any) => p.tipo === 'A' && p.presente).reduce((s, c: any) => s + c.ore_effettive, 0);
            const vB = dp.filter((p: any) => p.tipo === 'B' && p.presente).reduce((s, c: any) => s + c.ore_effettive, 0);
            return (
              <div key={d.id} className="bg-white p-8 rounded-[3.5rem] border-2 border-slate-50 shadow-sm flex flex-col lg:flex-row items-center gap-10 hover:shadow-2xl hover:border-blue-100 transition-all group">
                <div className="flex-1">
                  <h3 className="text-3xl font-black uppercase italic tracking-tighter text-slate-800">{d.nome}</h3>
                  <p className="text-[10px] font-black text-blue-500 uppercase mt-2">{d.contratto} • ACCESS CODE: {d.codice_accesso}</p>
                </div>
                <div className="flex gap-6">
                  <StatBox label="Validato A" val={vA} max={d.ore_a_dovute} col="blue" />
                  <StatBox label="Validato B" val={vB} max={d.ore_b_dovute} col="indigo" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setSelDoc(d)} className="bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black text-[11px] uppercase shadow-lg">Gestisci</button>
                  <button onClick={async () => {if(confirm("Eliminare?")) { await supabase.from('docenti').delete().eq('id', d.id); refresh(); }}} className="bg-red-50 text-red-500 p-5 rounded-[2rem] border border-red-100 hover:bg-red-500 hover:text-white transition-all"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M4 8V4h12v4h2v2h-2v10H4V10H2V8h2zm2 2v8h8v-8H6zm2-4h4V4H8v2z"/></svg></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'nuovo_doc' && (
        <div className="max-w-3xl mx-auto bg-white p-16 rounded-[4rem] shadow-2xl border animate-in zoom-in duration-300">
          <h2 className="text-4xl font-black mb-12 text-center uppercase italic text-emerald-600 tracking-tighter">Registrazione</h2>
          <div className="space-y-8">
            <input type="text" placeholder="NOME E COGNOME" className="w-full p-8 bg-slate-50 rounded-[2.5rem] font-black text-2xl uppercase border-4 border-transparent focus:border-emerald-500 outline-none" value={formDoc.nome} onChange={e => setFormDoc({...formDoc, nome: e.target.value})} />
            <div className="grid grid-cols-2 gap-6">
              <select className="p-8 bg-slate-50 rounded-[2.5rem] font-black uppercase border-4 border-transparent focus:border-emerald-500 outline-none" value={formDoc.contratto} onChange={e => setFormDoc({...formDoc, contratto: e.target.value})}>
                <option value="INTERA">INTERA (18H)</option>
                <option value="COMPLETAMENTO">COMPLETAMENTO</option>
                <option value="SPEZZONE">SPEZZONE</option>
              </select>
              <input type="number" placeholder="ORE" className="p-8 bg-slate-50 rounded-[2.5rem] font-black text-center border-4 border-transparent focus:border-emerald-500 outline-none" value={formDoc.ore} onChange={e => setFormDoc({...formDoc, ore: Number(e.target.value)})} />
            </div>
            <div className="bg-slate-50 p-10 rounded-[2.5rem] text-center">
               <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] block mb-6">Mesi in servizio attesi</label>
               <input type="range" min="1" max="9" value={formDoc.mesi} onChange={e => setFormDoc({...formDoc, mesi: Number(e.target.value)})} className="w-full h-4 bg-slate-200 rounded-full appearance-none cursor-pointer accent-emerald-600" />
               <p className="text-4xl font-black text-emerald-600 mt-6 italic">{formDoc.mesi} MESI</p>
            </div>
            <button onClick={saveDoc} className="w-full bg-emerald-600 text-white p-10 rounded-[3rem] font-black text-2xl uppercase shadow-2xl shadow-emerald-100 hover:bg-slate-900 transition-all active:scale-95">Invia Dati</button>
          </div>
        </div>
      )}

      {tab === 'impegni' && (
        <div className="max-w-2xl mx-auto bg-white p-16 rounded-[4rem] shadow-2xl border animate-in zoom-in duration-300">
          <h2 className="text-4xl font-black mb-12 text-center uppercase italic text-orange-600 tracking-tighter">Nuovo Impegno</h2>
          <div className="space-y-6">
            <input id="tImp" type="text" placeholder="TITOLO ATTIVITÀ" className="w-full p-8 bg-slate-50 rounded-[2.5rem] font-black uppercase border-4 border-transparent focus:border-orange-500 outline-none shadow-inner" />
            <div className="grid grid-cols-2 gap-6">
              <input id="dImp" type="date" className="p-8 bg-slate-50 rounded-[2.5rem] font-black border-4 border-transparent focus:border-orange-500 outline-none" />
              <input id="hImp" type="number" step="0.5" placeholder="ORE MAX" className="p-8 bg-slate-50 rounded-[2.5rem] font-black border-4 border-transparent focus:border-orange-500 outline-none text-center" />
            </div>
            <div className="flex gap-4 p-3 bg-slate-100 rounded-[2.5rem]">
               <button onClick={() => (window as any).tmpTipo = 'A'} className="flex-1 py-6 rounded-3xl font-black text-[10px] uppercase transition-all bg-white shadow-sm focus:bg-blue-600 focus:text-white">Comma A</button>
               <button onClick={() => (window as any).tmpTipo = 'B'} className="flex-1 py-6 rounded-3xl font-black text-[10px] uppercase transition-all bg-white shadow-sm focus:bg-indigo-600 focus:text-white">Comma B</button>
            </div>
            <button onClick={async () => {
              const t = (document.getElementById('tImp') as HTMLInputElement).value;
              const d = (document.getElementById('dImp') as HTMLInputElement).value;
              const h = (document.getElementById('hImp') as HTMLInputElement).value;
              const tip = (window as any).tmpTipo || 'A';
              if(!t || !d || !h) return;
              await supabase.from('impegni').insert([{ titolo: t, data: d, durata_max: Number(h), tipo: tip }]);
              refresh(); setTab('docenti');
            }} className="w-full bg-orange-600 text-white p-10 rounded-[3rem] font-black text-2xl uppercase shadow-2xl hover:bg-slate-900 transition-all">Pubblica</button>
          </div>
        </div>
      )}

      {tab === 'appello' && (
        <div className="grid lg:grid-cols-2 gap-12 animate-in fade-in duration-500">
          <div className="space-y-4">
            <h3 className="text-[11px] font-black uppercase text-slate-300 ml-6 tracking-[0.5em]">Seleziona Evento</h3>
            {data.impegni.map((i: any) => (
              <div 
                key={i.id} onClick={() => setActiveImp(i.id)}
                className={`p-10 rounded-[3.5rem] border-4 cursor-pointer transition-all flex justify-between items-center ${activeImp === i.id ? 'bg-white border-indigo-600 shadow-2xl scale-[1.03]' : 'bg-white border-transparent shadow-sm'}`}
              >
                <div>
                  <span className={`text-[9px] font-black px-3 py-1 rounded-full mb-3 inline-block ${i.tipo === 'A' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>COMMA {i.tipo}</span>
                  <h4 className="font-black uppercase text-xl tracking-tighter">{i.titolo}</h4>
                  <p className="text-[11px] font-bold text-slate-400 mt-1 italic">{i.data}</p>
                </div>
                {activeImp === i.id && <div className="w-6 h-6 bg-indigo-600 rounded-full"></div>}
              </div>
            ))}
          </div>
          <div className="bg-white p-12 rounded-[4rem] shadow-2xl border min-h-[600px] sticky top-32">
            <h3 className="text-3xl font-black mb-10 uppercase text-indigo-600 italic underline decoration-8 decoration-indigo-50 underline-offset-8">Presenze</h3>
            <div className="space-y-3">
              {data.piani.filter((p: any) => p.impegno_id === activeImp).map((p: any) => {
                const doc = data.docenti.find((d: any) => d.id === p.docente_id);
                return (
                  <div key={p.id} className="flex justify-between items-center p-6 bg-slate-50 rounded-[2.5rem] border-2 border-transparent hover:border-slate-100">
                    <div>
                      <p className="font-black uppercase text-sm">{doc?.nome}</p>
                      <p className="text-[10px] font-bold text-slate-400">ORE DICHIARATE: <span className="text-slate-900">{p.ore_effettive}h</span></p>
                    </div>
                    <button 
                      onClick={async () => { await supabase.from('piani').update({ presente: !p.presente }).eq('id', p.id); refresh(); }}
                      className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg transition-all ${p.presente ? 'bg-emerald-500 text-white' : 'bg-white text-slate-300 border'}`}
                    >
                      {p.presente ? 'Validato ✓' : 'In Sospeso'}
                    </button>
                  </div>
                );
              })}
              {!activeImp && <p className="text-center py-40 text-slate-300 font-black uppercase italic text-sm tracking-widest">Scegli un'attività</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'documenti' && (
        <div className="bg-white p-16 rounded-[5rem] shadow-2xl border animate-in zoom-in duration-500">
          <h2 className="text-5xl font-black uppercase italic text-blue-700 tracking-tighter text-center mb-16 underline decoration-[12px] decoration-blue-50 underline-offset-10">Bacheca File</h2>
          <div className="grid lg:grid-cols-2 gap-16">
            <div className="bg-slate-50 p-16 rounded-[4rem] border-8 border-dashed border-slate-200 text-center relative group overflow-hidden">
               <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none"></div>
               <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-8 text-white shadow-2xl shadow-blue-200">
                 <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
               </div>
               <p className="font-black uppercase text-sm text-slate-400 mb-8 tracking-[0.2em]">Upload PDF / Immagini</p>
               <input type="file" className="block w-full text-sm text-slate-400 file:mr-4 file:py-4 file:px-10 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-slate-900 file:text-white hover:file:bg-blue-600 cursor-pointer" onChange={handleUpload} />
            </div>
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-300 ml-6 mb-6 tracking-widest italic">Documentazione Inviata</h3>
              {data.docs.map((doc: any) => (
                <div key={doc.id} className="p-8 bg-white border-2 border-slate-50 rounded-[2.5rem] flex justify-between items-center shadow-sm hover:shadow-xl transition-all group">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center font-black text-xs">PDF</div>
                    <div>
                      <p className="font-black text-sm uppercase text-slate-800 leading-none">{doc.nome}</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-2">LINK ATTIVO • {new Date(doc.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a href={doc.url} target="_blank" className="bg-blue-50 text-blue-600 px-6 py-3 rounded-xl font-black text-[9px] uppercase">Apri</a>
                    <button onClick={async () => { if(confirm("Elimina file?")) { await supabase.from('documenti').delete().eq('id', doc.id); refresh(); }}} className="bg-red-50 text-red-500 px-6 py-3 rounded-xl font-black text-[9px] uppercase">Rimuovi</button>
                  </div>
                </div>
              ))}
              {data.docs.length === 0 && <p className="text-center py-20 text-slate-200 font-black text-xs uppercase italic tracking-widest">Archivio vuoto</p>}
            </div>
          </div>
        </div>
      )}

      {selDoc && (
        <div className="mt-20 border-t-[16px] border-slate-900 pt-20 animate-in slide-in-from-bottom-10 duration-700">
           <div className="bg-blue-600 p-12 rounded-[4rem] text-white shadow-2xl mb-16 flex justify-between items-center">
              <div>
                <p className="text-[11px] font-black uppercase opacity-60 tracking-[0.4em]">Amministrazione Profilo Docente</p>
                <h2 className="text-6xl font-black uppercase italic tracking-tighter mt-4 leading-none">{selDoc.nome}</h2>
              </div>
              <button onClick={() => setSelDoc(null)} className="bg-white text-blue-600 px-12 py-6 rounded-[2rem] font-black text-[11px] uppercase shadow-2xl hover:bg-slate-900 hover:text-white transition-all">Esci Revisione</button>
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
  const [view, setView] = useState('piano');

  const load = useCallback(async () => {
    const [i, p, d] = await Promise.all([
      supabase.from('impegni').select('*').order('data', { ascending: false }),
      supabase.from('piani').select('*').eq('docente_id', docente.id),
      supabase.from('documenti').select('*').order('created_at', { ascending: false })
    ]);
    setImpegni(i.data || []); setPiani(p.data || []); setDocs(d.data || []);
  }, [docente.id]);

  useEffect(() => { load(); }, [load]);

  const tA = piani.filter(p => p.tipo === 'A').reduce((s, c) => s + c.ore_effettive, 0);
  const tB = piani.filter(p => p.tipo === 'B').reduce((s, c) => s + c.ore_effettive, 0);
  const vA = piani.filter(p => p.tipo === 'A' && p.presente).reduce((s, c) => s + c.ore_effettive, 0);
  const vB = piani.filter(p => p.tipo === 'B' && p.presente).reduce((s, c) => s + c.ore_effettive, 0);

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-10">
      {!adminMode && (
        <div className="bg-white p-16 rounded-[4rem] shadow-2xl border-b-[20px] border-blue-600 mb-16 flex flex-col lg:flex-row justify-between items-center gap-12 animate-in fade-in duration-700">
          <div className="flex items-center gap-10">
            <div className="w-24 h-24 bg-gradient-to-tr from-blue-700 to-indigo-800 rounded-[2.5rem] flex items-center justify-center text-white font-black text-5xl shadow-2xl">{docente.nome[0]}</div>
            <div>
              <h2 className="text-5xl font-black uppercase italic tracking-tighter text-slate-800">{docente.nome}</h2>
              <div className="flex gap-4 mt-4">
                <span className="bg-slate-100 text-slate-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">{docente.contratto}</span>
                <span className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase italic tracking-tighter border border-blue-100">Settimanali: {docente.ore_settimanali}h</span>
              </div>
            </div>
          </div>
          <div className="flex gap-4 w-full lg:w-auto">
            <button onClick={() => setView('piano')} className={`flex-1 lg:flex-none px-12 py-6 rounded-[2rem] font-black text-[11px] uppercase shadow-lg transition-all ${view === 'piano' ? 'bg-blue-600 text-white scale-105' : 'bg-white border text-slate-400'}`}>Pianifica</button>
            <button onClick={() => setView('docs')} className={`flex-1 lg:flex-none px-12 py-6 rounded-[2rem] font-black text-[11px] uppercase shadow-lg transition-all ${view === 'docs' ? 'bg-blue-600 text-white scale-105' : 'bg-white border text-slate-400'}`}>Bacheca</button>
            <button onClick={() => setView('report')} className={`flex-1 lg:flex-none px-12 py-6 rounded-[2rem] font-black text-[11px] uppercase shadow-lg transition-all ${view === 'report' ? 'bg-slate-900 text-white scale-105' : 'bg-white border text-slate-400'}`}>Report PDF</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        <DataCounter label="Dovute A" val={docente.ore_a_dovute} sub="Contratto" />
        <DataCounter label="Validato A" val={vA} col="text-blue-600" sub={`${docente.ore_a_dovute - vA}h residue`} />
        <DataCounter label="Dovute B" val={docente.ore_b_dovute} sub="Contratto" />
        <DataCounter label="Validato B" val={vB} col="text-indigo-600" sub={`${docente.ore_b_dovute - vB}h residue`} />
      </div>

      {view === 'piano' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-10 duration-700">
          {impegni.map(i => {
            const p = piani.find(x => x.impegno_id === i.id);
            return (
              <div key={i.id} className={`bg-white p-10 rounded-[3.5rem] border-2 transition-all flex flex-col md:flex-row justify-between items-center gap-8 ${p ? 'border-blue-600 shadow-2xl bg-blue-50/10' : 'border-transparent shadow-sm hover:shadow-lg'}`}>
                <div className="flex-1">
                  <div className="flex gap-3 mb-4">
                    <span className={`text-[9px] font-black px-4 py-1 rounded-full uppercase tracking-tighter ${i.tipo === 'A' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>COMMA {i.tipo}</span>
                    {p?.presente && <span className="bg-emerald-100 text-emerald-600 text-[9px] font-black px-4 py-1 rounded-full uppercase tracking-widest italic">Approvato</span>}
                  </div>
                  <h4 className="text-3xl font-black uppercase tracking-tighter text-slate-800 leading-none">{i.titolo}</h4>
                  <p className="text-[12px] font-bold text-slate-400 mt-2 uppercase tracking-widest italic">{new Date(i.data).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
                <div className="flex items-center gap-10">
                  <div className="text-center">
                    <p className="text-[9px] font-black text-slate-300 uppercase mb-3 tracking-widest">Ore Piano</p>
                    <input id={`ov-${i.id}`} type="number" step="0.5" defaultValue={p ? p.ore_effettive : i.durata_max} disabled={p?.presente && !adminMode} className="w-24 p-5 bg-slate-50 rounded-2xl font-black text-3xl text-center outline-none focus:ring-4 ring-blue-50 border-none transition-all" />
                  </div>
                  <button 
                    onClick={async () => {
                      const h = (document.getElementById(`ov-${i.id}`) as HTMLInputElement).value;
                      if(p) { if(p.presente && !adminMode) return alert("Validato"); await supabase.from('piani').delete().eq('id', p.id); }
                      else { await supabase.from('piani').insert([{ docente_id: docente.id, impegno_id: i.id, ore_effettive: Number(h), tipo: i.tipo, presente: false }]); }
                      load();
                    }}
                    className={`px-12 py-6 rounded-[2rem] font-black text-[11px] uppercase shadow-2xl transition-all ${p ? 'bg-red-500 text-white' : 'bg-slate-900 text-white hover:bg-blue-600 hover:scale-105'}`}
                  >
                    {p ? 'Elimina' : 'Conferma'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'docs' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in zoom-in duration-500">
           {docs.map(doc => (
              <a key={doc.id} href={doc.url} target="_blank" className="bg-white p-10 rounded-[3.5rem] border-2 border-slate-50 shadow-sm hover:shadow-2xl hover:border-blue-600 transition-all flex flex-col items-center text-center group">
                 <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                   <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/></svg>
                 </div>
                 <h4 className="font-black uppercase text-sm mb-2">{doc.nome}</h4>
                 <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest italic">{new Date(doc.created_at).toLocaleDateString()}</p>
              </a>
           ))}
           {docs.length === 0 && <div className="col-span-full py-40 text-center text-slate-200 font-black text-xl italic uppercase tracking-[0.5em]">Nessun File</div>}
        </div>
      )}

      {view === 'report' && (
        <div className="bg-white p-20 lg:p-32 rounded-[5rem] shadow-2xl border print:border-none print:shadow-none print:p-0 animate-in zoom-in duration-500">
          <div className="border-b-[16px] border-slate-900 pb-16 mb-16 flex flex-col md:flex-row justify-between items-end gap-12">
            <div>
              <h1 className="text-8xl font-black uppercase italic tracking-[ -0.05em] leading-none mb-6">REPORT<br/>ATTIVITÀ</h1>
              <div className="bg-blue-600 text-white inline-block px-10 py-4 rounded-full font-black text-2xl uppercase tracking-tighter italic shadow-xl">{docente.nome}</div>
            </div>
            <div className="text-right">
              <p className="text-[12px] font-black uppercase text-slate-300 tracking-[0.6em] mb-4">Registro Scolastico</p>
              <p className="text-4xl font-black italic text-slate-900 tracking-tighter underline decoration-blue-600">2025 / 2026</p>
            </div>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[12px] font-black uppercase text-slate-300 border-b-8 border-slate-50">
                <th className="py-12">Attività</th>
                <th className="py-12 text-center">Data</th>
                <th className="py-12 text-center">Comma</th>
                <th className="py-12 text-right">Durata</th>
              </tr>
            </thead>
            <tbody className="divide-y-4 divide-slate-50">
              {piani.map(p => {
                const i = impegni.find(x => x.id === p.impegno_id);
                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-12 font-black uppercase text-xl italic tracking-tighter">{i?.titolo}</td>
                    <td className="py-12 text-center font-mono text-sm text-slate-400">{i?.data}</td>
                    <td className="py-12 text-center font-black text-xs text-slate-400">TIPO {p.tipo}</td>
                    <td className="py-12 text-right font-black text-4xl italic tracking-tighter text-slate-900">{p.ore_effettive.toFixed(1)}H</td>
                  </tr>
                );
              })}
              <tr className="bg-slate-900 text-white shadow-2xl scale-105 rounded-[2rem] overflow-hidden">
                <td colSpan={3} className="p-16 font-black uppercase text-2xl italic tracking-[0.4em]">Totale Ore Riconosciute</td>
                <td className="p-16 text-right font-black text-8xl italic tracking-tight text-blue-400">{(tA + tB).toFixed(1)}H</td>
              </tr>
            </tbody>
          </table>
          <button onClick={() => window.print()} className="w-full mt-24 bg-blue-600 text-white p-12 rounded-[3.5rem] font-black text-4xl uppercase shadow-2xl shadow-blue-200 print:hidden hover:bg-slate-900 transition-all hover:scale-[1.02]">Genera PDF Ufficiale</button>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, val, max, col }: any) {
  const c = col === 'blue' ? 'text-blue-600' : 'text-indigo-600';
  const bg = col === 'blue' ? 'bg-blue-50/50' : 'bg-indigo-50/50';
  return (
    <div className={`${bg} p-8 rounded-[3rem] border-2 border-slate-50 text-center min-w-[200px] shadow-inner`}>
      <p className="text-[10px] font-black text-slate-300 uppercase mb-4 tracking-[0.2em]">{label}</p>
      <p className={`text-4xl font-black italic tracking-tighter ${c}`}>{val}h</p>
      <div className="w-full h-2 bg-slate-200 rounded-full mt-4 overflow-hidden"><div className={`h-full bg-current ${c}`} style={{width: `${(val/max)*100}%`}}></div></div>
      <p className="text-[9px] font-bold text-slate-400 mt-2">Dovute: {max}h</p>
    </div>
  );
}

function DataCounter({ label, val, col = "text-slate-800", sub = "" }: any) {
  return (
    <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-50 text-center hover:shadow-2xl transition-all group">
      <p className="text-[10px] font-black uppercase text-slate-300 mb-3 tracking-widest">{label}</p>
      <p className={`text-5xl font-black italic tracking-tighter ${col} group-hover:scale-110 transition-transform`}>{val}H</p>
      <p className="text-[10px] font-bold text-slate-200 uppercase mt-3 tracking-tighter">{sub}</p>
    </div>
  );
}
