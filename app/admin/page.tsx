'use client';

import { supabase } from '@/lib/supabase';
import React, { useEffect, useState } from 'react';

export default function AdminPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);

  // Controles Globais de IA & BYOK
  const [permitirByok, setPermitirByok] = useState(true);
  const [suaChaveCentralPaga, setSuaChaveCentralPaga] = useState(true);
  const [chaveGlobalAdmin, setChaveGlobalAdmin] = useState(false);

  // Lista de Clientes e Financeiro
  const [clientes, setClientes] = useState<any[]>([]);

  useEffect(() => {
    carregarDadosAdmin();
  }, []);

  async function carregarDadosAdmin() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }
      setAdminUser(session.user);

      // Carrega Configuração Mestra do Banco (Apenas o status de ativação)
      const { data: adminConfig } = await supabase
        .from('admin_config')
        .select('*')
        .eq('id', 1)
        .single();

      if (adminConfig) {
        setChaveGlobalAdmin(adminConfig.master_gemini_ativa || false);
      }

      // Carrega Chaves e dados dos Clientes
      const { data: keysList } = await supabase
        .from('client_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (keysList) {
        setClientes(keysList);
      }
    } catch (error) {
      console.error("Erro ao carregar painel:", error);
    } finally {
      setLoading(false);
    }
  }

  async function salvarControlesGlobais() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('admin_config')
        .upsert({
          id: 1,
          master_gemini_ativa: chaveGlobalAdmin,
          updated_at: new Date()
        });

      if (error) throw error;
      alert("Controles globais salvos com sucesso!");
    } catch (error: any) {
      alert("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function atualizarClienteCampo(id: string, campo: string, valor: any) {
    try {
      const { error } = await supabase
        .from('client_keys')
        .update({ [campo]: valor, updated_at: new Date() })
        .eq('id', id);

      if (error) throw error;
      carregarDadosAdmin();
    } catch (err: any) {
      alert("Erro ao atualizar: " + err.message);
    }
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 font-bold">Carregando painel administrativo...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-20">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      
      {/* HEADER DO ADMIN */}
      <header className="bg-slate-900 text-white px-8 py-5 shadow-lg flex items-center justify-between">
        <h1 className="text-xl font-black tracking-tight flex items-center gap-3">
          <i className="fas fa-shield-alt text-indigo-400"></i>
          E-bookPro <span className="text-slate-400 font-light text-sm">| Painel Administrativo</span>
        </h1>
        <div className="text-xs font-medium text-slate-400">
          <i className="fas fa-user-circle mr-2"></i> {adminUser?.email}
        </div>
      </header>

      <main className="max-w-7xl mx-auto mt-8 px-6 space-y-8">
        
        {/* CAIXA 1: CONTROLES GLOBAIS DE IA & BYOK */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-5 flex items-center gap-2">
            <i className="fas fa-key text-amber-500"></i> Controles Globais de IA & BYOK
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Card 1 */}
            <div className={`p-4 rounded-xl border transition flex items-start justify-between ${permitirByok ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200 bg-slate-50'}`}>
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase">Permitir Chave Própria (BYOK)</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Se ativado, TODOS os clientes poderão inserir a própria chave.</p>
              </div>
              <input type="checkbox" checked={permitirByok} onChange={(e) => setPermitirByok(e.target.checked)} className="mt-1 w-4 h-4 text-indigo-600 rounded cursor-pointer" />
            </div>

            {/* Card 2 */}
            <div className={`p-4 rounded-xl border transition flex items-start justify-between ${suaChaveCentralPaga ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-slate-50'}`}>
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase">Sua Chave Central (API Paga)</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Controla se a sua API paga centralizada está operacional.</p>
              </div>
              <input type="checkbox" checked={suaChaveCentralPaga} onChange={(e) => setSuaChaveCentralPaga(e.target.checked)} className="mt-1 w-4 h-4 text-emerald-600 rounded cursor-pointer" />
            </div>

            {/* Card 3 */}
            <div className={`p-4 rounded-xl border transition flex items-start justify-between ${chaveGlobalAdmin ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200 bg-slate-50'}`}>
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase">Chave Global do Admin</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Usa a chave mestre de ambiente para requisições gerais.</p>
              </div>
              <input type="checkbox" checked={chaveGlobalAdmin} onChange={(e) => setChaveGlobalAdmin(e.target.checked)} className="mt-1 w-4 h-4 text-indigo-600 rounded cursor-pointer" />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button onClick={salvarControlesGlobais} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md transition flex items-center gap-2">
              <i className="fas fa-check"></i> Salvar Alterações Globais
            </button>
          </div>
        </section>

        {/* CAIXA 2: GESTÃO DE CLIENTES E FINANCEIRO */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <i className="fas fa-users text-indigo-600"></i> Gestão de Clientes e Financeiro ({clientes.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px] bg-slate-50/50">
                  <th className="py-3 px-6 font-bold">Cliente / E-mail</th>
                  <th className="py-3 px-4 font-bold">Gerenciar Créditos</th>
                  <th className="py-3 px-4 font-bold">Assinatura Mensal / Validade</th>
                  <th className="py-3 px-4 font-bold">Chave Própria (Gemini)</th>
                  <th className="py-3 px-4 font-bold">Chave Unsplash</th>
                  <th className="py-3 px-4 font-bold text-right">Permissões Especiais</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 italic">Nenhum cliente registrado no banco de dados ainda.</td>
                  </tr>
                ) : (
                  clientes.map((cliente) => (
                    <tr key={cliente.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                          {cliente.user_id.slice(0, 8)}... <i className="fas fa-check-circle text-emerald-500 text-[10px]" title="Conta Verificada"></i>
                        </div>
                        <div className="text-indigo-600 font-medium text-xs mt-0.5">{cliente.user_id}</div>
                        <button 
                          onClick={() => atualizarClienteCampo(cliente.id, 'status_ativa', !cliente.status_ativa)}
                          className={`mt-2 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${cliente.status_ativa ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`}
                        >
                          {cliente.status_ativa ? 'Bloquear Conta' : 'Desbloquear Conta'}
                        </button>
                      </td>
                      <td className="py-4 px-4">
                        <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold text-xs flex items-center gap-1 w-max">
                          <i className="fas fa-bolt text-[10px]"></i> {cliente.creditos || 100}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-700 font-medium">
                        {cliente.validade_assinatura ? cliente.validade_assinatura : 'Sem plano ativo'}
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-500 text-[11px]">
                        {cliente.gemini_key ? `...${cliente.gemini_key.slice(-6)}` : <span className="text-slate-300 italic">Sem chave</span>}
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-500 text-[11px]">
                        {cliente.unsplash_key ? `...${cliente.unsplash_key.slice(-6)}` : <span className="text-slate-300 italic">Sem chave</span>}
                      </td>
                      <td className="py-4 px-4 text-right space-y-1.5">
                        <div className="flex justify-end">
                          <button className="bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 px-3 py-1 rounded text-[10px] font-bold tracking-tight transition flex items-center gap-1">
                            <i className="fas fa-key"></i> Liberar BYOK
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
}