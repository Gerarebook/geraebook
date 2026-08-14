import { NextResponse } from 'next/server';

// =====================================================================
// ⚙️ PAINEL DE CONTROLE: RODÍZIO DE MODELOS GEMINI (LOAD BALANCING)
// =====================================================================
// Como funciona: Em ambientes de servidor, o sistema vai contar as requisições 
// e rotacionar a lista abaixo automaticamente para não sobrecarregar um único modelo.

const REQUISICOES_POR_MODELO = 2; // Pula de modelo a cada 2 requisições. Você pode alterar para 3, 4, etc.

const MODELOS_GEMINI = [
  "gemini-3.5-flash",      // Padrão: Rápido e confiável
  "gemini-3.6-flash",   // Alternativa leve: Ótimo para capítulos curtos e estruturação
  "gemini-3.7-flash"         // Alternativa pesada: Mais inteligente e denso
  // Se o Google lançar um novo, basta colocar uma vírgula acima e adicionar aqui: "gemini-2.0-flash",
];

// Variáveis globais para manter a contagem na memória do servidor
let contadorRequisicoes = 0;
let indiceModeloAtual = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { systemInstruction, promptParts, useGroq } = body;

    if (!promptParts || !promptParts[0] || !promptParts[0].text) {
      return NextResponse.json({ success: false, error: "Nenhum texto de prompt fornecido." }, { status: 400 });
    }

    const textoUsuario = promptParts[0].text;

    // === 1. SE O USUÁRIO ESCOLHEU O GROQ ===
    if (useGroq) {
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

    // === 2. SE O USUÁRIO ESCOLHEU O GEMINI (COM RODÍZIO INTELIGENTE) ===
    const geminiApiKey = process.env.GEMINI_API_KEY;
    
    if (!geminiApiKey) {
      return NextResponse.json({ success: false, error: "Chave da API do Gemini não configurada na Vercel." }, { status: 500 });
    }

    // LÓGICA DE ROTAÇÃO DOS MODELOS
    contadorRequisicoes++;
    if (contadorRequisicoes > REQUISICOES_POR_MODELO) {
        contadorRequisicoes = 1; // Reseta o contador
        indiceModeloAtual++;     // Pula para o próximo modelo da lista
        
        // Se chegar no final da lista, volta pro primeiro modelo
        if (indiceModeloAtual >= MODELOS_GEMINI.length) {
            indiceModeloAtual = 0; 
        }
    }

    const modeloEscolhido = MODELOS_GEMINI[indiceModeloAtual];
    console.log(`[INFO] Processando com o modelo: ${modeloEscolhido} (Requisição ${contadorRequisicoes}/${REQUISICOES_POR_MODELO})`);

    // Monta a URL dinâmica com o modelo que foi sorteado na rodada
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

  } catch (error: any) {
    console.error("Erro na API de Geração:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno no servidor." },
      { status: 500 }
    );
  }
}