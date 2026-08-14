import { NextResponse } from 'next/server';

// =====================================================================
// 🎛️ PAINEL DE CONTROLE MESTRE DA INTELIGÊNCIA ARTIFICIAL
// =====================================================================
// Para escolher qual API deseja usar, basta alterar a palavra abaixo para:
// 'gemini'  -> Para usar os modelos do Google (com rodízio configurável)
// 'groq'    -> Para usar o Llama 3.3 via Groq
// 'together'-> Para usar a Together.ai
const PROVEDOR_ATIVO: 'gemini' | 'groq' | 'together' = 'together';

// Configuração caso use o Gemini (Rodízio de Modelos)
const REQUISICOES_POR_MODELO = 9999; // Deixe alto para travar em um único modelo se tiver API paga
const MODELOS_GEMINI = [
  "gemini-3.7-flash",      // Padrão: Rápido e confiável
  // "gemini-1.5-pro"      // Alternativa pesada (descomente se quiser)
];

// Variáveis globais para o rodízio do Gemini
let contadorRequisicoes = 0;
let indiceModeloAtual = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { systemInstruction, promptParts } = body;

    if (!promptParts || !promptParts[0] || !promptParts[0].text) {
      return NextResponse.json({ success: false, error: "Nenhum texto de prompt fornecido." }, { status: 400 });
    }

    const textoUsuario = promptParts[0].text;

    // =====================================================================
    // 🚀 1. SE O PROVEDOR ATIVO FOR O GROQ
    // =====================================================================
    if (PROVEDOR_ATIVO === 'groq') {
      const groqApiKey = process.env.GROQ_API_KEY;
      
      if (!groqApiKey) {
        return NextResponse.json({ success: false, error: "Chave da API do Groq não configurada na Vercel." }, { status: 500 });
      }

      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemInstruction || '' },
            { role: 'user', content: textoUsuario }
          ],
          temperature: 0.7,
          max_tokens: 8000, 
        }),
      });

      const groqData = await groqResponse.json();
      
      if (!groqResponse.ok) {
        throw new Error(groqData.error?.message || "Erro na API do Groq");
      }

      const htmlGerado = groqData.choices?.[0]?.message?.content || '';
      return NextResponse.json({ success: true, html: htmlGerado });
    }

    // =====================================================================
    // 🌐 2. SE O PROVEDOR ATIVO FOR A TOGETHER.AI
    // =====================================================================
    if (PROVEDOR_ATIVO === 'together') {
      const togetherApiKey = process.env.TOGETHER_API_KEY;
      
      if (!togetherApiKey) {
        return NextResponse.json({ success: false, error: "Chave da API da Together não configurada na Vercel." }, { status: 500 });
      }

      const togetherResponse = await fetch('https://api.together.xyz/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${togetherApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'meta-llama/Llama-3-70b-chat-hf', // Modelo padrão robusto na Together.ai
          messages: [
            { role: 'system', content: systemInstruction || '' },
            { role: 'user', content: textoUsuario }
          ],
          temperature: 0.7,
          max_tokens: 8000,
        }),
      });

      const togetherData = await togetherResponse.json();
      
      if (!togetherResponse.ok) {
        throw new Error(togetherData.error?.message || "Erro na API da Together.ai");
      }

      const htmlGerado = togetherData.choices?.[0]?.message?.content || '';
      return NextResponse.json({ success: true, html: htmlGerado });
    }

    // =====================================================================
    // 💎 3. SE O PROVEDOR ATIVO FOR O GEMINI (PADRÃO)
    // =====================================================================
    if (PROVEDOR_ATIVO === 'gemini') {
      const geminiApiKey = process.env.GEMINI_API_KEY;
      
      if (!geminiApiKey) {
        return NextResponse.json({ success: false, error: "Chave da API do Gemini não configurada na Vercel." }, { status: 500 });
      }

      // Lógica de rodízio interno de modelos do Gemini
      contadorRequisicoes++;
      if (contadorRequisicoes > REQUISICOES_POR_MODELO) {
          contadorRequisicoes = 1; 
          indiceModeloAtual++;     
          if (indiceModeloAtual >= MODELOS_GEMINI.length) {
              indiceModeloAtual = 0; 
          }
      }

      const modeloEscolhido = MODELOS_GEMINI[indiceModeloAtual];
      console.log(`[INFO] Processando com o modelo Gemini: ${modeloEscolhido}`);

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modeloEscolhido}:generateContent?key=${geminiApiKey}`;

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

      if (!geminiResponse.ok) {
        throw new Error(geminiData.error?.message || `Erro na API do Gemini (Modelo: ${modeloEscolhido})`);
      }

      const htmlGerado = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return NextResponse.json({ success: true, html: htmlGerado });
    }

    return NextResponse.json({ success: false, error: "Nenhum provedor de IA válido foi configurado no painel." }, { status: 400 });

  } catch (error: any) {
    console.error("Erro na API de Geração:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno no servidor." },
      { status: 500 }
    );
  }
}