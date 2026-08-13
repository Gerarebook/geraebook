import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { systemInstruction, promptParts, useGroq } = body;

    const textoUsuario = promptParts[0].text;

    // === SE O USUÁRIO ESCOLHEU O GROQ (LLAMA 3) ===
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
          model: 'llama3-70b-8192', // Modelo super rápido da Groq
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: textoUsuario }
          ],
          temperature: 0.7,
        }),
      });

      const groqData = await groqResponse.json();
      
      if (!groqResponse.ok) {
        throw new Error(groqData.error?.message || "Erro na API do Groq");
      }

      const htmlGerado = groqData.choices[0].message.content;
      return NextResponse.json({ success: true, html: htmlGerado });
    }

    // === SE O USUÁRIO ESCOLHEU O GEMINI (Padrão) ===
    const geminiApiKey = process.env.GEMINI_API_KEY;
    
    if (!geminiApiKey) {
      return NextResponse.json({ success: false, error: "Chave da API do Gemini não configurada na Vercel." }, { status: 500 });
    }

    // Usando o modelo Gemini 1.5 Flash (Excelente para HTML longo e rápido)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [
          { parts: [{ text: textoUsuario }] }
        ],
        generationConfig: {
          temperature: 0.7,
        }
      }),
    });

    const geminiData = await geminiResponse.json();

    if (!geminiResponse.ok) {
      throw new Error(geminiData.error?.message || "Erro na API do Gemini");
    }

    const htmlGerado = geminiData.candidates[0].content.parts[0].text;
    return NextResponse.json({ success: true, html: htmlGerado });

  } catch (error: any) {
    console.error("Erro na API de Geração:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno no servidor." },
      { status: 500 }
    );
  }
}