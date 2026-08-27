import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    // 1. Segurança: Verifica se tem Token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Acesso Negado." }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ success: false, error: "Credenciais do Supabase não configuradas no servidor." }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Sessão inválida." }, { status: 401 });
    }

    // 2. Recebe a palavra-chave que a IA escolheu com segurança no parsing
    const body = await req.json().catch(() => ({}));
    const { keyword } = body;

    if (!keyword) {
      return NextResponse.json({ success: false, error: "Palavra-chave não fornecida." }, { status: 400 });
    }

    // =========================================================================
    // 🧠 LÓGICA MULTI-TENANT (CHAVE MESTRA VS CLIENTE VS ENV VAR DA VERCEL)
    // =========================================================================
    let unsplashKeyToUse = null;

    // A) Primeiro, olha se a Chave Mestra do Admin está ligada no banco (usando maybeSingle para evitar crash se a tabela estiver vazia)
    const { data: adminConfig } = await supabase
      .from('admin_config')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (adminConfig && adminConfig.master_unsplash_key) {
        unsplashKeyToUse = adminConfig.master_unsplash_key;
    } else {
        // B) Se a mestra não estiver configurada, procura a chave individual do Cliente
        const { data: clientKey } = await supabase
          .from('client_keys')
          .select('unsplash_key, status_ativa')
          .eq('user_id', user.id)
          .maybeSingle();

        if (clientKey && clientKey.status_ativa && clientKey.unsplash_key) {
            unsplashKeyToUse = clientKey.unsplash_key;
        }
    }

    // C) Fallback seguro: se nenhuma chave do banco estiver ativa, usa a variável de ambiente configurada na Vercel
    if (!unsplashKeyToUse && process.env.UNSPLASH_ACCESS_KEY) {
        unsplashKeyToUse = process.env.UNSPLASH_ACCESS_KEY;
    }

    // Se ninguém tiver chave configurada em lugar nenhum
    if (!unsplashKeyToUse) {
       return NextResponse.json({ 
           success: false, 
           error: "Nenhuma chave do Unsplash configurada. Configure no painel ou defina a variável de ambiente na Vercel." 
       }, { status: 403 });
    }

    // =========================================================================
    // 📸 BUSCA OFICIAL NA API DO UNSPLASH
    // =========================================================================
    const unsplashUrl = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(keyword)}&orientation=landscape&content_filter=high`;

    const unsplashResponse = await fetch(unsplashUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Client-ID ${unsplashKeyToUse}`,
        'Accept-Version': 'v1'
      }
    });

    const unsplashData = await unsplashResponse.json();

    if (!unsplashResponse.ok) {
      const errorMsg = unsplashData.errors?.[0] || unsplashData.error || "Erro ao buscar imagem no Unsplash.";
      return NextResponse.json({ success: false, error: errorMsg }, { status: unsplashResponse.status });
    }

    const imageUrl = unsplashData.urls?.regular;

    if (!imageUrl) {
      return NextResponse.json({ success: false, error: "A resposta da API do Unsplash não retornou a URL da imagem." }, { status: 500 });
    }

    return NextResponse.json({ success: true, imageUrl: imageUrl });

  } catch (error: any) {
    console.error("Erro na API do Unsplash:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
