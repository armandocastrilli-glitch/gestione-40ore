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
      {/* AREA CARICAMENTO */}
      <div className="bg-slate-50 p-10 rounded-[2.5rem] border-4 border-dashed border-slate-200 text-center flex flex-col items-center justify-center min-h-[250px]">
        <div className="w-16 h-16 bg-blue-800 rounded-full flex items-center justify-center text-white mb-5 shadow-lg">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
          </svg>
        </div>
       <input 
          type="file" 
          className="text-[9px] font-black uppercase text-slate-400 cursor-pointer file:bg-slate-900 file:text-white file:rounded-full file:px-6 file:py-2.5 file:border-0 hover:file:bg-blue-700" 
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if(!file) return;
            
            const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            
            try {
              // 1. Caricamento fisico
              const { error: upErr } = await supabase.storage
                .from('files')
                .upload(fileName, file);

              if(upErr) throw upErr;

              // 2. Recupero URL
              const { data: { publicUrl } } = supabase.storage.from('files').getPublicUrl(fileName);

              // 3. Salvataggio DB
              await supabase.from('documenti').insert([{ 
                nome: file.name, 
                url: publicUrl, 
                storage_path: fileName 
              }]);

              alert("File caricato con successo!");
              window.location.reload(); // Ricarica per vedere il file senza perdere la sessione se i cookie sono attivi
            } catch (err: any) {
              alert("Errore durante il caricamento: " + err.message);
            }
          }} 
        />
      </div>

      {/* LISTA FILE SEMPLIFICATA PER EVITARE ERRORI */}
      <div className="grid gap-4 mt-8">
        <p className="text-[10px] font-black uppercase opacity-50">Documenti caricati:</p>
        {/* Qui i file appariranno al prossimo refresh */}
        <p className="text-[9px] italic opacity-50 text-center">I nuovi file appariranno dopo il ricaricamento della pagina.</p>
      </div>

      {/* LISTA FILE CON TASTO ELIMINA */}
      <div className="space-y-3">
        <h3 className="text-[9px] font-black uppercase text-slate-300 mb-5 tracking-widest italic">Documenti Pubblicati</h3>
        {data.docs.length === 0 && <p className="text-center py-10 text-slate-200 font-black uppercase text-[10px]">Nessun file presente</p>}
        {data.docs.map((doc: any) => (
          <div key={doc.id} className="p-5 bg-white border border-slate-100 rounded-[1.8rem] flex justify-between items-center shadow-sm hover:shadow-md transition-all group">
             <div className="flex items-center gap-4">
               <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center font-black text-[9px]">PDF</div>
               <span className="font-black uppercase text-[10px] text-slate-700 truncate max-w-[180px]">{doc.nome}</span>
             </div>
             <div className="flex gap-2">
               <a 
                 href={doc.url} 
                 target="_blank" 
                 rel="noreferrer"
                 className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-black text-[9px] uppercase hover:bg-blue-600 hover:text-white transition-all"
               >
                 Apri
               </a>
               <button 
                 onClick={async () => {
                   if(confirm("Vuoi eliminare definitivamente questo documento?")) {
                     // 1. Elimina il file fisico dallo Storage
                     const { error: storageErr } = await supabase.storage
                       .from('files')
                       .remove([doc.storage_path]);
                     
                     if (storageErr) console.error("Errore rimozione file:", storageErr);

                     // 2. Elimina il riferimento dal Database
                     await supabase.from('documenti').delete().eq('id', doc.id);
                     
                     loadData();
                   }
                 }}
                 className="bg-white text-slate-300 px-4 py-2 rounded-xl font-black text-[9px] uppercase hover:bg-red-500 hover:text-white transition-all border border-slate-100"
               >
                 Elimina
               </button>
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
  const [documenti, setDocumenti] = useState<any[]>([]);
  const [tab, setTab] = useState('calendario');

  // Caricamento dati sincronizzato
  const load = useCallback(async () => {
    const [i, p, d] = await Promise.all([
      supabase.from('impegni').select('*').order('data', { ascending: true }),
      supabase.from('piani').select('*').eq('docente_id', docente.id),
      supabase.from('documenti').select('*').order('created_at', { ascending: false })
    ]);
    setImpegni(i.data || []); 
    setPiani(p.data || []);
    setDocumenti(d.data || []);
  }, [docente.id]);

  useEffect(() => { load(); }, [load]);

  // LOGICA STATISTICHE: P e AG sommano le ore, ANG e NULL no.
  const stats = {
    pA: piani.filter(p => p.tipo === 'A').reduce((s, c) => s + c.ore_effettive, 0),
    pB: piani.filter(p => p.tipo === 'B').reduce((s, c) => s + c.ore_effettive, 0),
    vA: piani.filter(p => p.tipo === 'A' && (p.stato === 'P' || p.stato === 'AG')).reduce((s, c) => s + c.ore_effettive, 0),
    vB: piani.filter(p => p.tipo === 'B' && (p.stato === 'P' || p.stato === 'AG')).reduce((s, c) => s + c.ore_effettive, 0),
  };

  const updateStato = async (pianoId: string, nuovoStato: string | null) => {
    await supabase.from('piani').update({ stato: nuovoStato }).eq('id', pianoId);
    load();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 pb-20">
      
      {/* HEADER E PROGRESS BAR */}
      <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 mb-10">
        <div className="flex flex-wrap items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-blue-800 rounded-2xl flex items-center justify-center text-white font-black italic text-3xl shadow-lg">
              {docente.nome[0]}
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800">{docente.nome}</h2>
              <div className="flex gap-3 mt-1 font-bold text-[10px] uppercase">
                <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{docente.contratto}</span>
                <span className="text-slate-400 bg-slate-50 px-2 py-0.5 rounded">{docente.ore_settimanali}H / SETT</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ProgressBar label="Validato Comma A (P+AG)" attuale={stats.vA} target={docente.ore_a_dovute} color="blue" />
          <ProgressBar label="Validato Comma B (P+AG)" attuale={stats.vB} target={docente.ore_b_dovute} color="indigo" />
        </div>
      </div>

      {/* NAVIGAZIONE */}
      <div className="flex flex-wrap justify-center gap-2 mb-10 bg-slate-100 p-2 rounded-[2.5rem] w-fit mx-auto border shadow-inner">
        <button onClick={() => setTab('calendario')} className={`px-8 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'calendario' ? 'bg-white shadow-md text-blue-700' : 'opacity-40 hover:opacity-100'}`}>📅 Calendario</button>
        <button onClick={() => setTab('miei')} className={`px-8 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'miei' ? 'bg-white shadow-md text-blue-700' : 'opacity-40 hover:opacity-100'}`}>✅ Il Mio Piano</button>
        <button onClick={() => setTab('documenti')} className={`px-8 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'documenti' ? 'bg-white shadow-md text-blue-700' : 'opacity-40 hover:opacity-100'}`}>📂 Documenti</button>
        <button onClick={() => setTab('report')} className={`px-8 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'report' ? 'bg-white shadow-md text-blue-700' : 'opacity-40 hover:opacity-100'}`}>📄 Report</button>
      </div>

      {/* TAB 1: CALENDARIO GENERALE */}
      {tab === 'calendario' && (
        <div className="grid gap-3 animate-in fade-in slide-in-from-bottom-4">
           {impegni.map(i => {
             const p = piani.find(x => x.impegno_id === i.id);
             return (
               <div key={i.id} className={`bg-white rounded-[2rem] border p-6 flex items-center transition-all ${p ? 'border-blue-500 bg-blue-50/20' : 'border-slate-100 hover:shadow-xl'}`}>
                 <div className="w-20 text-center border-r border-slate-100 pr-6">
                   <span className="block text-2xl font-black text-slate-800 leading-none">{i.data.split('-')[2]}</span>
                   <span className="text-[10px] font-bold text-slate-400 uppercase">{i.data.split('-')[1]}/{i.data.split('-')[0]}</span>
                 </div>
                 <div className="flex-1 px-8">
                   <span className={`text-[8px] font-black px-2 py-1 rounded uppercase mb-2 inline-block ${i.tipo === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>Comma {i.tipo}</span>
                   <h4 className="font-black text-slate-700 uppercase text-lg">{i.titolo}</h4>
                 </div>
                 <div className="flex items-center gap-6">
                   <div className="flex flex-col items-center">
                     <span className="text-[9px] font-black uppercase text-slate-300 mb-1 italic">H. Previste</span>
                     <input 
                      id={`ore-${i.id}`} type="number" step="0.5" min="0.5" max={i.durata_max || i.ore}
                      defaultValue={p ? p.ore_effettive : (i.durata_max || i.ore)}
                      disabled={!!p}
                      className="w-16 bg-slate-50 border-2 border-slate-100 rounded-xl p-2 text-center font-black text-base outline-none focus:border-blue-500"
                     />
                   </div>
                   <button 
                    onClick={async () => {
                      if(p) { await supabase.from('piani').delete().eq('id', p.id); } 
                      else {
                        const oreScelte = (document.getElementById(`ore-${i.id}`) as HTMLInputElement).value;
                        await supabase.from('piani').insert([{ docente_id: docente.id, impegno_id: i.id, ore_effettive: Number(oreScelte), tipo: i.tipo }]);
                      }
                      load();
                    }}
                    className={`h-14 px-8 rounded-2xl text-[10px] font-black uppercase transition-all shadow-lg ${p ? 'bg-red-500 text-white shadow-red-100' : 'bg-slate-900 text-white hover:bg-blue-600 shadow-slate-200'}`}
                   >
                     {p ? 'Rimuovi' : 'Prenota'}
                   </button>
                 </div>
               </div>
             );
           })}
        </div>
      )}

      {/* TAB 2: IL MIO PIANO + VALIDAZIONE */}
      {tab === 'miei' && (
        <div className="grid gap-4">
          {piani.map(p => {
            const info = impegni.find(i => i.id === p.impegno_id);
            return (
              <div key={p.id} className={`bg-white p-8 rounded-[2.5rem] border-l-[16px] shadow-md flex justify-between items-center ${
                p.stato === 'P' || p.stato === 'AG' ? 'border-l-emerald-500' : p.stato === 'ANG' ? 'border-l-red-500' : 'border-l-orange-400'
              }`}>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{info?.data}</p>
                  <h4 className="text-xl font-black uppercase text-slate-800">{info?.titolo}</h4>
                  <p className="font-bold text-sm text-blue-600 uppercase">Comma {p.tipo} • {p.ore_effettive} Ore</p>
                </div>

                <div className="flex items-center gap-4">
                  {adminMode ? (
                    <div className="flex bg-slate-100 p-2 rounded-2xl gap-2 border">
                      <button onClick={() => updateStato(p.id, 'P')} className={`w-12 h-12 rounded-xl text-xs font-black transition-all ${p.stato === 'P' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white text-slate-400 hover:text-emerald-500'}`}>P</button>
                      <button onClick={() => updateStato(p.id, 'AG')} className={`w-12 h-12 rounded-xl text-xs font-black transition-all ${p.stato === 'AG' ? 'bg-blue-500 text-white shadow-lg' : 'bg-white text-slate-400 hover:text-blue-500'}`}>AG</button>
                      <button onClick={() => updateStato(p.id, 'ANG')} className={`w-12 h-12 rounded-xl text-xs font-black transition-all ${p.stato === 'ANG' ? 'bg-red-500 text-white shadow-lg' : 'bg-white text-slate-400 hover:text-red-500'}`}>ANG</button>
                      <button onClick={() => updateStato(p.id, null)} className="w-12 h-12 text-slate-300 font-bold hover:text-slate-600">×</button>
                    </div>
                  ) : (
                    <div className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-tighter ${
                      p.stato === 'P' ? 'bg-emerald-50 text-emerald-600' : 
                      p.stato === 'AG' ? 'bg-blue-50 text-blue-600' : 
                      p.stato === 'ANG' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-400 italic'
                    }`}>
                      {p.stato === 'P' ? 'Presente ✓' : p.stato === 'AG' ? 'Ass. Giustificata' : p.stato === 'ANG' ? 'Ass. Ingiustificata' : 'In attesa'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: DOCUMENTI */}
      {tab === 'documenti' && (
        <div className="grid gap-4 animate-in fade-in">
          {documenti.map(doc => (
            <div key={doc.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex justify-between items-center group hover:shadow-xl transition-all">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl">📄</div>
                <div>
                  <h4 className="font-black text-slate-800 uppercase text-lg">{doc.nome}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">CARICATO IL {new Date(doc.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <a href={doc.url} target="_blank" rel="noreferrer" className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase hover:bg-blue-600 shadow-lg transition-all">Download</a>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: REPORT PDF */}
      {tab === 'report' && (
        <div id="piano-stampa" className="bg-white p-12 rounded-[3rem] shadow-2xl border animate-in zoom-in">
           <div className="flex justify-between items-start border-b-8 border-slate-900 pb-10 mb-10">
             <div>
               <h1 className="text-5xl font-black uppercase tracking-tighter italic leading-none mb-2">Piano Attività</h1>
               <p className="text-xl font-bold text-blue-700 uppercase">{docente.nome}</p>
             </div>
             <button onClick={() => window.print()} className="bg-slate-900 text-white px-10 py-5 rounded-2xl text-xs font-black uppercase print:hidden shadow-xl">Stampa PDF</button>
           </div>
           <table className="w-full text-left">
             <thead>
               <tr className="border-b-4 border-slate-100 text-[11px] font-black uppercase text-slate-400">
                 <th className="py-6">Data</th>
                 <th>Attività</th>
                 <th className="text-center">Comma</th>
                 <th className="text-center">Stato</th>
                 <th className="text-right">Ore</th>
               </tr>
             </thead>
             <tbody>
               {piani.map(p => {
                 const info = impegni.find(i => i.id === p.impegno_id);
                 return (
                   <tr key={p.id} className="border-b border-slate-50 font-bold text-slate-700">
                     <td className="py-6">{info?.data}</td>
                     <td className="uppercase">{info?.titolo}</td>
                     <td className="text-center">Comma {p.tipo}</td>
                     <td className="text-center text-[10px] uppercase">{p.stato || 'Attesa'}</td>
                     <td className="text-right font-black">{p.ore_effettive}H</td>
                   </tr>
                 );
               })}
             </tbody>
           </table>
           <div className="mt-16 grid grid-cols-2 gap-10">
              <div className="bg-slate-50 p-8 rounded-[2rem]">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Totale Comma A (Validato)</p>
                <p className="text-4xl font-black text-slate-800">{stats.vA} / {docente.ore_a_dovute}H</p>
              </div>
              <div className="bg-slate-50 p-8 rounded-[2rem]">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Totale Comma B (Validato)</p>
                <p className="text-4xl font-black text-slate-800">{stats.vB} / {docente.ore_b_dovute}H</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
// --- COMPONENTE BARRA DI AVANZAMENTO (Da mettere fuori dalle altre funzioni) ---
function ProgressBar({ label, attuale, target, color }: any) {
  // Calcolo della percentuale (massimo 100%)
  const percent = Math.min((attuale / target) * 100, 100);
  const colorClass = color === 'blue' ? 'bg-blue-600' : 'bg-indigo-600';
  
  return (
    <div className="bg-white p-6 rounded-[2rem] border shadow-sm">
      <div className="flex justify-between items-end mb-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">
          {label}
        </span>
        <span className="text-xl font-black leading-none">
          {attuale} <span className="text-slate-300 text-sm font-bold">/ {target}H</span>
        </span>
      </div>
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClass} transition-all duration-1000 ease-out`} 
          style={{ width: `${percent}%` }}
        ></div>
      </div>
      {attuale > target && (
        <p className="text-[8px] font-black text-emerald-500 uppercase mt-2 animate-pulse">
          ✨ Ore eccedenti: +{attuale - target}H
        </p>
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
