'use client';

import { supabase } from '@/lib/supabase';
import React, { useState } from 'react';

export default function CadastroPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      setSuccessMessage('Conta criada com sucesso! Verifique seu e-mail (se necessário) ou faça login.');
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);

    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao realizar cadastro.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-slate-800 font-sans">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center mx-auto mb-3 text-white shadow-lg shadow-indigo-200">
            <i className="fas fa-book-open text-lg"></i>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">Criar Conta no E-bookPro</h1>
          <p className="text-xs text-slate-500 mt-1">Preencha os dados abaixo para começar a gerar seus e-books</p>
        </div>

        {errorMessage && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
            <i className="fas fa-exclamation-circle"></i> <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
            <i className="fas fa-check-circle"></i> <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleCadastro} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">E-mail</label>
            <input 
              type="email5" 
              required
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="seu@email.com" 
              className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-sm outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Senha</label>
            <input 
              type="password" 
              required
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Mínimo de 6 caracteres" 
              className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-sm outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition text-sm flex items-center justify-center gap-2"
          >
            {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-user-plus"></i>}
            Cadastrar Conta
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-xs text-slate-500">
            Já tem uma conta? <a href="/login" className="text-indigo-600 font-bold hover:underline">Faça login</a>
          </p>
        </div>
      </div>
    </div>
  );
}