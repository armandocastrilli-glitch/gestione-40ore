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
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
        <div className="bg-white p-10 md:p-12 rounded-[3rem] shadow-2xl w-full max-w-xl border-[10px] border-slate-100">
          <div className="text-center mb-10">
            <h1 className="text-6xl font-black italic tracking-[-0.1em] text-blue-800 uppercase leading-none">S-PRO</h1>
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.6em] mt-6">Secure Academic Engine</p>
          </div>
          <input 
            type="text" placeholder="ACCESS CODE" 
            className="w-full p-6 bg-slate-50 border-4 border-transparent focus:border-blue-600 rounded-[2rem] text-center text-3xl font-mono uppercase outline-none mb-6"
            value={loginCode} onChange={(e) => setLoginCode(e.target.value)}
          />
          <button onClick={handleLogin} className="w-full bg-blue-700 text-white p-6 rounded-[2rem] font-black text-2xl uppercase shadow-xl hover:bg-blue-800">
            {loading ? 'WAIT...' : 'AUTHENTICATE'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <header className="bg-white/80 backdrop-blur-xl border-b px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-800 rounded-xl flex items-center justify-center text-white font-black italic text-xl shadow-md">S</div>
          <div>
            <h2 className="text-md font-black uppercase leading-none">{user.nome}</h2>
            <p className="text-[9px] font-bold text-blue-500 uppercase mt-1 tracking-widest">{user.role === 'admin' ? 'Master Admin' : 'Academic Staff'}</p>
          </div>
        </div>
        <button onClick={() => setUser(null)} className="bg-slate-900 text-white px-6 py-2.5 rounded-full font-black text-[9px] uppercase tracking-widest hover:bg-red-600 transition-all shadow-md">Logout</button>
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
    let oreATot = 0;
    let oreBTot = 0;

    if (formDoc.contratto === 'INTERA') {
      const baseIntera = 80 * (formDoc.mesi / 9);
      oreATot = Math.floor(baseIntera / 2);
      oreBTot = Math.ceil(baseIntera / 2);
    } 
    else if (formDoc.contratto === 'COMPLETAMENTO') {
      const baseProporzionale = (80 / 18) * formDoc.ore * (formDoc.mesi / 9);
      oreATot = Math.floor(baseProporzionale / 2);
      oreBTot = Math.ceil(baseProporzionale / 2);
    } 
    else if (formDoc.contratto === 'SPEZZONE') {
      oreATot = Math.floor(40 * (formDoc.mesi / 9));
      const baseB = (40 / 18) * formDoc.ore * (formDoc.mesi / 9);
      oreBTot = Math.ceil(baseB);
    }

    const { error } = await supabase.from('docenti').insert([{
      nome: formDoc.nome, 
      codice_accesso: cod, 
      contratto: formDoc.contratto,
      ore_settimanali: formDoc.ore, 
      mesi_servizio: formDoc.mesi,
      ore_a_dovute: oreATot, 
      ore_b_dovute: oreBTot
    }]);
    
    if (!error) { 
      alert(`DOCENTE CREATO\nCodice: ${cod}\nComma A: ${oreATot}h\nComma B: ${oreBTot}h`); 
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
    <main className="max-w-[1400px] mx-auto p-6 lg:p-10">
      <nav className="flex flex-wrap gap-3 mb-12 justify-center">
        {[
          { id: 'docenti', label: 'Lista Docenti' },
          { id: 'nuovo_doc', label: 'Aggiungi Staff' },
          { id: 'impegni', label: 'Nuova Attività' },
          { id: 'appello', label: 'Validazione' },
          { id: 'documenti', label: 'Bacheca File' }
        ].map(t => (
          <button 
            key={t.id} onClick={() => {setTab(t.id); setSelDoc(null)}}
            className={`px-8 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all border-4 ${tab === t.id ? 'bg-blue-800 border-blue-800 text-white shadow-xl' : 'bg-white border-transparent text-slate-400 hover:text-slate-900'}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'docenti' && !selDoc && (
        <div className="grid grid-cols-1 gap-4">
          {data.docenti.map((d: any) => {
            const pianiDoc = data.piani.filter((p: any) => p.docente_id === d.id);
            const stats = {
              pianA: pianiDoc.filter((p: any) => p.tipo === 'A').reduce((s, c) => s + c.ore_effettive, 0),
              svoltA: pianiDoc.filter((p: any) => p.tipo === 'A' && p.presente).reduce((s, c) => s + c.ore_effettive, 0),
              pianB: pianiDoc.filter((p: any) => p.tipo === 'B').reduce((s, c) => s + c.ore_effettive, 0),
              svoltB: pianiDoc.filter((p: any) => p.tipo === 'B' && p.presente).reduce((s, c) => s + c.ore_effettive, 0),
            };

            return (
              <div key={d.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col xl:flex-row items-center gap-6 hover:shadow-lg transition-all group">
                <div className="flex items-center gap-5 min-w-[220px]">
                  <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-lg italic group-hover:bg-blue-700 transition-all">
                    {d.nome[0]}
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase text-slate-800 leading-none mb-1.5">{d.nome}</h3>
                    <p className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md inline-block uppercase tracking-widest">
                      Code: {d.codice_accesso}
                    </p>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-3 border-x border-slate-50 px-6 w-full">
                  <div className="bg-blue-50/50 p-4 rounded-[1.5rem] border border-blue-100">
                    <div className="flex justify-between items-center mb-2 px-1">
                      <span className="text-[9px] font-black text-blue-800 uppercase italic">Comma A</span>
                      <span className="text-[9px] font-bold text-slate-400">{d.ore_a_dovute}h Tot.</span>
                    </div>
                    <div className="flex justify-around items-end">
                      <div className="text-center">
                        <p className="text-[7px] font-bold text-slate-400 uppercase">Pian.</p>
                        <p className="text-md font-black text-blue-600 leading-none">{stats.pianA}h</p>
                      </div>
                      <div className="w-px h-5 bg-blue-200"></div>
                      <div className="text-center">
                        <p className="text-[7px] font-bold text-slate-400 uppercase">Svolte</p>
                        <p className="text-md font-black text-emerald-600 leading-none">{stats.svoltA}h</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-indigo-50/50 p-4 rounded-[1.5rem] border border-indigo-100">
                    <div className="flex justify-between items-center mb-2 px-1">
                      <span className="text-[9px] font-black text-indigo-800 uppercase italic">Comma B</span>
                      <span className="text-[9px] font-bold text-slate-400">{d.ore_b_dovute}h Tot.</span>
                    </div>
                    <div className="flex justify-around items-end">
                      <div className="text-center">
                        <p className="text-[7px] font-bold text-slate-400 uppercase">Pian.</p>
                        <p className="text-md font-black text-indigo-600 leading-none">{stats.pianB}h</p>
                      </div>
                      <div className="w-px h-5 bg-indigo-200"></div>
                      <div className="text-center">
                        <p className="text-[7px] font-bold text-slate-400 uppercase">Svolte</p>
                        <p className="text-md font-black text-emerald-600 leading-none">{stats.svoltB}h</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={() => setSelDoc(d)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-700 shadow-md transition-all">
                    Dettagli
                  </button>
                  <button onClick={() => deleteDocente(d.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'nuovo_doc' && (
        <div className="max-w-3xl mx-auto bg-white p-10 md:p-12 rounded-[3.5rem] shadow-2xl border animate-in zoom-in">
          <h2 className="text-3xl font-black mb-8 uppercase italic text-blue-800 tracking-tighter">Registrazione Staff</h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-widest">Nominativo Completo</label>
              <input type="text" placeholder="ES: MARIO ROSSI" className="w-full p-6 bg-slate-50 rounded-[2rem] font-bold uppercase border-4 border-transparent focus:border-blue-600 outline-none transition-all" value={formDoc.nome} onChange={e => setFormDoc({...formDoc, nome: e.target.value})} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-widest">Tipo Contratto (Normativa)</label>
                <select className="w-full p-6 bg-slate-50 rounded-[2rem] font-bold uppercase border-4 border-transparent focus:border-blue-600 outline-none appearance-none cursor-pointer" value={formDoc.contratto} onChange={e => setFormDoc({...formDoc, contratto: e.target.value})}>
                  <option value="INTERA">Cattedra Intera (18h)</option>
                  <option value="COMPLETAMENTO">Spezzone + Completamento Esterno</option>
                  <option value="SPEZZONE">Spezzone Solo Nostra Scuola</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-widest">Ore Settimanali da noi</label>
                <input type="number" className="w-full p-6 bg-slate-50 rounded-[2rem] font-bold border-4 border-transparent focus:border-blue-600 outline-none" value={formDoc.ore} onChange={e => setFormDoc({...formDoc, ore: Number(e.target.value)})} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-widest">Mesi di Servizio Previsti (es: 9 per anno intero)</label>
              <input type="number" step="0.5" max="9" min="0.5" className="w-full p-6 bg-slate-50 rounded-[2rem] font-bold border-4 border-transparent focus:border-blue-600 outline-none" value={formDoc.mesi} onChange={e => setFormDoc({...formDoc, mesi: Number(e.target.value)})} />
              <p className="ml-4 text-[8px] font-bold text-slate-400 italic">*Il calcolo delle ore verrà riproporzionato se inferiore a 9 mesi.</p>
            </div>
            <div className="bg-blue-50 p-6 rounded-[2rem] border-2 border-blue-100 flex justify-around items-center">
              <div className="text-center">
                <p className="text-[8px] font-black text-blue-400 uppercase">Debito Comma A</p>
                <p className="text-2xl font-black text-blue-800">
                  {formDoc.contratto === 'SPEZZONE' ? Math.floor(40 * (formDoc.mesi / 9)) : Math.floor(((formDoc.contratto === 'INTERA' ? 80 : (80/18)*formDoc.ore) * (formDoc.mesi/9)) / 2)}h
                </p>
              </div>
              <div className="w-px h-8 bg-blue-200"></div>
              <div className="text-center">
                <p className="text-[8px] font-black text-blue-400 uppercase">Debito Comma B</p>
                <p className="text-2xl font-black text-blue-800">
                   {formDoc.contratto === 'SPEZZONE' ? Math.ceil((40/18) * formDoc.ore * (formDoc.mesi/9)) : Math.ceil(((formDoc.contratto === 'INTERA' ? 80 : (80/18)*formDoc.ore) * (formDoc.mesi/9)) / 2)}h
                </p>
              </div>
            </div>
            <button onClick={saveDocente} className="w-full bg-blue-700 text-white p-8 rounded-[2rem] font-black text-xl uppercase shadow-xl hover:bg-slate-900 transition-all">
              Conferma e Crea Accesso
            </button>
          </div>
        </div>
      )}

      {tab === 'impegni' && (
        <div className="max-w-2xl mx-auto bg-white p-12 rounded-[3.5rem] shadow-2xl border animate-in zoom-in">
          <h2 className="text-3xl font-black mb-10 uppercase italic text-orange-600 tracking-tighter">Crea Nuova Attività</h2>
          <div className="space-y-6">
            <input type="text" placeholder="TITOLO ATTIVITÀ" className="w-full p-6 bg-slate-50 rounded-[2rem] font-bold uppercase outline-none focus:border-orange-500 border-4 border-transparent" value={formImp.titolo} onChange={e => setFormImp({...formImp, titolo: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
              <input type="date" className="p-6 bg-slate-50 rounded-[2rem] font-bold outline-none" value={formImp.data} onChange={e => setFormImp({...formImp, data: e.target.value})} />
              <div className="flex gap-2 p-3 bg-slate-50 rounded-[2rem]">
                <button onClick={() => setFormImp({...formImp, tipo: 'A'})} className={`flex-1 rounded-xl font-black text-[9px] uppercase transition-all ${formImp.tipo === 'A' ? 'bg-blue-800 text-white shadow-md' : 'bg-white'}`}>A</button>
                <button onClick={() => setFormImp({...formImp, tipo: 'B'})} className={`flex-1 rounded-xl font-black text-[9px] uppercase transition-all ${formImp.tipo === 'B' ? 'bg-indigo-800 text-white shadow-md' : 'bg-white'}`}>B</button>
              </div>
            </div>
            <input type="number" step="0.5" placeholder="ORE PREVISTE" className="w-full p-6 bg-slate-50 rounded-[2rem] font-bold outline-none" value={formImp.ore} onChange={e => setFormImp({...formImp, ore: Number(e.target.value)})} />
            <button onClick={saveImpegno} className="w-full bg-orange-600 text-white p-8 rounded-[2.5rem] font-black text-xl uppercase shadow-xl">Pubblica in Calendario</button>
          </div>
        </div>
      )}

      {tab === 'appello' && (
        <div className="grid lg:grid-cols-2 gap-8 animate-in fade-in">
          <div className="space-y-3">
            <h3 className="text-[9px] font-black uppercase text-slate-400 ml-5 tracking-widest">Seleziona Attività</h3>
            {data.impegni.map((i: any) => (
              <div key={i.id} className="relative group">
                <div 
                  onClick={() => setActiveImp(i.id)}
                  className={`p-6 rounded-[2.5rem] border-4 cursor-pointer transition-all flex justify-between items-center ${activeImp === i.id ? 'bg-white border-blue-700 shadow-xl scale-[1.01]' : 'bg-white border-transparent shadow-sm'}`}
                >
                  <div>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full mb-2 inline-block ${i.tipo === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>COMMA {i.tipo}</span>
                    <h4 className="font-black uppercase text-lg tracking-tighter">{i.titolo}</h4>
                    <p className="text-[9px] font-bold text-slate-300 uppercase italic">{i.data} • {i.durata_max}H</p>
                  </div>
                </div>
                <button onClick={() => deleteImpegno(i.id)} className="absolute -top-1 -right-1 bg-red-500 text-white p-2.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            ))}
          </div>
          <div className="bg-white p-8 rounded-[3.5rem] shadow-2xl border sticky top-28 min-h-[450px]">
            <h3 className="text-xl font-black mb-6 uppercase italic underline decoration-blue-100 underline-offset-4">Validazione Ore</h3>
            <div className="space-y-2.5">
              {data.piani.filter((p: any) => p.impegno_id === activeImp).map((p: any) => {
                const d = data.docenti.find((x: any) => x.id === p.docente_id);
                return (
                  <div key={p.id} className="flex justify-between items-center p-5 bg-slate-50 rounded-[1.8rem] border-2 border-transparent hover:border-blue-100 transition-all">
                    <div>
                      <p className="font-black uppercase text-[11px] text-slate-800">{d?.nome}</p>
                      <p className="text-[9px] font-bold text-blue-600 uppercase">Dichiarate: {p.ore_effettive}H</p>
                    </div>
                    <button 
                      onClick={async () => { await supabase.from('piani').update({ presente: !p.presente }).eq('id', p.id); loadData(); }}
                      className={`px-6 py-2 rounded-full font-black text-[9px] uppercase shadow-md transition-all ${p.presente ? 'bg-emerald-500 text-white' : 'bg-white text-slate-300 border border-slate-100'}`}
                    >
                      {p.presente ? 'Validato' : 'Valida'}
                    </button>
                  </div>
                );
              })}
              {!activeImp && <div className="text-center py-24 opacity-20 font-black uppercase text-[10px] tracking-[0.4em]">Scegli un impegno</div>}
            </div>
          </div>
        </div>
      )}

      {tab === 'documenti' && (
        <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border animate-in zoom-in">
          <div className="grid lg:grid-cols-2 gap-12">
            <div className="bg-slate-50 p-10 rounded-[2.5rem] border-4 border-dashed border-slate-200 text-center flex flex-col items-center justify-center min-h-[250px]">
              <div className="w-16 h-16 bg-blue-800 rounded-full flex items-center justify-center text-white mb-5 shadow-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              </div>
              <input type="file" className="text-[9px] font-black uppercase text-slate-400 cursor-pointer file:bg-slate-900 file:text-white file:rounded-full file:px-6 file:py-2.5 file:border-0 hover:file:bg-blue-700" onChange={async (e) => {
                const file = e.target.files?.[0];
                if(!file) return;
                const path = `${Date.now()}_${file.name}`;
                const { error: upErr } = await supabase.storage.from('files').upload(path, file);
                if(upErr) return alert("ERRORE: Bucket 'files' mancante o non pubblico.");
                const { data: { publicUrl } } = supabase.storage.from('files').getPublicUrl(path);
                await supabase.from('documenti').insert([{ nome: file.name, url: publicUrl, storage_path: path }]);
                loadData();
              }} />
            </div>
            <div className="space-y-3">
              <h3 className="text-[9px] font-black uppercase text-slate-300 mb-5 tracking-widest italic">Documenti Pubblicati</h3>
              {data.docs.map((doc: any) => (
                <div key={doc.id} className="p-5 bg-white border border-slate-100 rounded-[1.8rem] flex justify-between items-center shadow-sm hover:shadow-md transition-all">
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center font-black text-[9px]">DOC</div>
                     <span className="font-black uppercase text-[10px] text-slate-700 truncate max-w-[150px]">{doc.nome}</span>
                   </div>
                   <div className="flex gap-3">
                     <a href={doc.url} target="_blank" className="bg-blue-50 text-blue-600 px-5 py-2 rounded-xl font-black text-[9px] uppercase hover:bg-blue-100 transition-colors">Apri</a>
                     <button onClick={async () => { if(confirm("Eliminare?")) { await supabase.storage.from('files').remove([doc.storage_path]); await supabase.from('documenti').delete().eq('id', doc.id); loadData(); }}} className="text-red-500 font-black text-[9px] uppercase hover:underline">Elimina</button>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selDoc && (
        <div className="mt-12 border-t-[8px] border-slate-900 pt-12">
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
    <div className="space-y-8 max-w-[1200px] mx-auto">
      <div className="bg-white p-8 rounded-[3rem] shadow-2xl border-t-[10px] border-blue-800 flex flex-wrap justify-between items-center gap-6">
        {!adminMode && (
          <div>
            <h2 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">{docente.nome}</h2>
            <p className="text-blue-600 font-black uppercase text-[10px] tracking-widest mt-3">{docente.contratto} • {docente.ore_settimanali}H SETT.</p>
          </div>
        )}
        <div className="flex gap-3">
           <AdminStatMini label="COMMA A" val={stats.vA} max={docente.ore_a_dovute} col="blue" pian={stats.pA} />
           <AdminStatMini label="COMMA B" val={stats.vB} max={docente.ore_b_dovute} col="indigo" pian={stats.pB} />
        </div>
        <button onClick={() => setTab(tab === 'p' ? 'r' : 'p')} className="bg-slate-900 text-white px-8 py-4 rounded-full font-black text-[9px] uppercase tracking-widest shadow-lg">
          {tab === 'p' ? 'Vedi Report PDF' : 'Torna a Piano Ore'}
        </button>
      </div>

      {tab === 'p' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {impegni.map(i => {
            const p = piani.find(x => x.impegno_id === i.id);
            return (
              <div key={i.id} className={`p-8 bg-white rounded-[2.5rem] border-4 transition-all flex flex-col justify-between min-h-[280px] ${p ? 'border-blue-700 shadow-xl' : 'border-transparent shadow-sm'}`}>
                <div>
                  <div className="flex justify-between items-start mb-5">
                    <span className={`px-3 py-1 rounded-full font-black text-[8px] uppercase ${i.tipo === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>COMMA {i.tipo}</span>
                    {p?.presente && <span className="bg-emerald-500 text-white px-3 py-1 rounded-full font-black text-[8px]">VALIDO</span>}
                  </div>
                  <h4 className="font-black uppercase text-xl tracking-tighter leading-tight text-slate-800 mb-1.5">{i.titolo}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase italic">{i.data}</p>
                </div>
                <div className="mt-6 pt-6 border-t-2 border-slate-50 flex items-center gap-4">
                   <div className="text-center">
                     <p className="text-[7px] font-black text-slate-300 uppercase mb-1.5">Ore</p>
                     <input id={`h-${i.id}`} type="number" step="0.5" defaultValue={p ? p.ore_effettive : i.durata_max} disabled={p?.presente && !adminMode} className="w-12 p-3 bg-slate-100 rounded-xl font-black text-xl text-center outline-none" />
                   </div>
                   <button 
                    onClick={async () => {
                      const h = (document.getElementById(`h-${i.id}`) as HTMLInputElement).value;
                      if(p) { if(p.presente && !adminMode) return; await supabase.from('piani').delete().eq('id', p.id); }
                      else { await supabase.from('piani').insert([{ docente_id: docente.id, impegno_id: i.id, ore_effettive: Number(h), tipo: i.tipo }]); }
                      load();
                    }}
                    className={`flex-1 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-xl transition-all ${p ? 'bg-red-50 text-red-500 border-2 border-red-100' : 'bg-slate-900 text-white hover:bg-blue-800'}`}
                   >
                     {p ? 'Elimina' : 'Dichiara'}
                   </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white p-16 rounded-[4rem] shadow-2xl border print:border-none print:shadow-none animate-in zoom-in">
           <h1 className="text-6xl font-black uppercase italic tracking-tighter border-b-8 border-slate-900 pb-8 mb-12">CERTIFICATO</h1>
           <table className="w-full">
             <tbody className="divide-y-4 divide-slate-50">
               {piani.filter(p => p.presente).map(p => {
                 const i = impegni.find(x => x.id === p.impegno_id);
                 return (
                   <tr key={p.id}>
                     <td className="py-8 font-black uppercase text-xl italic tracking-tighter text-slate-700">{i?.titolo}</td>
                     <td className="py-8 text-right font-black text-4xl italic text-blue-800 tracking-tighter">{p.ore_effettive.toFixed(1)}H</td>
                   </tr>
                 );
               })}
               <tr className="bg-slate-900 text-white">
                 <td className="p-10 font-black uppercase text-2xl italic tracking-widest">Totale Validato</td>
                 <td className="p-10 text-right font-black text-7xl italic text-blue-400 tracking-tighter">{(stats.vA + stats.vB).toFixed(1)}H</td>
               </tr>
             </tbody>
           </table>
           <button onClick={() => window.print()} className="w-full mt-12 bg-blue-700 text-white p-10 rounded-[3rem] font-black text-3xl uppercase shadow-2xl print:hidden hover:bg-blue-800">Stampa / PDF</button>
        </div>
      )}
    </div>
  );
}

function AdminStatMini({ label, val, max, col, pian = 0 }: any) {
  const c = col === 'blue' ? 'text-blue-700' : 'text-indigo-700';
  const bg = col === 'blue' ? 'bg-blue-50' : 'bg-indigo-50';
  return (
    <div className={`${bg} px-8 py-5 rounded-[2rem] border-4 border-white text-center shadow-lg min-w-[160px]`}>
      <p className="text-[8px] font-black text-slate-400 uppercase mb-2 tracking-widest">{label}</p>
      <div className="flex justify-center items-end gap-1">
        <p className={`text-3xl font-black italic tracking-tighter ${c}`}>{val}</p>
        <p className="text-[11px] font-bold text-slate-300 mb-1">/ {max}H</p>
      </div>
      {pian > val && <p className="text-[7px] font-black text-orange-600 uppercase mt-1 italic leading-none">Pian: {pian}h</p>}
    </div>
  );
}
