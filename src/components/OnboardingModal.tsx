import React, { useState } from 'react';
import { UserSettings } from '../lib/settingsStore';
import { ArrowRight, ArrowLeft, Info, Check, X } from 'lucide-react';
import { Logo } from './ChatInterface';

interface OnboardingModalProps {
  settings: UserSettings;
  updateSettings: (settings: Partial<UserSettings>) => void;
  onComplete: () => void;
}

export default function OnboardingModal({ settings, updateSettings, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);

  const handleNext = () => setStep(prev => Math.min(3, prev + 1));
  const handlePrev = () => setStep(prev => Math.max(1, prev - 1));

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800/50">
          <div className="flex items-center gap-3">
            <Logo className="w-8 h-8" />
            <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">
              Bienvenue sur Cheikh IA
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Étape {step} / 3
            </span>
            <button
              onClick={onComplete}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Passer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 min-h-[300px] flex flex-col">
          {step === 1 && (
            <div className="flex-1 animate-in fade-in slide-in-from-right-4 duration-300">
              <h4 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Choisissez votre thème</h4>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">Sélectionnez l'apparence qui vous convient le mieux pour lire de jour comme de nuit.</p>
              
              <div className="space-y-3">
                {[
                  { id: 'light', label: 'Clair', desc: 'Thème lumineux classique' },
                  { id: 'dark', label: 'Sombre', desc: 'Reposant pour les yeux' },
                  { id: 'system', label: 'Système', desc: 'S\'adapte à votre appareil' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => updateSettings({ theme: t.id as any })}
                    className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all ${settings.theme === t.id ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-500/20' : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                  >
                    <div>
                      <span className="block font-medium text-zinc-900 dark:text-zinc-100">{t.label}</span>
                      <span className="text-xs text-zinc-500">{t.desc}</span>
                    </div>
                    {settings.theme === t.id && <Check className="w-5 h-5 text-emerald-600" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex-1 animate-in fade-in slide-in-from-right-4 duration-300">
              <h4 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Orientation jurisprudentielle</h4>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">Indiquez si vous souhaitez que l'IA présente en priorité l'avis d'une école spécifique.</p>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                {[
                  { id: 'all', title: "Vue d'ensemble (4 Écoles)", desc: "Présente la synthèse sans préférence." },
                  { id: 'maliki', title: "Priorité École Malikite", desc: "Met en avant l'avis de l'école de l'Imam Malik." },
                  { id: 'hanafi', title: "Priorité École Hanafite", desc: "Met en avant l'avis de l'école de l'Imam Abou Hanifah." },
                  { id: 'shafii', title: "Priorité École Chafiite", desc: "Met en avant l'avis de l'école de l'Imam Al-Chafi'i." },
                  { id: 'hanbali', title: "Priorité École Hanbalite", desc: "Met en avant l'avis de l'école de l'Imam Ahmad." },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => updateSettings({ schoolPreference: item.id as any })}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${
                      settings.schoolPreference === item.id
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-500/20'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.title}</span>
                        <span className="block text-xs text-zinc-500">{item.desc}</span>
                      </div>
                      {settings.schoolPreference === item.id && <Check className="w-5 h-5 text-emerald-600" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl p-6 text-center">
                <Info className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h4 className="text-lg font-bold text-red-700 dark:text-red-400 mb-3">Avertissement Important</h4>
                <p className="text-sm text-red-600/90 dark:text-red-300/90 leading-relaxed">
                  Cheikh IA est un outil d'accompagnement et d'apprentissage. Ses réponses sont fournies à titre indicatif et éducatif : l'intelligence artificielle ne remplace en aucun cas la consultation, l'avis et la guidance des savants et imams qualifiés.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-zinc-100 dark:border-zinc-800/50 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
          <button
            onClick={handlePrev}
            disabled={step === 1}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 disabled:opacity-0 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Précédent
          </button>
          
          {step < 3 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-transform active:scale-95"
            >
              Suivant
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onComplete}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-transform active:scale-95"
            >
              Compris, commencer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
