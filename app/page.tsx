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
                fontLink.href = \`[https://fonts.googleapis.com/css2?family=](https://fonts.googleapis.com/css2?family=)\${fontName.replace(/ /g, '+')}:ital,wght@0,400;0,700;1,400&display=swap\`;
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
  const [modalMeusLivrosAberto, setModalMeusLivrosAberto] = useState(false);
  const [listaLivros, setListaLivros] = useState<any[]>([]);
  const [carregandoLivros, setCarregandoLivros] = useState(false);
  
  const [livroEditando, setSiteEditando] = useState<{id: string, slug: string, titulo: string} | null>(null);
  const [historicoCodigo, setHistoricoCodigo] = useState<string[]>([]);
  
  const [textEngine, setTextEngine] = useState<'gemini' | 'groq'>('gemini');
  const [modoInspetor, setModoInspetor] = useState(false);
  const [elementoSelecionado, setElementoSelecionado] = useState<any>(null);
  const [statusApis, setStatusApis] = useState<{ texto: string; processing: boolean }>({ texto: 'Aguardando Operação', processing: false });

  // CONFIGURAÇÕES DO E-BOOK
  const [formatoLivro, setFormatoLivro] = useState<'A4' | '15x21' | '14x21'>('A4');
  const [fontFamily, setFontFamily] = useState('Merriweather');
  const [tamanhoFonteBase, setTamanhoFonteBase] = useState('13pt'); // Nova opção de fonte
  const [nichoEstilo, setNichoEstilo] = useState('nao-ficcao');
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
      if(formato === '15x21') return { width: '150mm', pageCss: '@page { size: 150mm 210mm; margin: 15mm; }' };
      if(formato === '14x21') return { width: '140mm', pageCss: '@page { size: 140mm 210mm; margin: 15mm; }' };
      return { width: '210mm', pageCss: '@page { size: A4; margin: 20mm; }' };
  };

  const moldarApresentacaoHtml = (rawHtml: string) => {
      let clean = purificarHTML(rawHtml);
      const conf = getEstilosFormato(formatoLivro);
      
      const ebookStyles = `<style>
/* Estilos para o Editor na Tela */
body { background-color: #e2e8f0; margin: 0; padding: 2rem 0; display: flex; justify-content: center; overflow-x: hidden; }

#ebook-container {
    background-color: white;
    width: ${conf.width};
    min-height: 297mm;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    padding: 20mm 15mm;
    margin: 0 auto;
    box-sizing: border-box;
    /* BLINDAGEM CONTRA VAZAMENTO DE MARGEM PARA PDFS LONGOS */
    word-wrap: break-word;
    overflow-wrap: break-word;
}

/* Regras de Tipografia Premium Editorial e Espaçamentos Perfeitos */
h1 { page-break-before: always; break-before: page; color: #111827; font-weight: 800; font-size: 2.5rem; margin-top: 2rem; margin-bottom: 1.5em; line-height: 1.2; text-align: center; }
h2 { page-break-after: avoid; break-after: avoid; color: #1f2937; font-weight: 700; font-size: 1.8rem; margin-top: 2.5rem; margin-bottom: 1.5em; }
h3 { page-break-after: avoid; break-after: avoid; font-weight: 600; font-size: 1.4rem; margin-top: 2rem; margin-bottom: 1.5em; }

/* Parágrafos justificados com hifenização inteligente e tamanho variável */
p { color: #374151; font-size: ${tamanhoFonteBase}; line-height: 1.7; margin-top: 0; margin-bottom: 1.5em; text-align: justify; hyphens: auto; -webkit-hyphens: auto; }

/* Citações e Imagens */
blockquote { page-break-inside: avoid; break-inside: avoid; font-style: italic; color: #4b5563; border-left: 4px solid #6366f1; padding-left: 1.5rem; margin: 2rem 0; font-size: 1.15em; }
img { max-width: 100%; height: auto; border-radius: 0.5rem; margin: 2rem auto; display: block; page-break-inside: avoid; break-inside: avoid; }
ul, ol { margin-top: 0; margin-bottom: 1.5em; padding-left: 2rem; color: #374151; font-size: ${tamanhoFonteBase}; line-height: 1.7; }
li { margin-bottom: 0.5rem; page-break-inside: avoid; break-inside: avoid; }

/* Regras de Ouro para Impressão PDF Perfeita (100+ Páginas) */
@media print {
    ${conf.pageCss}
    body { background-color: white; padding: 0; margin: 0; }
    #ebook-container { box-shadow: none; width: 100%; max-width: 100%; padding: 0; margin: 0; min-height: auto; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
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
    <script src="[https://cdn.tailwindcss.com](https://cdn.tailwindcss.com)"></script>
    <link rel="stylesheet" href="[https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css](https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css)">
    <link href="[https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,700;1,400&display=swap](https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,700;1,400&display=swap)" rel="stylesheet">
    <title>Meu E-book Profissional</title>
${ebookStyles}
</head>
<body class="antialiased" style="font-family: '${fontFamily}', serif;">
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
  }, [fontFamily, formatoLivro, tamanhoFonteBase]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
        if (e.data.type === 'ELEMENT_SELECTED') setElementoSelecionado(e.data);
        if (e.data.type === 'HTML_SYNC') {
            const codEl = document.getElementById('codigoGerado') as HTMLTextAreaElement;
            if (codEl) {
                const htmlLimpo = moldarApresentacaoHtml(e.data.html);
                setHistoricoCodigo(prev => {
                    if (prev.length > 0 && prev[prev.length - 1] === htmlLimpo) return prev;
                    return [...prev, codEl.value]; 
                });
                codEl.value = htmlLimpo; 
            }
        }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fontFamily, formatoLivro, tamanhoFonteBase]);

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
          // Correção definitiva da Expressão Regular
          const cleanHtml = resData.html.replace(/[\`]{3}html/gi, '').replace(/[\`]{3}/g, '').trim();
          
          const iframe = document.getElementById('previewFrame') as HTMLIFrameElement;
          iframe.contentWindow?.postMessage({ type: 'REPLACE_ELEMENT_HTML', id: elementoSelecionado.id, newHtml: cleanHtml }, '*');
          if(promptInput) promptInput.value = '';
          (window as any).showNotification("Trecho reescrito com sucesso!", "success");
      }
  };

  const chamarMotorIA = async (systemInstructionText: string, promptParts: any[], isElementRefinement = false) => {
    setStatusApis({ texto: isElementRefinement ? 'A IA está reescrevendo o trecho...' : 'A IA está escrevendo o capítulo...', processing: true });
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
      try { data = JSON.parse(responseText); } catch (err) { throw new Error("Houve um gargalo na comunicação com a IA."); }
      if (!data.success) throw new Error(data.error === 'RATE_LIMIT_EXCEEDED' ? "Limite de acessos da IA atingido. Aguarde 60 segundos." : data.error);
      return data;
    } catch (err: any) {
      let errorMsg = err.message;
      if (errorMsg.includes('429') || errorMsg.toLowerCase().includes('quota') || errorMsg.includes('RATE_LIMIT')) { errorMsg = "Servidor ocupado. Aguarde um minuto."; }
      (window as any).showNotification(errorMsg, 'error'); return null;
    } finally { setStatusApis({ texto: 'Aguardando Ação', processing: false }); }
  };

  // Função para criação massiva
  const executarGeracaoEbook = async (modo: 'novo' | 'adicionar' = 'novo') => {
    const content = productContent.trim();
    if (!content) { (window as any).showNotification('Cole um roteiro ou texto base para gerar ou adicionar ao e-book.', 'error'); return; }
    
    let estiloPrompt = "Linguagem técnica, direta e voltada para negócios/empreendedorismo.";
    if (nichoEstilo === 'ficcao') estiloPrompt = "Linguagem imersiva, narrativa rica e emocionante (Ficção/Romance).";
    if (nichoEstilo === 'didatico') estiloPrompt = "Linguagem educacional, clara, em passo a passo e didática.";

    let commandText = `Escreva um E-book MUITO EXTENSO e PROFUNDO. \nESTILO E TOM DE VOZ: ${estiloPrompt}\n\n`;
    commandText += `INSTRUÇÕES / CONTEÚDO BASE:\n"""\n${content}\n"""\n\n`;
    commandText += `ATENÇÃO MÁXIMA: O objetivo é que o livro tenha a capacidade de atingir mais de 100 páginas no total. Portanto, DESENVOLVA EXAUSTIVAMENTE CADA TÓPICO. Crie múltiplos subcapítulos, use parágrafos longos, adicione exemplos extensos e aprofunde o conteúdo ao máximo. Aja como um escritor de fôlego monumental.`;
    
    const instrucaoSistema = `Você é um Ghostwriter Premium e Diagramador Editorial. Crie o conteúdo do livro formatado em HTML limpo.
REGRA 1: Use <h1> apenas para o Título do Livro ou Capítulos Principais.
REGRA 2: Use <h2> para subtópicos. OBRIGATÓRIO manter o espaço exato de uma linha entre o título do tópico e os parágrafos subsequentes.
REGRA 3: Use <p> longos e exaustivamente desenvolvidos.
REGRA 4: Use <blockquote> para destacar frases de impacto.
REGRA 5: NUNCA sugira ou crie ilustrações, desenhos, gráficos animados ou elementos sci-fi. Use EXCLUSIVAMENTE fotografias fotorrealistas de humanos reais, se precisar de imagem.
REGRA 6: Se a obra contiver história biográfica, toda a narrativa de vida DEVE ser consolidada apenas no primeiro capítulo. Os demais capítulos devem ter foco estrito em dicas e ensinamentos.
REGRA 7: Devolva APENAS as tags HTML internas (sem html/body e sem classes do Tailwind).`;

    const data = await chamarMotorIA(instrucaoSistema, [{ text: commandText }], false);
    
    if (data && data.html) {
        const codEl = document.getElementById('codigoGerado') as HTMLTextAreaElement;
        const prevEl = document.getElementById('previewFrame') as HTMLIFrameElement;
        
        let htmlFinal = "";
        let cleanNewHtml = purificarHTML(data.html);

        if (modo === 'adicionar' && codEl && codEl.value.includes('<div id="ebook-container">')) {
            let currentFull = codEl.value;
            htmlFinal = currentFull.replace('</div>\n</body>', `\n${cleanNewHtml}\n</div>\n</body>`);
        } else {
            htmlFinal = moldarApresentacaoHtml(cleanNewHtml);
        }

        if (codEl) { setHistoricoCodigo(prev => [...prev, codEl.value]); codEl.value = htmlFinal; }
        if (prevEl) prevEl.srcdoc = htmlFinal + SCRIPT_PREVIEW; 
        
        setProductContent('');
        (window as any).showNotification(modo === 'novo' ? "E-book Iniciado com Sucesso!" : "Capítulos Adicionados!", "success");
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

    (window as any).baixarPdf = () => {
        const iframe = document.getElementById('previewFrame') as HTMLIFrameElement;
        if(iframe && iframe.contentWindow) {
            iframe.contentWindow.print();
        } else {
            (window as any).showNotification("Erro ao acessar a visualização para imprimir.", "error");
        }
    };
  }, []); 

  return (
    <div className="h-screen overflow-hidden flex relative bg-slate-100 text-slate-800 font-sans selection:bg-indigo-100">
      <link rel="stylesheet" href="[https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css](https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css)" />
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
                                      <option value="Merriweather">Merriweather (Leitura Longa)</option>
                                      <option value="Lora">Lora (Romances e Contos)</option>
                                      <option value="EB Garamond">EB Garamond (Clássico Acadêmico)</option>
                                      <option value="Playfair Display">Playfair Display (Títulos Elegantes)</option>
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
                          <h3 className="text-xs font-black uppercase text-indigo-900 mb-3 tracking-wide flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span> Escrita em Blocos</h3>
                          <p className="text-[10px] text-indigo-700 mb-4 leading-relaxed">Para criar e-books dezenas de páginas (até 100+) usando contas gratuitas das APIs, você deve gerar o conteúdo <b>Capítulo por Capítulo</b>.</p>
                          
                          <div className="mb-4">
                              <label className="input-label text-indigo-800">Estilo de Escrita</label>
                              <select value={nichoEstilo} onChange={(e) => setNichoEstilo(e.target.value)} className="input-standard text-sm font-bold text-indigo-900">
                                  <option value="nao-ficcao">Negócios / Técnico (Não Ficção)</option>
                                  <option value="ficcao">Narrativa Emocionante (Romance/Ficção)</option>
                                  <option value="didatico">Passo a Passo (Material Didático)</option>
                              </select>
                          </div>

                          <div className="mb-4">
                              <label className="input-label text-indigo-800">Assunto deste Capítulo</label>
                              <textarea 
                                  value={productContent} 
                                  onChange={(e) => setProductContent(e.target.value)} 
                                  className="input-standard h-32 resize-y leading-relaxed text-sm p-4 rounded-xl border-indigo-200 shadow-inner font-serif" 
                                  placeholder="Digite o título do capítulo ou as anotações sobre o que a IA deve escrever agora..."
                              ></textarea>
                          </div>

                          <div className="flex flex-col gap-2 mt-auto">
                              <button onClick={() => executarGeracaoEbook('novo')} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 text-xs flex items-center justify-center gap-2">
                                  <i className="fas fa-file-alt text-yellow-300 text-lg"></i> Iniciar Novo E-book
                              </button>
                              <button onClick={() => executarGeracaoEbook('adicionar')} className="w-full bg-white border-2 border-indigo-200 hover:bg-indigo-50 text-indigo-700 font-black uppercase tracking-wider py-3.5 rounded-xl transition-all hover:-translate-y-0.5 text-xs flex items-center justify-center gap-2" title="Adiciona este texto ao final do e-book atual">
                                  <i className="fas fa-plus-circle text-lg"></i> Adicionar Próximo Capítulo
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

              <div className="flex items-center gap-3 md:gap-4">
                  <button onClick={() => (window as any).baixarPdf()} className="px-6 py-2 border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-bold text-xs uppercase tracking-wide rounded-lg transition flex items-center shadow-sm"><i className="fas fa-file-pdf mr-1.5"></i> Salvar PDF Pronto</button>
              </div>
          </div>
          
          <div className="flex-grow relative bg-slate-200 p-0 md:p-8 overflow-y-auto overflow-x-hidden flex justify-center items-start custom-scrollbar">
              {/* O Iframe agora atua como uma "Prancheta/Mesa" livre */}
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