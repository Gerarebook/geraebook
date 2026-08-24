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
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Sessão inválida." }, { status: 401 });
    }

    // 2. Recebe a palavra-chave que a IA escolheu (Ex: "cake", "business")
    const { keyword } = await req.json();

    if (!keyword) {
      return NextResponse.json({ success: false, error: "Palavra-chave não fornecida." }, { status: 400 });
    }

    // =========================================================================
    // 🧠 LÓGICA MULTI-TENANT (CHAVE MESTRA VS CHAVE DO CLIENTE)
    // =========================================================================
    let unsplashKeyToUse = null;

    // A) Primeiro, olha se a Chave Mestra do Admin está ligada no banco
    const { data: adminConfig } = await supabase
      .from('admin_config')
      .select('*')
      .eq('id', 1)
      .single();

    if (adminConfig && adminConfig.master_gemini_ativa && adminConfig.master_unsplash_key) {
        // Se a mestra estiver ligada, usa a chave do Dono do SaaS!
        unsplashKeyToUse = adminConfig.master_unsplash_key;
    } else {
        // B) Se a mestra estiver desligada, procura a chave individual do Cliente
        const { data: clientKey } = await supabase
          .from('client_keys')
          .select('unsplash_key, status_ativa')
          .eq('user_id', user.id)
          .single();

        if (clientKey && clientKey.status_ativa && clientKey.unsplash_key) {
            unsplashKeyToUse = clientKey.unsplash_key;
        }
    }

    // Se ninguém tiver chave configurada (nem o dono, nem o cliente)
    if (!unsplashKeyToUse) {
       return NextResponse.json({ 
           success: false, 
           error: "Nenhuma chave do Unsplash configurada. Acesse o painel para configurar sua API Key." 
       }, { status: 403 });
    }

    // =========================================================================
    // 📸 BUSCA OFICIAL NA API DO UNSPLASH
    // =========================================================================
    // Garante que só venham fotos horizontais e super realistas
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
      throw new Error(unsplashData.errors?.[0] || "Erro ao buscar imagem no Unsplash.");
    }

    // Pega a URL regular da imagem baixada
    const imageUrl = unsplashData.urls.regular;

    return NextResponse.json({ success: true, imageUrl: imageUrl });

  } catch (error: any) {
    console.error("Erro na API do Unsplash:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno no servidor." },
      { status: 500 }
    );
  }
}