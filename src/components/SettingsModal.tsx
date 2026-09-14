import React, { useState } from 'react';
import { 
  X, Sun, Moon, Monitor, MessageSquare, Database, Shield, Info, 
  ChevronRight, ArrowLeft, Download, Trash2, LogOut, Check, FileText, 
  BookOpen, Sparkles, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { deleteConversationsInFirestore } from '../lib/chatStore';
import { UserSettings } from '../lib/settingsStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  isMobile: boolean;
  conversations: any[];
  setConversations: (convs: any[]) => void;
  onClearActiveChat?: () => void;
}

type TabId = 'appearance' | 'reading' | 'data' | 'security' | 'about';

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  updateSettings,
  isMobile,
  conversations,
  setConversations,
  onClearActiveChat
}: SettingsModalProps) {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId | null>(isMobile ? null : 'appearance');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'appearance', label: 'Apparence', icon: Sun },
    { id: 'reading', label: 'Réponses & Sources', icon: BookOpen },
    { id: 'data', label: 'Données & Confidentialité', icon: Database },
    { id: 'security', label: 'Sécurité & Compte', icon: Shield },
    { id: 'about', label: 'À propos', icon: Info },
  ];

  // Export JSON
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(conversations, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `cheikh-ia-discussions-${new Date().toISOString().slice(0, 10)}.json`);
    linkElement.click();
  };

  // Export readable Text file (.txt)
  const handleExportTXT = () => {
    let textContent = `CHEIKH IA - HISTORIQUE DES DISCUSSIONS\nExporté le : ${new Date().toLocaleString('fr-FR')}\nNombre de discussions : ${conversations.length}\n`;
    textContent += `==========================================================\n\n`;

    conversations.forEach((conv, i) => {
      textContent += `\n----------------------------------------------------------\n`;
      textContent += `DISCUSSION #${i + 1} : ${conv.title || 'Sans titre'}\n`;
      textContent += `Date : ${conv.createdAt ? new Date(conv.createdAt).toLocaleString('fr-FR') : 'Non renseignée'}\n`;
      textContent += `----------------------------------------------------------\n\n`;

      const msgs = conv.messages || [];
      msgs.forEach((msg: any) => {
        const sender = msg.role === 'user' ? 'UTILISATEUR' : 'CHEIKH IA';
        textContent += `[${sender}]:\n${msg.content}\n\n`;
      });
    });

    const dataUri = 'data:text/plain;charset=utf-8,' + encodeURIComponent(textContent);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `cheikh-ia-historique-${new Date().toISOString().slice(0, 10)}.txt`);
    linkElement.click();
  };

  // Delete all conversations with integrated confirm modal
  const handleExecuteDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const ids = conversations.map(c => c.id);
      
      // Optimistic update
      setConversations([]);
      localStorage.removeItem('local_conversations');
      if (onClearActiveChat) onClearActiveChat();

      if (user && ids.length > 0) {
        await deleteConversationsInFirestore(user.uid, ids);
      }

      setShowConfirmDeleteAll(false);
      setDeleteSuccessMessage("Toutes vos discussions ont été supprimées avec succès.");
      setTimeout(() => setDeleteSuccessMessage(null), 4000);
    } catch (e) {
      console.error("Erreur suppression totale:", e);
      setDeleteSuccessMessage("La suppression locale a réussi, synchronisation Cloud en cours.");
      setTimeout(() => setDeleteSuccessMessage(null), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate total message count
  const totalMessagesCount = conversations.reduce((acc, conv) => acc + (conv.messages ? conv.messages.length : 0), 0);

  const renderContent = (tabId: TabId) => {
    switch (tabId) {
      case 'appearance':
        return (
          <div className="space-y-6">
            {/* Theme */}
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Thème d'affichage</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">Choisissez l'apparence visuelle qui correspond à votre environnement.</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'light', label: 'Clair', icon: Sun },
                  { id: 'dark', label: 'Sombre', icon: Moon },
                  { id: 'system', label: 'Système', icon: Monitor },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = settings.theme === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => updateSettings({ theme: item.id as any })}
                      className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                        isSelected
                          ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Font Size */}
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Taille du texte</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">Ajustez la lisibilité de la conversation pour un confort de lecture optimal.</p>
              <div className="flex bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl">
                {[
                  { id: 'small', label: 'Compact (14px)' },
                  { id: 'normal', label: 'Standard (16px)' },
                  { id: 'large', label: 'Grand (18px)' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => updateSettings({ fontSize: opt.id as any })}
                    className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                      settings.fontSize === opt.id
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm font-semibold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {/* Preview */}
              <div className="mt-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800">
                <p className="text-xs text-zinc-400 mb-1">Aperçu du texte :</p>
                <p className={
                  settings.fontSize === 'small' ? 'text-xs text-zinc-700 dark:text-zinc-300' :
                  settings.fontSize === 'large' ? 'text-base text-zinc-700 dark:text-zinc-300' :
                  'text-sm text-zinc-700 dark:text-zinc-300'
                }>
                  « Ô vous qui avez cru ! Cherchez secours dans l'endurance et la prière. » (Coran 2:153)
                </p>
              </div>
            </div>

            {/* Spacing */}
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Densité d'affichage</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">Contrôlez l'espacement entre les bulles de messages.</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => updateSettings({ messageSpacing: 'comfortable' })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    settings.messageSpacing === 'comfortable'
                      ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-0.5">Confortable</span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">Espacement aéré facilitant la lecture posée.</span>
                </button>
                <button
                  onClick={() => updateSettings({ messageSpacing: 'compact' })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    settings.messageSpacing === 'compact'
                      ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-0.5">Compact</span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">Plus de messages visibles sur le même écran.</span>
                </button>
              </div>
            </div>

            {/* Timestamps */}
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <label className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <div>
                  <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">Horodatage des messages</span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">Afficher l'heure exacte d'envoi en bas de chaque bulle.</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showTimestamps}
                  onChange={(e) => updateSettings({ showTimestamps: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
              </label>
            </div>
          </div>
        );

      case 'reading':
        return (
          <div className="space-y-6">
            {/* School of Thought Orientation */}
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Orientation jurisprudentielle (Madhhab)</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">Indiquez si vous souhaitez que l'IA présente en priorité l'avis d'une école spécifique.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'all', title: "Vue d'ensemble (4 Écoles)", desc: "Présente la synthèse des avis sans préférence particulière." },
                  { id: 'maliki', title: "Priorité École Malikite", desc: "Met en avant l'avis de l'école de l'Imam Malik ibn Anas." },
                  { id: 'hanafi', title: "Priorité École Hanafite", desc: "Met en avant l'avis de l'école de l'Imam Abou Hanifah." },
                  { id: 'shafii', title: "Priorité École Chafiite", desc: "Met en avant l'avis de l'école de l'Imam Al-Chafi'i." },
                  { id: 'hanbali', title: "Priorité École Hanbalite", desc: "Met en avant l'avis de l'école de l'Imam Ahmad ibn Hanbal." },
                ].map((item) => {
                  const isSelected = settings.schoolPreference === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => updateSettings({ schoolPreference: item.id as any })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 font-medium'
                          : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      <span className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-0.5">{item.title}</span>
                      <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 'data':
        return (
          <div className="space-y-6">
            {deleteSuccessMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{deleteSuccessMessage}</span>
              </div>
            )}

            {/* Metrics */}
            <div>
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 block mb-0.5">Discussions actives</span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">Nombre de conversations enregistrées</span>
                </div>
                <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{conversations.length}</span>
              </div>
            </div>

            {/* Export Section */}
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Exportation et sauvegarde</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">Téléchargez une copie intégrale de vos discussions sur votre appareil.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button 
                  onClick={handleExportJSON}
                  disabled={conversations.length === 0}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 font-medium text-xs sm:text-sm rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" /> Exporter en JSON (.json)
                </button>

                <button 
                  onClick={handleExportTXT}
                  disabled={conversations.length === 0}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 font-medium text-xs sm:text-sm rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FileText className="w-4 h-4" /> Exporter en Texte (.txt)
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">Zone de danger</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                Suppression définitive de l'historique complet (local et base de données Firestore).
              </p>

              {!showConfirmDeleteAll ? (
                <button 
                  onClick={() => setShowConfirmDeleteAll(true)}
                  disabled={conversations.length === 0 || isDeleting}
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 font-medium text-sm rounded-xl hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" /> Effacer toutes les discussions ({conversations.length})
                </button>
              ) : (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 space-y-3">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-semibold text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>Confirmer la suppression irréversible ?</span>
                  </div>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Cette opération va supprimer définitivement vos {conversations.length} discussion(s) et les {totalMessagesCount} messages associés dans la base de données.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setShowConfirmDeleteAll(false)}
                      disabled={isDeleting}
                      className="flex-1 py-2 px-3 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleExecuteDeleteAll}
                      disabled={isDeleting}
                      className="flex-1 py-2 px-3 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {isDeleting ? "Suppression en cours..." : "Oui, tout supprimer"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Statut du compte</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">Informations sur votre session actuelle.</p>
              
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Identifiant</span>
                  <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[200px]">
                    {user?.email || 'Visiteur'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Statut</span>
                  <span className="text-xs font-medium inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    {user ? 'Connecté' : 'Mode invité'}
                  </span>
                </div>
              </div>

              {user && (
                <div className="mt-4">
                  <button 
                    onClick={() => { signOut(); onClose(); }}
                    className="flex items-center justify-center gap-2 w-full py-2.5 px-4 border border-zinc-200 dark:border-zinc-800 text-red-600 dark:text-red-400 font-medium text-sm rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Se déconnecter de la session
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      case 'about':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center shrink-0 shadow-xs">
                <span className="text-white dark:text-zinc-900 font-bold text-xl">C</span>
              </div>
              <div>
                <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Cheikh IA</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Version 1.0.0 (Bêta)</p>
              </div>
            </div>
            
            <div className="space-y-5">
              <div>
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">Notre Mission</h4>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Cheikh IA est un assistant virtuel éducatif propulsé par l'intelligence artificielle. Son but est d'accompagner les fidèles et étudiants dans leur apprentissage et leurs recherches autour de la jurisprudence islamique, du Coran et de la Sunnah de manière accessible, structurée et bienveillante.
                </p>
              </div>

              <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-orange-100 dark:border-orange-900/50">
                <h4 className="text-sm font-semibold text-orange-800 dark:text-orange-300 mb-1.5">Avertissement Important</h4>
                <p className="text-xs sm:text-sm text-orange-700 dark:text-orange-400 leading-relaxed">
                  Cheikh IA est un outil d'accompagnement et d'apprentissage. Ses réponses sont fournies à titre indicatif et éducatif : l'intelligence artificielle ne remplace en aucun cas la consultation, l'avis et la guidance des savants et imams qualifiés.
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">Confidentialité & Données</h4>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Le respect de votre vie privée est fondamental. Vos échanges ne sont jamais partagés avec des tiers non autorisés. Vous gardez à tout instant la souveraineté sur votre compte avec la possibilité d'exporter l'intégralité de vos discussions ou de les supprimer définitivement.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 dark:bg-black/60 backdrop-blur-xs sm:p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 w-full h-full sm:h-auto sm:max-w-4xl sm:rounded-2xl shadow-2xl border-0 sm:border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col sm:flex-row" onClick={e => e.stopPropagation()} style={{ maxHeight: '88vh' }}>
        
        {/* Mobile View */}
        {isMobile && (
          <div className="flex-1 flex flex-col h-full bg-zinc-50/50 dark:bg-zinc-950/50">
            {!activeTab ? (
              // Mobile Tab List
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">Paramètres</h3>
                  <button onClick={onClose} className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full bg-zinc-100 dark:bg-zinc-800 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  <div className="space-y-1.5 mt-1">
                    {tabs.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors shadow-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg">
                            <tab.icon className="w-5 h-5" />
                          </div>
                          <span className="font-medium text-zinc-900 dark:text-zinc-100 text-[15px]">{tab.label}</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-zinc-400" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // Mobile Content View
              <div className="flex flex-col h-full bg-white dark:bg-zinc-900">
                <div className="flex items-center p-4 border-b border-zinc-200 dark:border-zinc-800">
                  <button 
                    onClick={() => setActiveTab(null)}
                    className="p-2 -ml-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100 ml-2">
                    {tabs.find(t => t.id === activeTab)?.label}
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                  {renderContent(activeTab)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Desktop View */}
        {!isMobile && (
          <>
            {/* Sidebar */}
            <div className="w-64 bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col shrink-0">
              <div className="p-6 pb-4">
                <h3 className="font-semibold text-xl text-zinc-900 dark:text-zinc-100">Paramètres</h3>
              </div>
              <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-colors text-left font-medium ${
                      activeTab === tab.id
                        ? 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    <tab.icon className="w-4 h-4 shrink-0" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-950">
              <div className="flex items-center justify-between p-6 pb-2">
                <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">
                  {tabs.find(t => t.id === activeTab)?.label}
                </h3>
                <button onClick={onClose} className="text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 pt-4">
                <div className="max-w-xl">
                  {activeTab && renderContent(activeTab)}
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
