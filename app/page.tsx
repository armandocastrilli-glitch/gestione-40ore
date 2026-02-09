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

  // FUNZIONI DI ELIMINAZIONE RIPRISTINATE
  const deleteDocente = async (id: string) => {
    if(!confirm("Sei sicuro? Eliminerai anche tutte le ore dichiarate da questo docente.")) return;
    const { error } = await supabase.from('docenti').delete().eq('id', id);
    if(!error) loadData();
  };

  const deleteImpegno = async (id: string) => {
    if(!confirm("Eliminando l'impegno cancellerai le ore di tutti i docenti per questa attività. Procedere?")) return;
    const { error } = await supabase.from('impegni').delete().eq('id', id);
    if(!error) { setActiveImp(null); loadData(); }
  };
  const saveDocente = async () => {
    if (!formDoc.nome) return alert("Inserire un nominativo.");
    const cod = Math.random().toString(36).substring(2, 7).toUpperCase();
    const baseOre = formDoc.contratto === 'INTERA' ? 80 : (80 / 18) * formDoc.ore;
    const oreP = baseOre * (formDoc.mesi / 9);
    
    const { error } = await supabase.from('docenti').insert([{
      nome: formDoc.nome, codice_accesso: cod, contratto: formDoc.contratto,
      ore_settimanali: formDoc.ore, mesi_servizio: formDoc.mesi,
      ore_a_dovute: Math.floor(oreP / 2), ore_b_dovute: Math.ceil(oreP / 2)
    }]);
    
    if (!error) { 
      alert("DOCENTE CREATO\nCODICE: " + cod); 
      setTab('docenti'); 
      loadData(); 
    } else { alert("Errore: " + error.message); }
  };

  const saveImpegno = async () => {
    if (!formImp.titolo || !formImp.data) return alert("Dati incompleti.");
    const { error } = await supabase.from('impegni').insert([{
      titolo: formImp.titolo, data: formImp.data, durata_max: Number(formImp.ore), tipo: formImp.tipo
    }]);
    if (!error) { setTab('appello'); loadData(); }
  };

  return (
    <main className="max-w-[1700px] mx-auto p-8 lg:p-12">
      <nav className="flex flex-wrap gap-4 mb-16 justify-center">
        {[
          { id: 'docenti', label: 'Lista Docenti' },
          { id: 'nuovo_doc', label: 'Aggiungi Staff' },
          { id: 'impegni', label: 'Nuova Attività' },
          { id: 'appello', label: 'Validazione' },
          { id: 'documenti', label: 'Bacheca File' }
        ].map(t => (
          <button 
            key={t.id} onClick={() => {setTab(t.id); setSelDoc(null)}}
            className={`px-10 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest transition-all border-4 ${tab === t.id ? 'bg-blue-800 border-blue-800 text-white shadow-2xl' : 'bg-white border-transparent text-slate-400 hover:text-slate-900'}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* LISTA DOCENTI CON INFO COMPLETE ED ELIMINAZIONE */}
      {tab === 'docenti' && !selDoc && (
        <div className="grid grid-cols-1 gap-6">
          {data.docenti.map((d: any) => (
            <div key={d.id} className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-10 hover:shadow-xl transition-all">
              <div className="flex-1">
                <h3 className="text-3xl font-black uppercase text-slate-800 italic tracking-tighter">{d.nome}</h3>
                <div className="flex flex-wrap gap-4 mt-3">
                  <span className="bg-blue-50 text-blue-700 px-4 py-1 rounded-xl text-[10px] font-black uppercase">{d.contratto}</span>
                  <span className="bg-slate-50 text-slate-500 px-4 py-1 rounded-xl text-[10px] font-black uppercase">CODE: {d.codice_accesso}</span>
                  <span className="bg-slate-50 text-slate-500 px-4 py-1 rounded-xl text-[10px] font-black uppercase">{d.ore_settimanali}H/SETT</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setSelDoc(d)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-blue-800">Gestisci</button>
                <button onClick={() => deleteDocente(d.id)} className="bg-red-50 text-red-500 p-4 rounded-2xl border border-red-100 hover:bg-red-600 hover:text-white transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NUOVO DOCENTE CON MENU A TENDINA RIPRISTINATO */}
      {tab === 'nuovo_doc' && (
        <div className="max-w-3xl mx-auto bg-white p-16 rounded-[5rem] shadow-2xl border animate-in zoom-in">
          <h2 className="text-4xl font-black mb-12 uppercase italic text-blue-800 tracking-tighter">Registrazione Staff</h2>
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-6 tracking-widest">Nominativo Completo</label>
              <input type="text" className="w-full p-8 bg-slate-50 rounded-[2.5rem] font-bold uppercase border-4 border-transparent focus:border-blue-600 outline-none transition-all" value={formDoc.nome} onChange={e => setFormDoc({...formDoc, nome: e.target.value})} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-6 tracking-widest">Tipo Contratto</label>
                <select className="w-full p-8 bg-slate-50 rounded-[2.5rem] font-bold uppercase border-4 border-transparent focus:border-blue-600 outline-none appearance-none cursor-pointer" value={formDoc.contratto} onChange={e => setFormDoc({...formDoc, contratto: e.target.value})}>
                  <option value="INTERA">CATTEDRA INTERA (18H)</option>
                  <option value="COMPLETAMENTO">COMPLETAMENTO</option>
                  <option value="SPEZZONE">SPEZZONE / PART-TIME</option>
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-6 tracking-widest">Ore Settimanali</label>
                <input type="number" className="w-full p-8 bg-slate-50 rounded-[2.5rem] font-bold border-4 border-transparent focus:border-blue-600 outline-none" value={formDoc.ore} onChange={e => setFormDoc({...formDoc, ore: Number(e.target.value)})} />
              </div>
            </div>
            <button onClick={saveDocente} className="w-full bg-blue-700 text-white p-10 rounded-[3rem] font-black text-2xl uppercase shadow-2xl hover:bg-slate-900 transition-all">Salva e Genera Codice</button>
          </div>
        </div>
      )}

      {/* NUOVO IMPEGNO CON ELIMINAZIONE ATTIVITÀ */}
      {tab === 'impegni' && (
        <div className="max-w-3xl mx-auto bg-white p-16 rounded-[5rem] shadow-2xl border animate-in zoom-in">
          <h2 className="text-4xl font-black mb-12 uppercase italic text-orange-600 tracking-tighter">Crea Nuova Attività</h2>
          <div className="space-y-8">
            <input type="text" placeholder="TITOLO ATTIVITÀ" className="w-full p-8 bg-slate-50 rounded-[2.5rem] font-bold uppercase outline-none focus:border-orange-500 border-4 border-transparent" value={formImp.titolo} onChange={e => setFormImp({...formImp, titolo: e.target.value})} />
            <div className="grid grid-cols-2 gap-6">
              <input type="date" className="p-8 bg-slate-50 rounded-[2.5rem] font-bold outline-none" value={formImp.data} onChange={e => setFormImp({...formImp, data: e.target.value})} />
              <div className="flex gap-4 p-4 bg-slate-50 rounded-[2.5rem]">
                <button onClick={() => setFormImp({...formImp, tipo: 'A'})} className={`flex-1 rounded-2xl font-black text-[10px] uppercase transition-all ${formImp.tipo === 'A' ? 'bg-blue-800 text-white shadow-lg' : 'bg-white'}`}>A</button>
                <button onClick={() => setFormImp({...formImp, tipo: 'B'})} className={`flex-1 rounded-2xl font-black text-[10px] uppercase transition-all ${formImp.tipo === 'B' ? 'bg-indigo-800 text-white shadow-lg' : 'bg-white'}`}>B</button>
              </div>
            </div>
            <input type="number" step="0.5" placeholder="ORE PREVISTE" className="w-full p-8 bg-slate-50 rounded-[2.5rem] font-bold outline-none" value={formImp.ore} onChange={e => setFormImp({...formImp, ore: Number(e.target.value)})} />
            <button onClick={saveImpegno} className="w-full bg-orange-600 text-white p-10 rounded-[3rem] font-black text-2xl uppercase shadow-2xl">Pubblica in Calendario</button>
          </div>
        </div>
      )}
      {/* TAB APPELLO CON ELIMINAZIONE IMPEGNO */}
      {tab === 'appello' && (
        <div className="grid lg:grid-cols-2 gap-10 animate-in fade-in">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase text-slate-400 ml-6 tracking-[0.4em]">Seleziona Attività</h3>
            {data.impegni.map((i: any) => (
              <div key={i.id} className="relative group">
                <div 
                  onClick={() => setActiveImp(i.id)}
                  className={`p-8 rounded-[3.5rem] border-4 cursor-pointer transition-all flex justify-between items-center ${activeImp === i.id ? 'bg-white border-blue-700 shadow-2xl scale-[1.02]' : 'bg-white border-transparent shadow-sm'}`}
                >
                  <div>
                    <span className={`text-[9px] font-black px-3 py-1 rounded-full mb-3 inline-block ${i.tipo === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>COMMA {i.tipo}</span>
                    <h4 className="font-black uppercase text-xl tracking-tighter">{i.titolo}</h4>
                    <p className="text-[10px] font-bold text-slate-300 uppercase italic">{i.data} • {i.durata_max}H</p>
                  </div>
                </div>
                <button onClick={() => deleteImpegno(i.id)} className="absolute -top-2 -right-2 bg-red-500 text-white p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            ))}
          </div>
          <div className="bg-white p-10 rounded-[5rem] shadow-2xl border sticky top-32 min-h-[500px]">
            <h3 className="text-2xl font-black mb-8 uppercase italic underline decoration-blue-100 underline-offset-8">Validazione Ore</h3>
            <div className="space-y-3">
              {data.piani.filter((p: any) => p.impegno_id === activeImp).map((p: any) => {
                const d = data.docenti.find((x: any) => x.id === p.docente_id);
                return (
                  <div key={p.id} className="flex justify-between items-center p-6 bg-slate-50 rounded-[2.5rem] border-2 border-transparent hover:border-blue-100 transition-all">
                    <div>
                      <p className="font-black uppercase text-sm text-slate-800">{d?.nome}</p>
                      <p className="text-[10px] font-bold text-blue-600 uppercase">Dichiarate: {p.ore_effettive}H</p>
                    </div>
                    <button 
                      onClick={async () => { await supabase.from('piani').update({ presente: !p.presente }).eq('id', p.id); loadData(); }}
                      className={`px-8 py-3 rounded-full font-black text-[10px] uppercase shadow-md transition-all ${p.presente ? 'bg-emerald-500 text-white' : 'bg-white text-slate-300 border'}`}
                    >
                      {p.presente ? 'Validato' : 'Valida'}
                    </button>
                  </div>
                );
              })}
              {!activeImp && <div className="text-center py-32 opacity-20 font-black uppercase text-xs tracking-[0.5em]">Scegli un impegno</div>}
            </div>
          </div>
        </div>
      )}

      {/* TAB DOCUMENTI CON ELIMINAZIONE FISICA DAL BUCKET */}
      {tab === 'documenti' && (
        <div className="bg-white p-12 rounded-[5rem] shadow-2xl border animate-in zoom-in">
          <div className="grid lg:grid-cols-2 gap-16">
            <div className="bg-slate-50 p-12 rounded-[4rem] border-4 border-dashed border-slate-200 text-center flex flex-col items-center justify-center min-h-[300px]">
              <div className="w-20 h-20 bg-blue-800 rounded-full flex items-center justify-center text-white mb-6 shadow-xl">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              </div>
              <input type="file" className="text-xs font-black uppercase text-slate-400 cursor-pointer file:bg-slate-900 file:text-white file:rounded-full file:px-8 file:py-3 file:border-0 hover:file:bg-blue-700" onChange={async (e) => {
                const file = e.target.files?.[0];
                if(!file) return;
                const path = `${Date.now()}_${file.name}`;
                const { error: upErr } = await supabase.storage.from('files').upload(path, file);
                if(upErr) return alert("ERRORE: Verifica che il bucket 'files' esista e sia PUBLIC su Supabase.");
                const { data: { publicUrl } } = supabase.storage.from('files').getPublicUrl(path);
                await supabase.from('documenti').insert([{ nome: file.name, url: publicUrl, storage_path: path }]);
                loadData();
              }} />
            </div>
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase text-slate-300 mb-6 tracking-widest italic">Documenti Pubblicati</h3>
              {data.docs.map((doc: any) => (
                <div key={doc.id} className="p-6 bg-white border border-slate-100 rounded-[2.5rem] flex justify-between items-center shadow-sm hover:shadow-md transition-all">
                   <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center font-black text-[10px]">DOC</div>
                     <span className="font-black uppercase text-[11px] text-slate-700 truncate max-w-[150px]">{doc.nome}</span>
                   </div>
                   <div className="flex gap-4">
                     <a href={doc.url} target="_blank" className="bg-blue-50 text-blue-600 px-6 py-2 rounded-xl font-black text-[10px] uppercase">Apri</a>
                     <button onClick={async () => { if(confirm("Eliminare?")) { await supabase.storage.from('files').remove([doc.storage_path]); await supabase.from('documenti').delete().eq('id', doc.id); loadData(); }}} className="text-red-500 font-black text-[10px] uppercase">Elimina</button>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* GESTIONE SINGOLO DOCENTE (MODALE ADMIN) */}
      {selDoc && (
        <div className="mt-16 border-t-[15px] border-slate-900 pt-16">
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
    setImpegni(i.data || []); setPiani(p.data || []);
  }, [docente.id]);

  useEffect(() => { load(); }, [load]);

  const stats = {
    vA: piani.filter(p => p.tipo === 'A' && p.presente).reduce((s, c) => s + c.ore_effettive, 0),
    vB: piani.filter(p => p.tipo === 'B' && p.presente).reduce((s, c) => s + c.ore_effettive, 0),
    pA: piani.filter(p => p.tipo === 'A').reduce((s, c) => s + c.ore_effettive, 0),
    pB: piani.filter(p => p.tipo === 'B').reduce((s, c) => s + c.ore_effettive, 0)
  };

  return (
    <div className="space-y-10 max-w-[1600px] mx-auto">
      <div className="bg-white p-12 rounded-[5rem] shadow-2xl border-t-[12px] border-blue-800 flex flex-wrap justify-between items-center gap-8">
        {!adminMode && (
          <div>
            <h2 className="text-5xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">{docente.nome}</h2>
            <p className="text-blue-600 font-black uppercase text-[11px] tracking-widest mt-4">{docente.contratto} • {docente.ore_settimanali}H SETT.</p>
          </div>
        )}
        <div className="flex gap-4">
           <AdminStatMini label="COMMA A" val={stats.vA} max={docente.ore_a_dovute} col="blue" pian={stats.pA} />
           <AdminStatMini label="COMMA B" val={stats.vB} max={docente.ore_b_dovute} col="indigo" pian={stats.pB} />
        </div>
        <button onClick={() => setTab(tab === 'p' ? 'r' : 'p')} className="bg-slate-900 text-white px-10 py-5 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl">
          {tab === 'p' ? 'Vedi Report PDF' : 'Torna a Piano Ore'}
        </button>
      </div>

      {tab === 'p' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {impegni.map(i => {
            const p = piani.find(x => x.impegno_id === i.id);
            return (
              <div key={i.id} className={`p-10 bg-white rounded-[4rem] border-4 transition-all flex flex-col justify-between min-h-[350px] ${p ? 'border-blue-700 shadow-2xl' : 'border-transparent shadow-sm'}`}>
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <span className={`px-4 py-1.5 rounded-full font-black text-[9px] uppercase ${i.tipo === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>COMMA {i.tipo}</span>
                    {p?.presente && <span className="bg-emerald-500 text-white px-4 py-1.5 rounded-full font-black text-[9px]">VALIDO</span>}
                  </div>
                  <h4 className="font-black uppercase text-2xl tracking-tighter leading-tight text-slate-800 mb-2">{i.titolo}</h4>
                  <p className="text-[11px] font-bold text-slate-400 uppercase italic">{i.data}</p>
                </div>
                <div className="mt-8 pt-8 border-t-4 border-slate-50 flex items-center gap-6">
                   <div className="text-center">
                     <p className="text-[8px] font-black text-slate-300 uppercase mb-2">Ore</p>
                     <input id={`h-${i.id}`} type="number" step="0.5" defaultValue={p ? p.ore_effettive : i.durata_max} disabled={p?.presente && !adminMode} className="w-16 p-4 bg-slate-100 rounded-2xl font-black text-2xl text-center outline-none" />
                   </div>
                   <button 
                    onClick={async () => {
                      const h = (document.getElementById(`h-${i.id}`) as HTMLInputElement).value;
                      if(p) { if(p.presente && !adminMode) return; await supabase.from('piani').delete().eq('id', p.id); }
                      else { await supabase.from('piani').insert([{ docente_id: docente.id, impegno_id: i.id, ore_effettive: Number(h), tipo: i.tipo }]); }
                      load();
                    }}
                    className={`flex-1 py-6 rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl transition-all ${p ? 'bg-red-50 text-red-500 border-2 border-red-100' : 'bg-slate-900 text-white hover:bg-blue-800'}`}
                   >
                     {p ? 'Elimina' : 'Dichiara'}
                   </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white p-24 rounded-[6rem] shadow-2xl border print:border-none print:shadow-none animate-in zoom-in">
           <h1 className="text-8xl font-black uppercase italic tracking-tighter border-b-8 border-slate-900 pb-10 mb-16">CERTIFICATO</h1>
           <table className="w-full">
             <tbody className="divide-y-4 divide-slate-50">
               {piani.filter(p => p.presente).map(p => {
                 const i = impegni.find(x => x.id === p.impegno_id);
                 return (
                   <tr key={p.id}>
                     <td className="py-10 font-black uppercase text-2xl italic tracking-tighter text-slate-700">{i?.titolo}</td>
                     <td className="py-10 text-right font-black text-6xl italic text-blue-800 tracking-tighter">{p.ore_effettive.toFixed(1)}H</td>
                   </tr>
                 );
               })}
               <tr className="bg-slate-900 text-white">
                 <td className="p-16 font-black uppercase text-3xl italic tracking-widest">Totale Validato</td>
                 <td className="p-16 text-right font-black text-9xl italic text-blue-400 tracking-tighter">{(stats.vA + stats.vB).toFixed(1)}H</td>
               </tr>
             </tbody>
           </table>
           <button onClick={() => window.print()} className="w-full mt-20 bg-blue-700 text-white p-14 rounded-[4rem] font-black text-4xl uppercase shadow-3xl print:hidden">Stampa / PDF</button>
        </div>
      )}
    </div>
  );
}

function AdminStatMini({ label, val, max, col, pian = 0 }: any) {
  const c = col === 'blue' ? 'text-blue-700' : 'text-indigo-700';
  const bg = col === 'blue' ? 'bg-blue-50' : 'bg-indigo-50';
  return (
    <div className={`${bg} px-10 py-6 rounded-[3rem] border-4 border-white text-center shadow-lg min-w-[200px]`}>
      <p className="text-[9px] font-black text-slate-400 uppercase mb-3 tracking-[0.4em]">{label}</p>
      <div className="flex justify-center items-end gap-1">
        <p className={`text-4xl font-black italic tracking-tighter ${c}`}>{val}</p>
        <p className="text-[12px] font-bold text-slate-300 mb-1.5">/ {max}H</p>
      </div>
      {pian > val && <p className="text-[8px] font-black text-orange-600 uppercase mt-2 italic">Dichiarate: {pian}h</p>}
    </div>
  );
}
