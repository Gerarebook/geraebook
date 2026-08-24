'use client';

import { supabase } from '@/lib/supabase';
import React, { useEffect, useState } from 'react';

export default function AdminPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);

  // Configurações Mestras
  const [masterGeminiAtiva, setMasterGeminiAtiva] = useState(false);
  const [masterGeminiKey, setMasterGeminiKey] = useState('');
  const [masterUnsplashKey, setMasterUnsplashKey] = useState('');

  // Clientes (Para adicionar/gerenciar chaves individuais futuramente)
  const [clientes, setClientes] = useState<any[]>([]);
  const [novoClienteId, setNovoClienteId] = useState('');
  const [novoClienteGemini, setNovoClienteGemini] = useState('');
  const [novoClienteUnsplash, setNovoClienteUnsplash] = useState('');

  useEffect(() => {
    carregarDadosAdmin();
  }, []);

  async function carregarDadosAdmin() {
    setLoading(true);
    try {
      // Verifica se está logado
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }
      setAdminUser(session.user);

      // Carrega Configuração Mestra
      const { data: adminConfig } = await supabase
        .from('admin_config')
        .select('*')
        .eq('id', 1)
        .single();

      if (adminConfig) {
        setMasterGeminiAtiva(adminConfig.master_gemini_ativa || false);
        setMasterGeminiKey(adminConfig.master_gemini_key || '');
        setMasterUnsplashKey(adminConfig.master_unsplash_key || '');
      }

      // Carrega Lista de Chaves de Clientes
      const { data: keysList } = await supabase
        .from('client_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (keysList) {
        setClientes(keysList);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  }

  async function salvarConfiguracaoMestra() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('admin_config')
        .upsert({
          id: 1,
          master_gemini_ativa: masterGeminiAtiva,
          master_gemini_key: masterGeminiKey,
          master_unsplash_key: masterUnsplashKey,
          updated_at: new Date()
        });

      if (error) throw error;
      alert("Configurações mestras salvas com sucesso!");
    } catch (error: any) {
      alert("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function adicionarChaveCliente() {
    if (!novoClienteId) {
      alert("Preencha o ID (UUID) do cliente.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('client_keys')
        .upsert({
          user_id: novoClienteId,
          gemini_key: novoClienteGemini,
          unsplash_key: novoClienteUnsplash,
          status_ativa: true,
          updated_at: new Date()
        }, { onConflict: 'user_id' });

      if (error) throw error;
      
      alert("Chave do cliente adicionada/atualizada!");
      setNovoClienteId('');
      setNovoClienteGemini('');
      setNovoClienteUnsplash('');
      carregarDadosAdmin(); // Recarrega a lista
    } catch (error: any) {
      alert("Erro ao salvar cliente: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function alternarStatusCliente(clienteId: string, statusAtual: boolean) {
    try {
      await supabase
        .from('client_keys')
        .update({ status_ativa: !statusAtual })
        .eq('id', clienteId);
      carregarDadosAdmin();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
    }
  }

  async function apagarCliente(clienteId: string) {
    if (confirm("Tem certeza que deseja apagar o acesso deste cliente?")) {
      try {
        await supabase.from('client_keys').delete().eq('id', clienteId);
        carregarDadosAdmin();
      } catch (error) {
        console.error("Erro ao apagar:", error);
      }
    }
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 font-bold">Carregando painel de comando...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-20">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      
      {/* Header do Admin */}
      <header className="bg-slate-900 text-white px-8 py-5 shadow-lg flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
          <i className="fas fa-shield-alt text-indigo-400"></i>
          E-bookPro <span className="text-slate-400 font-light text-xl">| Admin Control</span>
        </h1>
        <div className="text-sm font-medium text-slate-400">
          <i className="fas fa-user-circle mr-2"></i> {adminUser?.email}
        </div>
      </header>

      <div className="max-w-6xl mx-auto mt-10 px-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA ESQUERDA: Chaves Mestras */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-4 flex items-center gap-3">
              <i className="fas fa-key text-indigo-600 text-xl"></i>
              <h2 className="text-lg font-bold text-indigo-900">API Global (Mestra)</h2>
            </div>
            
            <div className="p-6 space-y-5">
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                As chaves abaixo pertencem a você. Se a chave mestra for ativada, <strong>todos os clientes</strong> usarão o seu saldo, ignorando as chaves individuais deles.
              </p>

              {/* Toggle de Ativação Geral */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Status da API Global</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{masterGeminiAtiva ? 'Sistema usando sua cota paga.' : 'Clientes usam chaves próprias.'}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={masterGeminiAtiva} onChange={(e) => setMasterGeminiAtiva(e.target.checked)} />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Google Gemini API Key (Pro)</label>
                <input 
                  type="password" 
                  value={masterGeminiKey} 
                  onChange={(e) => setMasterGeminiKey(e.target.value)} 
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition outline-none text-sm font-mono"
                  placeholder="AIzaSy..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Unsplash Access Key</label>
                <input 
                  type="password" 
                  value={masterUnsplashKey} 
                  onChange={(e) => setMasterUnsplashKey(e.target.value)} 
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition outline-none text-sm font-mono"
                  placeholder="Seu Client-ID do Unsplash..."
                />
              </div>

              <button 
                onClick={salvarConfiguracaoMestra}
                disabled={saving}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-lg shadow-md transition flex items-center justify-center gap-2"
              >
                {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                Salvar Configuração Mestra
              </button>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: Gestão de Clientes */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-3">
              <i className="fas fa-users text-slate-600 text-xl"></i>
              <h2 className="text-lg font-bold text-slate-800">Licenças de Clientes (Multi-Tenant)</h2>
            </div>

            <div className="p-6">
              {/* Formulário Add Cliente Rápido */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-8">
                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2"><i className="fas fa-plus-circle text-emerald-500"></i> Cadastrar Chaves para um Cliente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <input type="text" value={novoClienteId} onChange={(e) => setNovoClienteId(e.target.value)} placeholder="User ID do Cliente (UUID do Supabase)" className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-mono outline-none focus:border-indigo-500" />
                  </div>
                  <input type="text" value={novoClienteGemini} onChange={(e) => setNovoClienteGemini(e.target.value)} placeholder="Chave Gemini (Grátis)" className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-mono outline-none focus:border-indigo-500" />
                  <input type="text" value={novoClienteUnsplash} onChange={(e) => setNovoClienteUnsplash(e.target.value)} placeholder="Chave Unsplash (Grátis)" className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-mono outline-none focus:border-indigo-500" />
                </div>
                <button onClick={adicionarChaveCliente} disabled={saving} className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-6 py-2.5 rounded-lg text-sm transition">
                  Registrar Cliente
                </button>
              </div>

              {/* Tabela de Clientes */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4 font-bold">User ID (Cliente)</th>
                      <th className="py-3 px-4 font-bold text-center">Status</th>
                      <th className="py-3 px-4 font-bold">Gemini Key</th>
                      <th className="py-3 px-4 font-bold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-8 text-slate-400 italic">Nenhum cliente com chaves próprias configuradas ainda.</td></tr>
                    ) : (
                      clientes.map((cliente) => (
                        <tr key={cliente.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                          <td className="py-3 px-4 font-mono text-xs text-slate-600 truncate max-w-[150px]">{cliente.user_id}</td>
                          <td className="py-3 px-4 text-center">
                            <button 
                              onClick={() => alternarStatusCliente(cliente.id, cliente.status_ativa)}
                              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${cliente.status_ativa ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}
                            >
                              {cliente.status_ativa ? 'Ativo' : 'Bloqueado'}
                            </button>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-400">
                            {cliente.gemini_key ? `...${cliente.gemini_key.slice(-6)}` : 'Sem chave'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button onClick={() => apagarCliente(cliente.id)} className="text-red-400 hover:text-red-600 transition p-2">
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}