
import React, { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { GameState, Milestone, UserContext, SavedSession } from './types';
import { generateRoadmap } from './services/geminiService';
import { getSavedTrajectory, getAllTrajectories, saveTrajectory, deleteTrajectory } from './services/dbService';
import GameScene from './components/GameScene';
import { Sparkles, MapPin, Target, Trophy, ChevronRight, Play, Keyboard, AlertCircle, RefreshCw, History, ArrowDown, ArrowUp, Search, PlusCircle, UserCircle, Home } from 'lucide-react';

const getDisplayYear = (year: number) => {
  const actualYear = year < 100 ? 2025 + year : year;
  return `Final ${actualYear}`;
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.LANDING);
  const [context, setContext] = useState<UserContext>({
    name: 'Gabriel',
    currentStatus: '',
    tenYearGoal: ''
  });
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [distance, setDistance] = useState(0);
  const [isWalking, setIsWalking] = useState(false);
  const [isWalkingBackward, setIsWalkingBackward] = useState(false);
  const [showMilestoneDialog, setShowMilestoneDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedTrajectories, setSavedTrajectories] = useState<SavedSession[]>([]);
  const [currentId, setCurrentId] = useState<string | undefined>(undefined);
  
  const currentMilestone = milestones[currentIndex];
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  const handleFetchSaved = async () => {
    setError(null);
    setGameState(GameState.LOADING_DB);
    try {
      const data = await getAllTrajectories();
      if (data && data.length > 0) {
        setSavedTrajectories(data);
        setGameState(GameState.LISTING);
      } else {
        setError("Nenhuma jornada encontrada no banco de dados.");
        setGameState(GameState.LANDING);
      }
    } catch (err) {
      console.error("Erro ao buscar dados:", err);
      setError("Erro de conexão com o banco de dados Neon.");
      setGameState(GameState.LANDING);
    }
  };

  const selectAndResume = (session: SavedSession) => {
    try {
      setContext(session.context);
      setMilestones(session.milestones);
      setDistance(session.distance || 0);
      setCurrentIndex(session.currentIndex ?? -1);
      setCurrentId(session.id);
      if (session.id) localStorage.setItem('gabriel_odyssey_user_id', session.id);
      setGameState(GameState.PLAYING);
    } catch (err) {
      console.error("Erro ao processar dados selecionados:", err);
      setError("Dados corrompidos.");
      setGameState(GameState.LANDING);
    }
  };

  const handleStartJourney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!context.currentStatus || !context.tenYearGoal) return;

    setError(null);
    setGameState(GameState.GENERATING);
    
    try {
      const roadmap = await generateRoadmap(context);
      if (roadmap && roadmap.length > 0) {
        setMilestones(roadmap);
        
        const newId = 'user_' + Math.random().toString(36).substr(2, 9);
        setCurrentId(newId);
        
        await saveTrajectory({
          id: newId,
          context,
          milestones: roadmap,
          distance: 0,
          currentIndex: -1
        });

        setGameState(GameState.PLAYING);
        setDistance(0);
        setCurrentIndex(-1);
      } else {
        throw new Error("Falha na geração da jornada.");
      }
    } catch (err) {
      console.error(err);
      setError("Erro ao conectar com a IA. Tente novamente.");
      setGameState(GameState.INTRO);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
      keysPressed.current[e.key] = true; 
      
      if (gameState === GameState.PLAYING && !showMilestoneDialog) {
        if (['arrowup', 'w'].includes(e.key.toLowerCase())) setIsWalking(true);
        if (['arrowdown', 's'].includes(e.key.toLowerCase())) setIsWalkingBackward(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = false;
      keysPressed.current[e.key] = false;

      const forwardKeys = ['arrowup', 'w'];
      const backwardKeys = ['arrowdown', 's'];
      
      if (!forwardKeys.some(k => keysPressed.current[k])) setIsWalking(false);
      if (!backwardKeys.some(k => keysPressed.current[k])) setIsWalkingBackward(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, showMilestoneDialog]);

  useEffect(() => {
    if (gameState !== GameState.PLAYING || (!isWalking && !isWalkingBackward) || showMilestoneDialog) return;

    const interval = setInterval(() => {
      setDistance(prev => {
        let moveStep = 0;
        if (isWalking) moveStep = 0.15;
        else if (isWalkingBackward) moveStep = -0.15;

        const nextDist = Math.max(0, prev + moveStep);
        const milestoneTriggerIndex = Math.floor(nextDist / 30) - 1;
        
        if (isWalking && milestoneTriggerIndex > currentIndex && milestoneTriggerIndex < milestones.length) {
          setCurrentIndex(milestoneTriggerIndex);
          setShowMilestoneDialog(true);
          setIsWalking(false);
          
          saveTrajectory({
            id: currentId,
            context,
            milestones,
            distance: (milestoneTriggerIndex + 1) * 30,
            currentIndex: milestoneTriggerIndex
          });

          return (milestoneTriggerIndex + 1) * 30;
        }

        if (isWalkingBackward && milestoneTriggerIndex < currentIndex) {
          setCurrentIndex(milestoneTriggerIndex);
        }

        if (nextDist >= (milestones.length * 30) + 10) {
          setGameState(GameState.FINISHED);
          return prev;
        }

        return nextDist;
      });
    }, 16);

    return () => clearInterval(interval);
  }, [gameState, isWalking, isWalkingBackward, showMilestoneDialog, currentIndex, milestones, context, currentId]);

  return (
    <div className="relative w-full h-screen bg-[#020617] text-white overflow-hidden select-none font-sans">
      
      {/* 3D CANVAS */}
      {(gameState === GameState.PLAYING || gameState === GameState.FINISHED) && (
        <div className="absolute inset-0 z-0">
          <Canvas shadows camera={{ position: [0, 4, 10], fov: 50 }}>
            <Suspense fallback={null}>
              <GameScene 
                milestones={milestones} 
                currentMilestoneIndex={currentIndex} 
                isMoving={isWalking || isWalkingBackward}
                distance={distance}
              />
            </Suspense>
          </Canvas>
        </div>
      )}

      {/* UI LAYERS */}
      <div className="relative z-10 w-full h-full">
        
        {/* LANDING */}
        {gameState === GameState.LANDING && (
          <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-b from-slate-950 via-slate-900 to-black p-6">
            <div className="max-w-2xl w-full text-center space-y-16 animate-in fade-in zoom-in duration-1000">
              <div className="space-y-6">
                <h1 className="text-7xl md:text-8xl font-black tracking-tighter bg-gradient-to-r from-blue-500 via-indigo-400 to-cyan-400 bg-clip-text text-transparent uppercase">
                  Gabriel's<br/>Odyssey
                </h1>
                <p className="text-slate-400 font-mono text-sm tracking-[0.5em] uppercase">Sua Jornada Infinita no Neon DB</p>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm justify-center">
                  <AlertCircle size={18} /> {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <button 
                  onClick={handleFetchSaved}
                  className="group glass-morphism p-10 rounded-[40px] border border-white/5 hover:border-blue-500/40 hover:bg-blue-500/10 transition-all text-center space-y-6 shadow-2xl"
                >
                  <div className="mx-auto w-20 h-20 bg-blue-500/20 rounded-3xl flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                    <Search size={40} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight">Buscar Jornada</h3>
                    <p className="text-slate-500 text-xs mt-2 uppercase tracking-widest">Explorar registros globais</p>
                  </div>
                </button>

                <button 
                  onClick={() => setGameState(GameState.INTRO)}
                  className="group glass-morphism p-10 rounded-[40px] border border-white/5 hover:border-indigo-500/40 hover:bg-indigo-500/10 transition-all text-center space-y-6 shadow-2xl"
                >
                  <div className="mx-auto w-20 h-20 bg-indigo-500/20 rounded-3xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                    <PlusCircle size={40} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight">Nova História</h3>
                    <p className="text-slate-500 text-xs mt-2 uppercase tracking-widest">Traçar novo destino com IA</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* LOADING */}
        {gameState === GameState.LOADING_DB && (
          <div className="flex flex-col items-center justify-center w-full h-full bg-slate-950">
            <RefreshCw className="w-16 h-16 text-blue-500 animate-spin mb-8" />
            <h2 className="text-2xl font-black tracking-[0.3em] uppercase animate-pulse">Sincronizando com Neon...</h2>
          </div>
        )}

        {/* LISTING */}
        {gameState === GameState.LISTING && (
          <div className="flex items-center justify-center w-full h-full bg-black/90 p-6 backdrop-blur-xl">
            <div className="max-w-4xl w-full glass-morphism p-10 md:p-14 rounded-[50px] border border-white/10 flex flex-col gap-10 max-h-[85vh] shadow-[0_0_100px_rgba(59,130,246,0.1)]">
              <div className="flex justify-between items-end border-b border-white/5 pb-8">
                <div>
                  <h2 className="text-4xl font-black uppercase tracking-tighter text-white">Trajetórias Registradas</h2>
                  <p className="text-slate-500 text-xs mt-2 font-mono uppercase tracking-widest">Clique para retomar a caminhada</p>
                </div>
                <button onClick={() => setGameState(GameState.LANDING)} className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-bold transition-all flex items-center gap-2"><Home size={16}/> VOLTAR</button>
              </div>

              <div className="flex flex-col gap-6 overflow-y-auto pr-4 custom-scrollbar">
                {savedTrajectories.length > 0 ? savedTrajectories.map((traj) => (
                  <button 
                    key={traj.id} 
                    onClick={() => selectAndResume(traj)}
                    className="group bg-slate-900/50 hover:bg-blue-600/15 border border-white/5 hover:border-blue-500/40 p-8 rounded-[35px] text-left transition-all flex items-center gap-8 shadow-lg hover:shadow-blue-500/10"
                  >
                    <div className="w-16 h-16 rounded-[25px] bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-all flex-shrink-0">
                      <UserCircle size={36} />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-black text-2xl text-white group-hover:text-blue-300">{traj.context.name}</h4>
                        <span className="text-[10px] font-mono text-slate-600 uppercase">ID: {traj.id?.slice(-8)}</span>
                      </div>
                      <p className="text-slate-400 text-sm italic line-clamp-1">"{traj.context.currentStatus}"</p>
                      <div className="flex items-center gap-3 pt-2">
                        <div className="px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center gap-2">
                           <Target size={14} className="text-indigo-400" />
                           <span className="text-[11px] font-black text-indigo-300 uppercase tracking-tight">{traj.context.tenYearGoal}</span>
                        </div>
                        <span className="text-slate-600 font-bold text-[10px] uppercase">{Math.floor(traj.distance)}m percorridos</span>
                      </div>
                    </div>
                  </button>
                )) : (
                  <div className="text-center py-20 text-slate-600 font-black uppercase tracking-widest">Nenhuma jornada disponível.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* INTRO FORM */}
        {gameState === GameState.INTRO && (
          <div className="flex items-center justify-center w-full h-full bg-slate-950/80 p-6">
            <div className="max-w-2xl w-full p-12 glass-morphism rounded-[50px] border border-white/10 shadow-2xl animate-in slide-in-from-bottom-20 duration-1000">
              <div className="text-center mb-12">
                <h1 className="text-5xl font-black tracking-tighter uppercase text-white">Criar sua Odisseia</h1>
                <p className="text-slate-400 mt-3 font-medium text-lg italic">"O futuro pertence àqueles que acreditam na beleza de seus sonhos."</p>
              </div>
              <form onSubmit={handleStartJourney} className="space-y-8">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-[11px] font-black text-blue-400 uppercase tracking-[0.2em]"><MapPin size={16} /> Onde você está hoje?</label>
                    <textarea required className="w-full bg-slate-900/50 border border-white/10 rounded-3xl p-6 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all h-32 text-white placeholder-slate-600 resize-none text-lg" placeholder="Descreva seu momento atual..." value={context.currentStatus} onChange={(e) => setContext({...context, currentStatus: e.target.value})} />
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em]"><Target size={16} /> Qual seu ápice em 10 anos?</label>
                    <textarea required className="w-full bg-slate-900/50 border border-white/10 rounded-3xl p-6 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all h-32 text-white placeholder-slate-600 resize-none text-lg" placeholder="Onde você quer estar no final de 2035?" value={context.tenYearGoal} onChange={(e) => setContext({...context, tenYearGoal: e.target.value})} />
                  </div>
                </div>
                <div className="flex gap-6">
                  <button type="button" onClick={() => setGameState(GameState.LANDING)} className="flex-1 py-5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-3xl font-black transition-all uppercase tracking-widest">CANCELAR</button>
                  <button type="submit" className="flex-[2] py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl font-black flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-xl shadow-blue-500/20 uppercase tracking-widest"><Play size={20} fill="currentColor" /> INICIAR JORNADA</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* GENERATING */}
        {gameState === GameState.GENERATING && (
          <div className="flex flex-col items-center justify-center w-full h-full bg-slate-950">
            <div className="relative w-32 h-32 mb-10">
              <div className="absolute inset-0 border-[12px] border-blue-500/20 rounded-full"></div>
              <div className="absolute inset-0 border-[12px] border-t-blue-500 rounded-full animate-spin shadow-[0_0_60px_rgba(59,130,246,0.4)]"></div>
            </div>
            <h2 className="text-3xl font-black uppercase tracking-[0.4em] animate-pulse text-white">Tecendo o Destino...</h2>
            <p className="text-slate-500 mt-6 font-mono text-xs uppercase tracking-[0.2em]">A inteligência artificial está moldando seus próximos passos</p>
          </div>
        )}

        {/* HUD PLAYING */}
        {gameState === GameState.PLAYING && (
          <div className="p-10 h-full flex flex-col justify-between pointer-events-none">
            <div className="flex justify-between items-start">
              <div className="glass-morphism p-6 rounded-[35px] border-l-[6px] border-l-blue-500 pointer-events-auto shadow-2xl backdrop-blur-2xl">
                <p className="text-[11px] font-black text-blue-400 tracking-widest uppercase mb-4 flex items-center gap-2">
                   <RefreshCw size={12} className="animate-spin-slow" /> CONEXÃO NEON: ESTÁVEL
                </p>
                <div className="flex gap-2">
                  {milestones.map((_, i) => (
                    <div key={i} className={`h-2.5 w-10 rounded-full transition-all duration-1000 ${i <= currentIndex ? 'bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,1)]' : 'bg-slate-800'}`} />
                  ))}
                </div>
              </div>
              {!showMilestoneDialog && (
                <div className="flex flex-col gap-4 items-end pointer-events-auto">
                  <div className="glass-morphism px-8 py-3 rounded-full flex items-center gap-4 border border-white/5 shadow-xl">
                    <ArrowUp size={20} className="text-blue-400 animate-bounce" />
                    <span className="text-xs font-black tracking-widest uppercase text-white">AVANÇAR (W / ↑)</span>
                  </div>
                  <div className="glass-morphism px-8 py-3 rounded-full flex items-center gap-4 border border-white/5 shadow-xl opacity-80">
                    <ArrowDown size={20} className="text-slate-500" />
                    <span className="text-xs font-black tracking-widest uppercase text-white">VOLTAR (S / ↓)</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-center mb-10">
               {/* Contador de distância removido conforme solicitação */}
            </div>

            {showMilestoneDialog && currentMilestone && (
              <div className="fixed inset-0 flex items-center justify-center pointer-events-auto bg-slate-950/90 backdrop-blur-xl p-6 z-50">
                <div className="glass-morphism p-14 rounded-[60px] max-w-2xl w-full space-y-10 border border-white/10 shadow-[0_0_150px_rgba(59,130,246,0.2)] animate-in fade-in zoom-in duration-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="px-5 py-1.5 bg-blue-600 text-white rounded-full text-xs font-black uppercase tracking-[0.2em] mb-4 inline-block shadow-lg shadow-blue-500/40">MARCO ALCANÇADO: {getDisplayYear(currentMilestone.year)}</span>
                      <h2 className="text-5xl font-black tracking-tighter text-white leading-tight">{currentMilestone.title}</h2>
                    </div>
                    <div className="p-6 bg-yellow-500/20 rounded-[35px] text-yellow-500 animate-pulse shadow-inner"><Trophy size={50} /></div>
                  </div>
                  <p className="text-slate-200 text-2xl leading-relaxed font-semibold">{currentMilestone.description}</p>
                  <div className="p-8 bg-indigo-500/10 rounded-[40px] border border-indigo-500/20 italic relative shadow-inner">
                    <Sparkles className="absolute -top-4 -left-4 text-indigo-400" size={32} />
                    <p className="text-indigo-200 text-xl font-medium">"{currentMilestone.advice}"</p>
                  </div>
                  <button onClick={() => setShowMilestoneDialog(false)} className="w-full py-6 bg-white text-black rounded-[35px] font-black flex items-center justify-center gap-4 hover:bg-blue-600 hover:text-white transition-all transform active:scale-95 text-xl shadow-2xl">CONTINUAR A CAMINHADA <ChevronRight size={28} /></button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* FINISHED */}
        {gameState === GameState.FINISHED && (
          <div className="flex items-center justify-center w-full h-full bg-slate-950/95 p-6 pointer-events-auto">
            <div className="max-w-3xl w-full p-16 text-center space-y-12 glass-morphism rounded-[70px] border border-white/10 shadow-[0_0_200px_rgba(250,204,21,0.2)]">
              <div className="inline-block p-12 bg-yellow-500/20 rounded-full text-yellow-500 scale-125 animate-pulse mb-4 shadow-[0_0_80px_rgba(250,204,21,0.3)]"><Trophy size={100} /></div>
              <div className="space-y-6">
                <h2 className="text-7xl font-black uppercase tracking-tighter bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">Legado Consolidado</h2>
                <p className="text-slate-400 text-2xl">Você trilhou cada metro do seu destino sonhado.</p>
              </div>
              <div className="bg-white/5 p-10 rounded-[45px] border border-white/10 italic text-3xl text-blue-300 leading-snug shadow-inner">
                "{context.tenYearGoal}"
              </div>
              <button onClick={() => { deleteTrajectory(currentId); window.location.reload(); }} className="w-full py-8 bg-white text-black rounded-[40px] font-black hover:bg-red-600 hover:text-white transition-all text-2xl shadow-3xl uppercase tracking-widest">RECOMEÇAR NOVA HISTÓRIA</button>
            </div>
          </div>
        )}

        {/* RESUME PROMPT (Fallback para garantir que nada fique preto) */}
        {gameState === GameState.RESUME_PROMPT && (
          <div className="flex flex-col items-center justify-center w-full h-full bg-slate-950">
             <button onClick={() => setGameState(GameState.LANDING)} className="px-10 py-5 bg-blue-600 text-white font-black rounded-full shadow-2xl">VOLTAR AO INÍCIO</button>
          </div>
        )}

      </div>
      
      {/* Custom Styles for Scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.3); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(59, 130, 246, 0.5); }
        .animate-spin-slow { animation: spin 4s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default App;
