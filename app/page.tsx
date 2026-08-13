'use client';

import { nanoid } from 'nanoid';
import { supabase } from '@/lib/supabase';
import React, { useEffect, useState } from 'react';

// SCRIPT DO IFRAME EDITORIAL
const SCRIPT_PREVIEW = `<script id="editor-magic-script">
    let modoEdicao = false;
    let elSelecionado = null;

    if (!document.getElementById('builder-core-styles')) {
        const style = document.createElement('style');
        style.id = 'builder-core-styles';
        style.innerHTML = \`body.builder-editing * { cursor: text !important; }\`;
        document.head.appendChild(style);
    }

    function rgbToHex(rgb) {
        if(!rgb || rgb === 'rgba(0, 0, 0, 0)' || rgb === 'transparent') return '';
        let res = rgb.match(/\\d+/g);
        if(!res || res.length < 3) return '';
        return "#" + res.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
    }

    function sendCleanHtml() {
        let outlineAntigo = '';
        if(elSelecionado) { outlineAntigo = elSelecionado.style.outline; elSelecionado.style.outline = ''; }
        let htmlStr = '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;
        if(elSelecionado) { elSelecionado.style.outline = outlineAntigo; }
        window.parent.postMessage({ type: 'HTML_SYNC', html: htmlStr }, '*');
    }

    function selectElement(targetEl) {
        if (targetEl.tagName === 'BODY' || targetEl.tagName === 'HTML' || targetEl.id === 'ebook-container') return;

        if(elSelecionado) { elSelecionado.style.outline = ''; elSelecionado.style.outlineOffset = ''; }
        elSelecionado = targetEl;
        elSelecionado.style.outline = '2px dashed #4f46e5'; 
        elSelecionado.style.outlineOffset = '2px';

        if(!elSelecionado.id) elSelecionado.id = 'node_' + Math.random().toString(36).substr(2,9);

        let compStyle = window.getComputedStyle(elSelecionado);
        
        let tAlign = '';
        if(elSelecionado.classList.contains('text-center')) tAlign = 'text-center';
        else if(elSelecionado.classList.contains('text-right')) tAlign = 'text-right';
        else if(elSelecionado.classList.contains('text-justify')) tAlign = 'text-justify';
        else if(elSelecionado.classList.contains('text-left')) tAlign = 'text-left';

        window.parent.postMessage({
            type: 'ELEMENT_SELECTED',
            id: elSelecionado.id,
            tagName: elSelecionado.tagName.toLowerCase(),
            text: elSelecionado.innerText || '',
            src: elSelecionado.src || '',
            className: elSelecionado.className,
            textColor: rgbToHex(compStyle.color),
            fontSize: parseInt(compStyle.fontSize) || 16,
            textAlign: tAlign,
            outerHTML: elSelecionado.outerHTML
        }, '*');
    }

    window.addEventListener('message', (event) => {
        if(event.data.type === 'TOGGLE_EDIT_MODE') {
            modoEdicao = event.data.value;
            if(modoEdicao) {
                document.body.classList.add('builder-editing');
            } else {
                document.body.classList.remove('builder-editing');
                if(elSelecionado) { elSelecionado.style.outline = ''; elSelecionado.style.outlineOffset = ''; elSelecionado = null; }
                document.querySelectorAll('[data-old-outline]').forEach(el => {
                    el.style.outline = el.dataset.oldOutline || '';
                    el.style.outlineOffset = '';
                    delete el.dataset.oldOutline;
                });
                document.querySelectorAll('*').forEach(el => {
                    if (el.style.cursor === 'text') el.style.cursor = '';
                });
            }
        }

        if (event.data.type === 'DELETE_ELEMENT') {
            let el = document.getElementById(event.data.id);
            if(el) { el.remove(); elSelecionado = null; sendCleanHtml(); }
        }

        if (event.data.type === 'UPDATE_FONT') {
            let fontName = event.data.font;
            let linkId = 'custom-google-font';
            let fontLink = document.getElementById(linkId);
            if (!fontLink) {
                fontLink = document.createElement('link');
                fontLink.id = linkId; fontLink.rel = 'stylesheet'; document.head.appendChild(fontLink);
            }
            if (fontName !== 'sans-serif') {
                fontLink.href = \`https://fonts.googleapis.com/css2?family=\${fontName.replace(/ /g, '+')}:ital,wght@0,400;0,700;1,400&display=swap\`;
                document.body.style.fontFamily = \`'\${fontName}', serif\`;
            } else {
                fontLink.href = ''; document.body.style.fontFamily = '';
            }
            sendCleanHtml();
        }

        if(event.data.type === 'UPDATE_ELEMENT') {
            let el = document.getElementById(event.data.id);
            if(el) {
                let p = ''; let escP = '';
                if(event.data.text !== undefined && event.data.forceTextUpdate) el.innerText = event.data.text;
                if(event.data.src !== undefined) el.src = event.data.src;
                if(event.data.textColor !== undefined) el.style.color = event.data.textColor;
                
                if(event.data.fontSize !== undefined) {
                    el.style.fontSize = ''; 
                    el.className = el.className.replace(new RegExp('\\\\b' + escP + 'text-\\\\[\\\\d+px\\\\]\\\\b', 'g'), '').trim();
                    el.className = el.className.replace(/\\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)\\b/g, '').trim();
                    if(event.data.fontSize) el.classList.add(p + 'text-[' + event.data.fontSize + 'px]');
                }

                if(event.data.textAlign !== undefined) {
                    el.className = el.className.replace(new RegExp('\\\\b' + escP + '(text-left|text-center|text-right|text-justify)\\\\b', 'g'), '').trim();
                    if(event.data.textAlign) el.classList.add(p + event.data.textAlign);
                }
                sendCleanHtml();
            }
        }
        if(event.data.type === 'REPLACE_ELEMENT_HTML') {
            let el = document.getElementById(event.data.id);
            if(el) { el.outerHTML = event.data.newHtml; sendCleanHtml(); }
        }
    });

    document.addEventListener('mouseover', (e) => {
        if(!modoEdicao || e.target === document.body || e.target === document.documentElement || e.target.id === 'ebook-container') return;
        e.target.dataset.oldOutline = e.target.style.outline;
        e.target.style.outline = '1px solid #cbd5e1'; 
        e.target.style.outlineOffset = '2px';
    });
    
    document.addEventListener('mouseout', (e) => {
        if(!modoEdicao || e.target === document.body || e.target === document.documentElement) return;
        if(e.target !== elSelecionado) { 
            e.target.style.outline = e.target.dataset.oldOutline || ''; 
            e.target.style.outlineOffset = '';
        }
    });

    document.addEventListener('click', (e) => {
        if (modoEdicao) {
            e.preventDefault(); 
            e.stopPropagation();
            selectElement(e.target);
        }
    }, true); 
</script>`;

export default function Home() {
  const [historicoCodigo, setHistoricoCodigo] = useState<string[]>([]);
  
  const [textEngine, setTextEngine] = useState<'gemini' | 'groq'>('gemini');
  const [modoInspetor, setModoInspetor] = useState(false);
  const [elementoSelecionado, setElementoSelecionado] = useState<any>(null);
  const [statusApis, setStatusApis] = useState<{ texto: string; processing: boolean }>({ texto: 'Aguardando Operação', processing: false });

  // CONFIGURAÇÕES DO E-BOOK
  const [formatoLivro, setFormatoLivro] = useState<'A4' | '15x21' | '14x21'>('A4');
  const [fontFamily, setFontFamily] = useState('Lato');
  const [tamanhoFonteBase, setTamanhoFonteBase] = useState('14pt');
  
  // DADOS DO PROJETO PARA O PROMPT
  const [livroTitulo, setLivroTitulo] = useState('');
  const [livroAutores, setLivroAutores] = useState('');
  const [productContent, setProductContent] = useState('');

  const purificarHTML = (rawHtml: string) => {
      let clean = rawHtml.replace(/<script id="editor-magic-script">[\s\S]*?<\/script>/gi, '');
      clean = clean.replace(/<style id="builder-core-styles">[\s\S]*?<\/style>/gi, '');
      clean = clean.replace(/\bbuilder-editing\b/gi, '');
      clean = clean.replace(/cursor:\s*text;?/gi, '')
                   .replace(/outline:\s*2px dashed rgb\(79, 70, 229\);?/gi, '')
                   .replace(/outline:\s*1px solid rgb\(203, 213, 225\);?/gi, '')
                   .replace(/outline-offset:\s*2px;?/gi, '')
                   .replace(/data-old-outline="[^"]*"/gi, '')
                   .replace(/\s*style="\s*"/gi, ''); 
      clean = clean.replace(/ class="\s*"/gi, ''); 
      return clean;
  };

  const getEstilosFormato = (formato: string) => {
      if(formato === '15x21') return { 
          width: '150mm', height: '210mm', padding: '15mm 15mm 15mm 20mm', 
          pageCss: '@page { size: 150mm 210mm portrait; margin: 0; } \n@media print { @page :left { margin: 15mm 15mm 15mm 20mm !important; } @page :right { margin: 15mm 20mm 15mm 15mm !important; } }' 
      };
      if(formato === '14x21') return { 
          width: '140mm', height: '210mm', padding: '15mm 15mm 15mm 20mm', 
          pageCss: '@page { size: 140mm 210mm portrait; margin: 0; } \n@media print { @page :left { margin: 15mm 15mm 15mm 20mm !important; } @page :right { margin: 15mm 20mm 15mm 15mm !important; } }' 
      };
      return { 
          width: '210mm', height: '297mm', padding: '22mm 20mm 28mm 20mm', 
          pageCss: '@page { size: A4 portrait; margin: 0; }' 
      };
  };

  const moldarApresentacaoHtml = (rawHtml: string) => {
      let clean = purificarHTML(rawHtml);
      const conf = getEstilosFormato(formatoLivro);
      
      const ebookStyles = `<style>
:root {
    --color-bg: #ffffff;
    --color-text: #1e1914;
    --color-primary: #8b6d4f;
    --color-secondary: #c08770;
    --font-heading: 'Playfair Display', serif;
    --font-body: '${fontFamily}', sans-serif;
}

body { background-color: #e2e8f0; margin: 0; padding: 2rem 0; display: flex; flex-direction: column; align-items: center; overflow-x: hidden; font-family: var(--font-body); color: var(--color-text); }

#ebook-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
}

.page-container {
    background-color: var(--color-bg);
    width: ${conf.width};
    height: ${conf.height};
    max-height: ${conf.height};
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    padding: ${conf.padding};
    margin: 0 auto 20px auto;
    box-sizing: border-box;
    position: relative;
    overflow: hidden;
    page-break-after: always;
    page-break-inside: avoid;
    word-wrap: break-word;
    overflow-wrap: break-word;
}

.page-header { position: absolute; top: 10mm; left: 20mm; right: 20mm; display: flex; justify-content: space-between; font-size: 10pt; color: var(--color-primary); border-bottom: 1px solid rgba(139, 109, 79, 0.3); padding-bottom: 5px; font-weight: bold; text-transform: uppercase; z-index: 20; }
.page-footer { position: absolute; bottom: 10mm; left: 20mm; right: 20mm; display: flex; justify-content: space-between; font-size: 10pt; color: var(--color-primary); border-top: 1px solid rgba(139, 109, 79, 0.3); padding-top: 5px; z-index: 20; }

h1, h2, h3, h4 { font-family: var(--font-heading); color: var(--color-primary); }
h1 { font-weight: 800; font-size: 2.5rem; margin-top: 2rem; margin-bottom: 1.5em; line-height: 1.2; text-align: center; }
h2 { font-weight: 700; font-size: 1.8rem; margin-top: 2.5rem; margin-bottom: 1.5em; }

p { font-size: ${tamanhoFonteBase}; line-height: 1.45; margin-bottom: 1.5em; text-align: justify; text-indent: 25px; hyphens: auto; -webkit-hyphens: auto; }

blockquote { page-break-inside: avoid; break-inside: avoid; font-style: italic; color: var(--color-text); border-left: 5px solid var(--color-secondary); background: rgba(192, 135, 112, 0.15); padding: 18px 25px; margin: 2rem 0; font-size: 12.5pt; font-family: var(--font-heading); border-radius: 0 10px 10px 0; }
img { max-width: 100%; height: auto; border-radius: 0.5rem; margin: 2rem auto; display: block; page-break-inside: avoid; break-inside: avoid; }
ul, ol { margin-top: 0; margin-bottom: 1.5em; padding-left: 2rem; font-size: ${tamanhoFonteBase}; line-height: 1.7; }
li { margin-bottom: 0.5rem; page-break-inside: avoid; }

.toc-list a { display: flex; justify-content: space-between; text-decoration: none; color: var(--color-text); font-size: 14pt; margin-bottom: 15px; }
.toc-list a:hover { color: var(--color-secondary); }
.toc-dots { flex-grow: 1; border-bottom: 2px dotted var(--color-primary); margin: 0 10px; position: relative; top: -6px; opacity: 0.5; }

/* 1. Define o tamanho global do papel e tira a margem padrão do navegador */
${conf.pageCss}

/* 2. Regras aplicadas APENAS na hora de exportar/imprimir */
@media print {
    html, body { background: #ffffff !important; padding: 0 !important; margin: 0 !important; display: block !important; width: ${conf.width} !important; height: auto !important; }
    #ebook-container { width: 100%; padding: 0; margin: 0; }
    .page-container { width: ${conf.width} !important; height: ${conf.height} !important; margin: 0 !important; box-shadow: none !important; border: none !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
}
</style>`;

      if (clean.toLowerCase().includes('<body')) {
          if (!clean.includes('@media print')) { clean = clean.replace('</head>', ebookStyles + '\n</head>'); }
          return clean;
      }
      
      return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,400;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
    <title>${livroTitulo || 'Meu E-book Profissional'}</title>
${ebookStyles}
</head>
<body class="antialiased">
    <div id="ebook-container">
        ${clean}
    </div>
</body>
</html>`;
  };

  useEffect(() => {
    const codEl = document.getElementById('codigoGerado') as HTMLTextAreaElement;
    const prevEl = document.getElementById('previewFrame') as HTMLIFrameElement;
    if (codEl && codEl.value && prevEl) {
        prevEl.srcdoc = moldarApresentacaoHtml(codEl.value) + SCRIPT_PREVIEW;
    }
  }, [fontFamily, formatoLivro, tamanhoFonteBase, livroTitulo]); // Adicionado livroTitulo nas dependências

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
        if (e.data.type === 'ELEMENT_SELECTED') setElementoSelecionado(e.data);
        if (e.data.type === 'HTML_SYNC') {
            const codEl = document.getElementById('codigoGerado') as HTMLTextAreaElement;
            if (codEl) {
                const htmlLimpo = moldarApresentacaoHtml(e.data.html);
                setHistoricoCodigo((prev: string[]) => {
                    if (prev.length > 0 && prev[prev.length - 1] === htmlLimpo) return prev;
                    return [...prev, codEl.value]; 
                });
                codEl.value = htmlLimpo; 
            }
        }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fontFamily, formatoLivro, tamanhoFonteBase, livroTitulo]);

  const toggleInspetor = () => {
      const newMode = !modoInspetor;
      setModoInspetor(newMode);
      setElementoSelecionado(null);
      const iframe = document.getElementById('previewFrame') as HTMLIFrameElement;
      if(iframe.contentWindow) iframe.contentWindow.postMessage({ type: 'TOGGLE_EDIT_MODE', value: newMode }, '*');
  };

  const atualizarElemento = (field: string, value: string | number | boolean, forceTextUpdate = false) => {
      if(!elementoSelecionado) return;
      const iframe = document.getElementById('previewFrame') as HTMLIFrameElement;
      iframe.contentWindow?.postMessage({ type: 'UPDATE_ELEMENT', id: elementoSelecionado.id, [field]: value, forceTextUpdate }, '*');
      setElementoSelecionado((prev: any) => ({...prev, [field]: value}));
  };

  const desfazerCodigo = () => {
    if (historicoCodigo.length === 0) { (window as any).showNotification("Nenhuma alteração para desfazer.", "error"); return; }
    const novoHistorico = [...historicoCodigo];
    const estadoAnterior = novoHistorico.pop();
    setHistoricoCodigo(novoHistorico);
    const codEl = document.getElementById('codigoGerado') as HTMLTextAreaElement;
    const prevEl = document.getElementById('previewFrame') as HTMLIFrameElement;
    if (codEl) codEl.value = estadoAnterior || '';
    if (prevEl) prevEl.srcdoc = (estadoAnterior || '') + SCRIPT_PREVIEW; 
    setElementoSelecionado(null);
    (window as any).showNotification("Ação desfeita com sucesso.", "success");
  };

  const otimizarComIA = async (comandoOverride?: string) => {
      const promptInput = document.getElementById('ai_prompt_element') as HTMLInputElement;
      const comando = comandoOverride || promptInput?.value.trim();
      if(!comando || !elementoSelecionado) { (window as any).showNotification("Informe a instrução de edição.", "error"); return; }
      
      const systemInstruction = `Atue como Escritor Best-Seller e Revisor Editorial Sênior. Você receberá o HTML de UM trecho do e-book. Aplique a seguinte modificação: "${comando}". REGRA MÁXIMA: DEVOLVA APENAS A TAG HTML FINAL E PRONTA PARA USO. Preserve obrigatoriamente o ID original id="${elementoSelecionado.id}". Não explique nada.`;
      
      const resData = await chamarMotorIA(systemInstruction, [{text: `TRECHO ORIGINAL:\n${elementoSelecionado.outerHTML}`}], true);
      
      if(resData && resData.html) {
          const cleanHtml = resData.html.replace(/[\`]{3}html/gi, '').replace(/[\`]{3}/g, '').trim();
          const iframe = document.getElementById('previewFrame') as HTMLIFrameElement;
          iframe.contentWindow?.postMessage({ type: 'REPLACE_ELEMENT_HTML', id: elementoSelecionado.id, newHtml: cleanHtml }, '*');
          if(promptInput) promptInput.value = '';
          (window as any).showNotification("Trecho reescrito com sucesso!", "success");
      }
  };

  const chamarMotorIA = async (systemInstructionText: string, promptParts: any[], isElementRefinement = false) => {
    setStatusApis({ texto: isElementRefinement ? 'A IA está reescrevendo...' : 'A IA está diagramando o E-book...', processing: true });
    try {
      const response = await fetch('/api/gerar', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ 
              systemInstruction: systemInstructionText, 
              promptParts, 
              isElementRefinement, 
              useGroq: textEngine === 'groq' 
          }) 
      });
      const responseText = await response.text();
      let data;
      try { data = JSON.parse(responseText); } catch (err) { throw new Error("Erro na comunicação com a IA."); }
      if (!data.success) throw new Error(data.error === 'RATE_LIMIT_EXCEEDED' ? "Limite de acessos atingido. Aguarde." : data.error);
      return data;
    } catch (err: any) {
      let errorMsg = err.message;
      if (errorMsg.includes('429') || errorMsg.toLowerCase().includes('quota')) { errorMsg = "Servidor ocupado. Aguarde um minuto."; }
      (window as any).showNotification(errorMsg, 'error'); return null;
    } finally { setStatusApis({ texto: 'Aguardando Ação', processing: false }); }
  };

  // MEGA FUNÇÃO DE GERAÇÃO
  const executarGeracaoEbook = async () => {
    const content = productContent.trim();
    if (!content) { (window as any).showNotification('Cole o texto base do E-book.', 'error'); return; }

    const regraCapa = formatoLivro === 'A4' 
        ? "- 1 Capa com Título e Imagem de fundo (fotorrealista) cobrindo toda a página." 
        : "- 1 Folha de Rosto literária e clássica (Fundo totalmente branco, SEM imagem de capa. Apenas o Título em destaque máximo, nome do autor e subtítulo centralizados com elegância).";

    const instrucaoSistema = `Atue como um Escritor Bestseller, Desenvolvedor Front-end Sênior e Especialista em Diagramação Editorial (Print CSS).

A sua tarefa é gerar um E-book monumental e profundo num ÚNICO arquivo HTML. O design deve ser altamente profissional, requintado, com estética de "site premium", mas codificado perfeitamente para leitura em tela e conversão exata para PDF.

DADOS DO PROJETO:
TÍTULO: ${livroTitulo || 'Meu E-book'}
AUTORES: ${livroAutores || 'Autor Desconhecido'}

### DIRETRIZES DO GHOSTWRITER (CONTEÚDO)
* **Idioma:** Português (Brasil).
* **Tom de Voz:** Predominantemente Informativo/Educacional, avançado, humanizado e inteligente.
* **Volume:** O conteúdo deve ser EXAUSTIVO. Adicione exemplos, dicas práticas e reflexões para que o documento renda o máximo de páginas possível.
* **Restrições de Palavras:** É TERMINANTEMENTE PROIBIDO usar as palavras: "jornada", "Além disso", "público alvo", "explorar", "No próximo capítulo", "Portanto", "Ou seja", "Dessa forma".

### DIRETRIZES DE DESIGN E FRONT-END (HTML/CSS)
Devolva APENAS as tags internas HTML (sem <html> ou <body>, devolva a partir das divs page-container).

1. **Imagens:** Sempre que inserir imagens, utilize EXCLUSIVAMENTE fotografias fotorrealistas de humanos. Sem desenhos ou gráficos. Use imagens do Unsplash.
2. **Espaçamento:** Organize o HTML para que todos os títulos de tópicos (h1, h2, h3) tenham margin-bottom: 1.5em; mantendo um espaçamento claro.
3. **Páginas e Overflow:** Cada página deve ser uma <div class="page-container">. Estime o espaço: coloque no máximo 3 a 4 parágrafos médios por .page-container. Se o capítulo for longo, feche a div e abra uma nova .page-container. O texto não pode vazar.
4. **Citações:** Coloque as frases mais impactantes dentro de <blockquote>.
5. **Estrutura Exigida:**
   ${regraCapa}
   - 1 Índice (toc-list).
   - Capas de Capítulo e logo a seguir a .page-container com o texto do capítulo.
   - Cabeçalhos (<div class="page-header">) e Rodapés (<div class="page-footer">) em todas as páginas de conteúdo.`;

    const commandText = `CONTEÚDO BASE PARA O E-BOOK:\n"""\n${content}\n"""\n\nGere o HTML completo agora.`;

    const data = await chamarMotorIA(instrucaoSistema, [{ text: commandText }], false);
    
    if (data && data.html) {
        const codEl = document.getElementById('codigoGerado') as HTMLTextAreaElement;
        const prevEl = document.getElementById('previewFrame') as HTMLIFrameElement;
        
        let cleanNewHtml = purificarHTML(data.html);
        let htmlFinal = moldarApresentacaoHtml(cleanNewHtml);

        if (codEl) { 
            setHistoricoCodigo((prev: string[]) => [...prev, codEl.value]); 
            codEl.value = htmlFinal; 
        }
        if (prevEl) prevEl.srcdoc = htmlFinal + SCRIPT_PREVIEW; 
        
        (window as any).showNotification("E-book Gerado com Sucesso!", "success");
    }
  };

  useEffect(() => {
    (window as any).mudarSeparador = (aba: string) => {
      document.getElementById('previewFrame')!.classList.toggle('active', aba === 'preview');
      document.getElementById('codigoContainer')!.classList.toggle('active', aba === 'code');
      document.getElementById('tabPreview')!.className = aba === 'preview' ? "px-5 py-2 rounded-md font-bold text-[11px] bg-slate-800 text-white shadow-sm transition" : "px-5 py-2 rounded-md font-bold text-[11px] text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition";
      document.getElementById('tabCode')!.className = aba === 'code' ? "px-5 py-2 rounded-md font-bold text-[11px] bg-slate-800 text-white shadow-sm transition" : "px-5 py-2 rounded-md font-bold text-[11px] text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition";
    };

    (window as any).showNotification = (msg: string, type: string) => {
      const exist = document.getElementById('custom-toast'); if(exist) exist.remove();
      const div = document.createElement('div'); div.id = 'custom-toast';
      div.className = type === 'error' 
      ? `fixed top-6 left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-xl shadow-xl z-[9999] flex items-start gap-3 text-sm font-semibold max-w-lg w-full break-words` 
      : `fixed bottom-6 right-6 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-xl z-[9999] flex items-center gap-3 text-sm font-semibold`;
      div.innerHTML = type === 'error' ? `<i class="fas fa-exclamation-circle text-red-500 mt-0.5 text-lg shrink-0"></i> <span class="flex-1">${msg}</span>` : `<i class="fas fa-check-circle text-emerald-400 text-lg shrink-0"></i> <span>${msg}</span>`;
      document.body.appendChild(div);
      setTimeout(() => { div.style.opacity = '0'; div.style.transition = 'opacity 0.4s'; setTimeout(() => div.remove(), 4000); }, 4000);
    };

    // EXPORTAÇÕES (PDF, HTML, WORD)
    (window as any).baixarPdf = () => {
        const iframe = document.getElementById('previewFrame') as HTMLIFrameElement;
        if(iframe && iframe.contentWindow) {
            iframe.contentWindow.print();
        } else {
            (window as any).showNotification("Erro ao acessar a visualização para imprimir.", "error");
        }
    };

    (window as any).baixarHtml = () => {
        const codEl = document.getElementById('codigoGerado') as HTMLTextAreaElement;
        if (!codEl || !codEl.value) { (window as any).showNotification("Nenhum código para baixar.", "error"); return; }
        const blob = new Blob([codEl.value], { type: 'text/html' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${livroTitulo ? livroTitulo.replace(/\s+/g, '-').toLowerCase() : 'meu-ebook'}.html`;
        a.click();
    };

    (window as any).baixarWord = () => {
        const codEl = document.getElementById('codigoGerado') as HTMLTextAreaElement;
        if (!codEl || !codEl.value) { (window as any).showNotification("Nenhum código para baixar.", "error"); return; }
        // O Word consegue ler arquivos HTML estruturados salvos como .doc
        const blob = new Blob(['\ufeff', codEl.value], { type: 'application/msword' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${livroTitulo ? livroTitulo.replace(/\s+/g, '-').toLowerCase() : 'meu-ebook'}.doc`;
        a.click();
    };

  }, [livroTitulo]); 

  return (
    <div className="h-screen overflow-hidden flex relative bg-slate-100 text-slate-800 font-sans selection:bg-indigo-100">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <style dangerouslySetInnerHTML={{__html: `
        .input-standard { width: 100%; padding: 0.6rem 0.8rem; border-radius: 0.5rem; border: 1px solid #cbd5e1; background-color: #f8fafc; font-size: 0.75rem; outline: none; color: #334155; transition: all 0.2s; font-weight: 500;}
        .input-standard:focus { border-color: #6366f1; background-color: #ffffff; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .input-label { font-size: 0.65rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4rem; display: block; }
        .panel-section { padding: 1.2rem; border-bottom: 1px solid #f1f5f9; }
        #previewFrame, #codigoContainer { display: none; }
        #previewFrame.active, #codigoContainer.active { display: block; }
        ::-webkit-scrollbar { width: 6px; height: 6px;}
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}} />

      {/* OVERLAY DE CARREGAMENTO */}
      {statusApis.processing && (
          <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center">
              <div className="w-14 h-14 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-5"></div>
              <p className="text-slate-800 font-black text-xl tracking-tight mb-2">{statusApis.texto}</p>
              <p className="text-slate-500 font-medium text-sm">Organizando a folha e formatando a leitura...</p>
          </div>
      )}

      {/* PAINEL LATERAL ESQUERDO */}
      <aside className="w-[360px] bg-white border-r border-slate-200 flex flex-col h-full z-10 flex-shrink-0 shadow-sm">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h1 className="text-xl font-black tracking-tight text-slate-800 flex items-center">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center mr-2.5 text-white shadow-md shadow-indigo-200"><i className="fas fa-book-open text-xs"></i></div>
                  E-book<span className="text-indigo-600">Pro</span>
              </h1>
              
              <button onClick={toggleInspetor} className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${modoInspetor ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                  <i className={`fas fa-pen-nib ${modoInspetor ? 'animate-pulse text-yellow-300' : ''}`}></i> {modoInspetor ? 'Revisando...' : 'Revisar Textos'}
              </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
              {modoInspetor ? (
                  <div className="animate-[fadeIn_0.2s_ease]">
                      <div className="bg-indigo-600 text-white p-4 text-[11px] font-black tracking-widest uppercase flex justify-between items-center shadow-inner">
                          <span>Revisor Literário</span>
                          <i className="fas fa-spell-check text-indigo-300"></i>
                      </div>

                      {!elementoSelecionado ? (
                          <div className="flex flex-col items-center justify-center p-14 text-center text-slate-400">
                              <div className="w-16 h-16 rounded-full bg-white border-2 border-dashed border-slate-200 flex items-center justify-center mb-4 shadow-sm">
                                  <i className="fas fa-text-height text-2xl text-indigo-300"></i>
                              </div>
                              <p className="text-sm font-bold text-slate-600 mb-1">Selecione para Revisar</p>
                              <p className="text-xs font-medium text-slate-400">Clique em qualquer parágrafo, título ou citação no e-book ao lado.</p>
                          </div>
                      ) : (
                          <div className="pb-10 bg-white">
                              <div className="panel-section bg-slate-50/50">
                                  <div className="flex justify-between items-center mb-3">
                                      <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-md shadow-sm">Tag: {elementoSelecionado.tagName}</span>
                                      <button onClick={() => {
                                          let el = document.getElementById('previewFrame') as HTMLIFrameElement;
                                          el.contentWindow?.postMessage({ type: 'DELETE_ELEMENT', id: elementoSelecionado.id }, '*');
                                      }} className="text-[9px] font-bold text-red-500 hover:text-red-700 transition flex items-center bg-red-50 border border-red-200 hover:border-red-400 px-2 py-1 rounded shadow-sm"><i className="fas fa-trash-alt mr-1"></i> Apagar</button>
                                  </div>

                                  <label className="input-label mb-2">Edição Manual</label>
                                  <textarea rows={6} value={elementoSelecionado.text} onChange={(e) => atualizarElemento('text', e.target.value, true)} className="input-standard resize-y shadow-inner text-sm leading-relaxed font-serif"></textarea>
                              </div>

                              <div className="panel-section grid grid-cols-2 gap-4 border-t border-slate-100">
                                  <div>
                                      <label className="input-label mb-2 text-[9px]">Alinhamento</label>
                                      <div className="flex bg-slate-100 rounded-lg border border-slate-200 p-1">
                                          <button onClick={() => atualizarElemento('textAlign', 'text-left')} className={`flex-1 h-7 flex items-center justify-center rounded text-[10px] transition ${elementoSelecionado.textAlign === 'text-left' ? 'bg-white shadow-sm text-indigo-600 font-bold' : 'text-slate-500'}`}><i className="fas fa-align-left"></i></button>
                                          <button onClick={() => atualizarElemento('textAlign', 'text-center')} className={`flex-1 h-7 flex items-center justify-center rounded text-[10px] transition ${elementoSelecionado.textAlign === 'text-center' ? 'bg-white shadow-sm text-indigo-600 font-bold' : 'text-slate-500'}`}><i className="fas fa-align-center"></i></button>
                                          <button onClick={() => atualizarElemento('textAlign', 'text-justify')} className={`flex-1 h-7 flex items-center justify-center rounded text-[10px] transition ${elementoSelecionado.textAlign === 'text-justify' ? 'bg-white shadow-sm text-indigo-600 font-bold' : 'text-slate-500'}`}><i className="fas fa-align-justify"></i></button>
                                      </div>
                                  </div>
                                  <div>
                                      <label className="input-label mb-2 text-[9px]">Tamanho da Fonte</label>
                                      <input type="range" min="12" max="60" value={elementoSelecionado.fontSize || 16} onChange={(e) => atualizarElemento('fontSize', parseInt(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-2" />
                                  </div>
                              </div>

                              {/* PAINEL DO GHOSTWRITER IA */}
                              <div className="m-5 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 shadow-xl text-white">
                                  <label className="text-[11px] font-black uppercase tracking-widest text-indigo-300 mb-4 flex items-center"><i className="fas fa-robot text-xl mr-2 text-white"></i> Ghostwriter (IA)</label>
                                  
                                  <div className="grid grid-cols-2 gap-2.5 mb-4">
                                      <button onClick={() => otimizarComIA("Reescreva este trecho de forma mais envolvente e rica em detalhes, melhorando a narrativa e a fluidez da leitura.")} className="bg-slate-700 hover:bg-slate-600 text-[10px] font-bold py-2.5 rounded-lg text-white transition shadow-sm border border-slate-600">Mais Envolvente</button>
                                      <button onClick={() => otimizarComIA("Faça um resumo executivo deste trecho, sendo muito direto, profissional e focado nos pontos principais.")} className="bg-slate-700 hover:bg-slate-600 text-[10px] font-bold py-2.5 rounded-lg text-white transition shadow-sm border border-slate-600">Resumir Direto</button>
                                      <button onClick={() => otimizarComIA("Corrija todos os erros gramaticais, de pontuação e de concordância sem alterar o sentido do texto original.")} className="col-span-2 bg-indigo-600 hover:bg-indigo-500 text-[10px] font-bold py-2.5 rounded-lg text-white transition shadow-sm border border-indigo-500 flex items-center justify-center gap-1.5"><i className="fas fa-check-double"></i> Correção Gramatical</button>
                                  </div>
                                  
                                  <div className="flex gap-2 relative">
                                      <input type="text" id="ai_prompt_element" placeholder="Escreva o que a IA deve fazer..." className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-4 py-3 outline-none focus:border-indigo-400 placeholder-slate-400" />
                                      <button onClick={() => otimizarComIA()} className="absolute right-1.5 top-1.5 bottom-1.5 w-10 bg-indigo-500 hover:bg-indigo-400 rounded-md flex items-center justify-center transition shadow-sm"><i className="fas fa-paper-plane"></i></button>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              ) : (
                  <div className="p-5 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                      <div>
                          <h3 className="text-xs font-black uppercase text-slate-800 mb-3.5 tracking-wide flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-500">1</span> Diagramação</h3>
                          <div className="space-y-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                              <div>
                                  <label className="input-label mb-2">Formato da Página</label>
                                  <select value={formatoLivro} onChange={(e) => setFormatoLivro(e.target.value as any)} className="input-standard font-bold text-indigo-700 bg-indigo-50">
                                      <option value="A4">A4 (Digital / PDF Clássico)</option>
                                      <option value="15x21">15x21cm (Padrão Impresso Comercial)</option>
                                      <option value="14x21">14x21cm (Livro de Bolso / Romance)</option>
                                  </select>
                              </div>
                              
                              <div className="pt-3 border-t border-slate-100">
                                  <label className="input-label mb-2">Tipografia Literária</label>
                                  <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="input-standard font-medium text-slate-800">
                                      <option value="Lato">Lato (Moderna/Versátil)</option>
                                      <option value="Merriweather">Merriweather (Leitura Longa)</option>
                                      <option value="Lora">Lora (Romances e Contos)</option>
                                      <option value="EB Garamond">EB Garamond (Clássico)</option>
                                  </select>
                              </div>

                              <div className="pt-3 border-t border-slate-100">
                                  <label className="input-label mb-2">Tamanho da Fonte (Base)</label>
                                  <select value={tamanhoFonteBase} onChange={(e) => setTamanhoFonteBase(e.target.value)} className="input-standard font-medium text-slate-800">
                                      <option value="11pt">11pt (Econômico)</option>
                                      <option value="12pt">12pt (Padrão Clássico)</option>
                                      <option value="13pt">13pt (Leitura Confortável)</option>
                                      <option value="14pt">14pt (Letra Grande)</option>
                                      <option value="16pt">16pt (Visão Facilitada)</option>
                                  </select>
                              </div>

                              <div className="pt-3 border-t border-slate-100">
                                  <label className="input-label mb-2">Motor de Inteligência (IA)</label>
                                  <select value={textEngine} onChange={(e) => setTextEngine(e.target.value as any)} className="input-standard font-bold text-slate-700">
                                      <option value="gemini">Google Gemini (Focado em Detalhes)</option>
                                      <option value="groq">Groq Llama 3 (Geração Rápida)</option>
                                  </select>
                              </div>
                          </div>
                      </div>

                      <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-sm flex flex-col">
                          <h3 className="text-xs font-black uppercase text-indigo-900 mb-3 tracking-wide flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span> Dados do Livro</h3>
                          
                          <div className="mb-4">
                              <label className="input-label text-indigo-800">Título do E-book</label>
                              <input type="text" value={livroTitulo} onChange={e => setLivroTitulo(e.target.value)} className="input-standard text-sm" placeholder="Ex: O Poder da Mente" />
                          </div>
                          
                          <div className="mb-4">
                              <label className="input-label text-indigo-800">Autor(es)</label>
                              <input type="text" value={livroAutores} onChange={e => setLivroAutores(e.target.value)} className="input-standard text-sm" placeholder="Ex: João Silva" />
                          </div>

                          <div className="mb-4">
                              <label className="input-label text-indigo-800">Conteúdo Base / Tópicos</label>
                              <textarea 
                                  value={productContent} 
                                  onChange={(e) => setProductContent(e.target.value)} 
                                  className="input-standard h-32 resize-y leading-relaxed text-sm p-4 rounded-xl border-indigo-200 shadow-inner font-serif" 
                                  placeholder="Cole todo o conteúdo aqui. A IA vai diagramar, adicionar citações, imagens e gerar o e-book completo."
                              ></textarea>
                          </div>

                          <div className="flex flex-col gap-2 mt-auto">
                              <button onClick={() => executarGeracaoEbook()} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 text-xs flex items-center justify-center gap-2">
                                  <i className="fas fa-file-alt text-yellow-300 text-lg"></i> Gerar E-book Completo
                              </button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      </aside>

      {/* ÁREA PRINCIPAL - O CANVAS EDITORIAL */}
      <main className="flex-grow flex flex-col bg-slate-200 relative min-w-0 z-0">
          <div className="bg-white border-b border-slate-200 flex justify-between items-center px-4 md:px-6 h-[60px] shadow-sm z-10">
              <div className="flex items-center gap-3">
                  <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                      <button id="tabPreview" onClick={() => (window as any).mudarSeparador('preview')} className="px-5 py-2 rounded-md font-bold text-xs bg-white text-indigo-700 shadow-sm transition">Ver Leitura</button>
                      <button id="tabCode" onClick={() => (window as any).mudarSeparador('code')} className="px-5 py-2 rounded-md font-bold text-xs text-slate-500 hover:text-slate-800 transition">Código HTML</button>
                  </div>
                  <div className="w-px h-6 bg-slate-200 mx-2 hidden md:block"></div>
                  <button onClick={desfazerCodigo} className="hidden md:flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-xs font-bold transition px-2 py-1 rounded hover:bg-slate-100"><i className="fas fa-undo"></i> Desfazer</button>
              </div>

              <div className="flex items-center gap-2 md:gap-3">
                  <button onClick={() => (window as any).baixarHtml()} className="px-4 py-2 border-2 border-slate-300 text-slate-600 hover:bg-slate-50 font-bold text-xs rounded-lg transition flex items-center" title="Baixar como arquivo HTML">
                      <i className="fab fa-html5 mr-1.5 text-orange-500"></i> HTML
                  </button>
                  <button onClick={() => (window as any).baixarWord()} className="px-4 py-2 border-2 border-slate-300 text-slate-600 hover:bg-slate-50 font-bold text-xs rounded-lg transition flex items-center" title="Baixar formato Word (.doc)">
                      <i className="fas fa-file-word mr-1.5 text-blue-600"></i> Word
                  </button>
                  <button onClick={() => (window as any).baixarPdf()} className="px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-xs uppercase tracking-wide rounded-lg transition flex items-center shadow-sm">
                      <i className="fas fa-file-pdf mr-1.5"></i> Salvar PDF
                  </button>
              </div>
          </div>
          
          <div className="flex-grow relative bg-slate-200 p-0 md:p-8 overflow-y-auto overflow-x-hidden flex justify-center items-start custom-scrollbar">
              <iframe id="previewFrame" className="w-full min-h-full border-none active bg-transparent" sandbox="allow-scripts allow-same-origin allow-modals" title="Leitor do Ebook"></iframe>
              
              <div id="codigoContainer" className="absolute inset-0 bg-[#0d1117] hidden">
                  <textarea id="codigoGerado" className="w-full h-full font-mono text-[13px] bg-[#0d1117] text-[#56d364] border-none outline-none resize-none custom-scrollbar p-8 leading-relaxed"
                      onBlur={(e) => {
                          const iframe = document.getElementById('previewFrame') as HTMLIFrameElement;
                          if (iframe) { iframe.srcdoc = moldarApresentacaoHtml(e.target.value) + SCRIPT_PREVIEW; }
                      }}
                  ></textarea>
              </div>
          </div>
      </main>
    </div>
  );
}