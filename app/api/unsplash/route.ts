import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    // 1. Pega a palavra-chave direto da URL (ex: /api/unsplash?query=nutrition)
    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get('query');

    if (!keyword) {
      return NextResponse.json({ success: false, error: "Palavra-chave não fornecida." }, { status: 400 });
    }

    // 2. Pega a sua chave do Unsplash configurada na Vercel (ou no arquivo .env local)
    const unsplashKeyToUse = process.env.UNSPLASH_ACCESS_KEY;

    if (!unsplashKeyToUse) {
       return NextResponse.json({ 
           success: false, 
           error: "Chave do Unsplash não configurada. Defina a variável UNSPLASH_ACCESS_KEY." 
       }, { status: 403 });
    }

    // 3. Busca a imagem em alta qualidade no modo paisagem
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
      const errorMsg = unsplashData.errors?.[0] || "Erro ao buscar imagem no Unsplash.";
      return NextResponse.json({ success: false, error: errorMsg }, { status: unsplashResponse.status });
    }

    const imageUrl = unsplashData.urls?.regular;

    if (!imageUrl) {
      return NextResponse.json({ success: false, error: "Nenhuma imagem encontrada." }, { status: 500 });
    }

    // 4. Retorna exatamente o que o nosso iframeScript está esperando!
    return NextResponse.json({ success: true, url: imageUrl });

  } catch (error: any) {
    console.error("Erro na API do Unsplash:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
