import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// =====================================================================
// 🎛️ PAINEL DE CONTROLE MESTRE DA INTELIGÊNCIA ARTIFICIAL
// =====================================================================
const PROVEDOR_ATIVO: 'gemini' | 'groq' | 'together' | 'nvidia' = 'gemini';
const CUSTO_POR_ACAO = 10; 

// =====================================================================
// 🔄 GRUPOS DE MODELOS SEPARADOS (GRÁTIS VS PAGO / TEXTO VS IMAGEM)
// =====================================================================

// 1. Grupo Gemini Grátis (Rodízio próprio)
const REQUISICOES_POR_MODELO_GRATIS = 2; 
const MODELOS_GEMINI_GRATIS = [
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3-flash-preview",
    "gemini-2.5-flash"
];

// 2. Modelos de Texto Super Econômicos para a sua API Paga (2 Modelos)
const MODELOS_TEXTO_PAGO = [
  "gemini-2.5-flash",
  "gemini-3.5-flash"
];

// 3. Modelos de Imagem Econômicos (Usados na API Paga)
const MODELOS_IMAGEM_GEMINI = [
  "gemini-3.1-flash-image",
  "gemini-3.1-flash-lite-image"
];

// Contadores de rodízio independentes
let contadorGratis = 0;
let indiceGratis = 0;

let contadorPago = 0;
let indicePago = 0;

let contadorImagemPago = 0;
let indiceImagemPago = 0;

export async function POST(req: Request) {
  try {
    // 1. Validação de Sessão (Supabase)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        return NextResponse.json({ success: false, error: "Acesso Negado. Token ausente." }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
        return NextResponse.json({ success: false, error: "Sessão inválida ou expirada." }, { status: 401 });
    }

    const body = await req.json();
    const { systemInstruction, promptParts, isImageGeneration } = body;

    if (!promptParts || !promptParts[0] || !promptParts[0].text) {
      return NextResponse.json({ success: false, error: "Nenhum texto de prompt fornecido." }, { status: 400 });
    }

    const textoUsuario = promptParts[0].text;

    // =====================================================================
    // 🧠 LÓGICA MULTI-TENANT: VERIFICAÇÃO DA API PAGA (MESTRA) VS GRÁTIS
    // =====================================================================
    let apiAktivadaPaga = false;
    let geminiApiKeyToUse = null;

    // Verifica Configuração Mestra no Banco
    const { data: adminConfig } = await supabase
      .from('admin_config')
      .select('*')
      .eq('id', 1)
      .single();

    if (adminConfig && adminConfig.master_gemini_ativa) {
        // A API Paga Mestra está ativada! Puxa direto da Variável de Ambiente protegida da Vercel
        apiAktivadaPaga = true;
        geminiApiKeyToUse = process.env.MASTER_GEMINI_KEY || null;
    } else {
        // Caso contrário, busca a chave individual do cliente logado
        const { data: clientKey } = await supabase
          .from('client_keys')
          .select('gemini_key, status_ativa')
          .eq('user_id', user.id)
          .single();

        if (clientKey && clientKey.status_ativa && clientKey.gemini_key) {
            geminiApiKeyToUse = clientKey.gemini_key;
        } else {
            geminiApiKeyToUse = process.env.GEMINI_API_KEY || null;
        }
    }

    if (!geminiApiKeyToUse) {
      return NextResponse.json({ 
          success: false, 
          error: "Nenhuma chave da API do Gemini ativa. Configure sua chave no painel ou ative a Mestra." 
      }, { status: 403 });
    }

    // =====================================================================
    // 🖼️ GERAÇÃO DE IMAGENS (Usa MODELOS_IMAGEM_GEMINI se a API paga estiver ativa, ou fallback)
    // =====================================================================
    if (isImageGeneration) {
      let tentativaImg = 0;
      let sucessoImg = false;
      let base64Imagem = '';
      let ultimoErroImg = '';

      // Define a lista de modelos de imagem com base no modo pago/grátis
      const listaModelosImg = apiAktivadaPaga ? MODELOS_IMAGEM_GEMINI : ["imagen-3.0-generate-001"];

      while (tentativaImg < listaModelosImg.length && !sucessoImg) {
          contadorImagemPago++;
          if (contadorImagemPago > 2) {
              contadorImagemPago = 1;
              indiceImagemPago++;
              if (indiceImagemPago >= listaModelosImg.length) indiceImagemPago = 0;
          }

          const modeloImgEscolhido = listaModelosImg[indiceImagemPago];
          
          let endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modeloImgEscolhido}:generateContent?key=${geminiApiKeyToUse}`;
          let payloadBody: any = {
              contents: [{ parts: [{ text: textoUsuario }] }]
          };

          if (modeloImgEscolhido.includes('imagen')) {
              endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modeloImgEscolhido}:predict?key=${geminiApiKeyToUse}`;
              payloadBody = {
                  instances: [{ prompt: textoUsuario }],
                  parameters: { sampleCount: 1, aspectRatio: "16:9" }
              };
          }

          const responseImg = await fetch(endpointUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payloadBody)
          });

          const dataImg = await responseImg.json();

          if (responseImg.ok) {
              if (modeloImgEscolhido.includes('imagen')) {
                  base64Imagem = dataImg.predictions?.[0]?.bytesBase64Encoded;
              } else {
                  base64Imagem = dataImg.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
              }

              if (base64Imagem) {
                  sucessoImg = true;
              } else {
                  ultimoErroImg = "A API não retornou os bytes da imagem.";
                  tentativaImg++;
              }
          } else {
              ultimoErroImg = dataImg.error?.message || "Erro na geração de imagem.";
              contadorImagemPago = 2;
              tentativaImg++;
          }
      }

      if (!sucessoImg) {
          return NextResponse.json({ success: false, error: `Falha na imagem: ${ultimoErroImg}` }, { status: 500 });
      }

      return NextResponse.json({ success: true, image: base64Imagem });
    }

    // =====================================================================
    // 💎 GERADOR DE TEXTO E SITES (SEPARAÇÃO GRÁTIS VS MODELOS PAGO)
    // =====================================================================
    if (PROVEDOR_ATIVO === 'gemini') {
      let tentativa = 0;
      let sucesso = false;
      let htmlGerado = '';
      let ultimoErro = '';

      // ESCOLHA DO GRUPO: Se a API Paga Mestra estiver ativa, usa MODELOS_TEXTO_PAGO. Senão, usa MODELOS_GEMINI_GRATIS.
      const modelosAtivos = apiAktivadaPaga ? MODELOS_TEXTO_PAGO : MODELOS_GEMINI_GRATIS;
      const limitePorModelo = apiAktivadaPaga ? 5 : REQUISICOES_POR_MODELO_GRATIS;

      while (tentativa < modelosAtivos.length && !sucesso) {
          if (apiAktivadaPaga) {
              contadorPago++;
              if (contadorPago > limitePorModelo) {
                  contadorPago = 1;
                  indicePago++;
                  if (indicePago >= modelosAtivos.length) indicePago = 0;
              }
          } else {
              contadorGratis++;
              if (contadorGratis > limitePorModelo) {
                  contadorGratis = 1;
                  indiceGratis++;
                  if (indiceGratis >= modelosAtivos.length) indiceGratis = 0;
              }
          }

          const indiceAtual = apiAktivadaPaga ? indicePago : indiceGratis;
          const modeloEscolhido = modelosAtivos[indiceAtual];
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modeloEscolhido}:generateContent?key=${geminiApiKeyToUse}`;

          const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: {
                parts: [{ text: systemInstruction || '' }]
              },
              contents: [
                { parts: [{ text: textoUsuario }] }
              ],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192, 
              }
            }),
          });

          const geminiData = await geminiResponse.json();

          if (geminiResponse.ok) {
              htmlGerado = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
              sucesso = true;
          } else {
              ultimoErro = geminiData.error?.message || 'Erro desconhecido';
              if (apiAktivadaPaga) {
                  contadorPago = limitePorModelo;
              } else {
                  contadorGratis = limitePorModelo;
              }
              tentativa++;
          }
      }

      if (!sucesso) {
          throw new Error(`Todos os modelos falharam. Último erro: ${ultimoErro}`);
      }

      return NextResponse.json({ success: true, html: htmlGerado, custo: CUSTO_POR_ACAO });
    }

    return NextResponse.json({ success: false, error: "Nenhum provedor configurado." }, { status: 400 });

  } catch (error: any) {
    console.error("Erro na API de Geração:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
