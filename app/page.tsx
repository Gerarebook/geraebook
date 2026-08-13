'use client';

import { supabase } from '@/lib/supabase';
import React, { useEffect, useState, useRef } from 'react';

const SCRIPT_PREVIEW = `<script id="editor-magic-script">
    let modoEdicao = false;
    let elSelecionado = null;

    if (!document.getElementById('builder-core-styles')) {
        const style = document.createElement('style');
        style.id = 'builder-core-styles';
        style.innerHTML = \`body.builder-editing * { cursor: pointer !important; }\`;
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
        elSelecionado.style.outline = '3px dashed #4f46e5'; 
        elSelecionado.style.outlineOffset = '-3px';

        if(!elSelecionado.id) elSelecionado.id = 'node_' + Math.random().toString(36).substr(2,9);

        let compStyle = window.getComputedStyle(elSelecionado);
        let tAlign = '';
        if(elSelecionado.classList.contains('text-center')) tAlign = 'text-center';
        else if(elSelecionado.classList.contains('text-right')) tAlign = 'text-right';
        else if(elSelecionado.classList.contains('text-justify')) tAlign = 'text-justify';
        else if(elSelecionado.classList.contains('text-left')) tAlign = 'text-left';

        let bgImgRaw = compStyle.backgroundImage;
        let bgImgUrl = '';
        if (bgImgRaw && bgImgRaw !== 'none' && bgImgRaw.includes('url(')) {
            let matches = bgImgRaw.match(/url\\(["']?(.*?)["']?\\)/);
            if(matches && matches[1]) bgImgUrl = matches[1];
        }

        window.parent.postMessage({
            type: 'ELEMENT_SELECTED',
            id: elSelecionado.id,
            tagName: elSelecionado.tagName.toLowerCase(),
            text: elSelecionado.innerText || '',
            src: elSelecionado.src || '',
            bgImage: bgImgUrl,
            width: elSelecionado.style.width || elSelecionado.width || '',
            height: elSelecionado.style.height || elSelecionado.height || '',
            className: elSelecionado.className,
            textColor: rgbToHex(compStyle.color),
            bgColor: rgbToHex(compStyle.backgroundColor),
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
            }
        }

        if (event.data.type === 'DELETE_ELEMENT') {
            let el = document.getElementById(event.data.id);
            if(el) { el.remove(); elSelecionado = null; sendCleanHtml(); }
        }

        if(event.data.type === 'UPDATE_ELEMENT') {
            let el = document.getElementById(event.data.id);
            if(el) {
                if(event.data.text !== undefined && event.data.forceTextUpdate) {
                    el.innerText = event.data.text;
                }
                if(event.data.src !== undefined) el.src = event.data.src;
                if(event.data.width !== undefined) el.style.width = event.data.width;
                if(event.data.height !== undefined) el.style.height = event.data.height;
                if(event.data.textColor !== undefined) el.style.setProperty('color', event.data.textColor, 'important');
                if(event.data.bgColor !== undefined) el.style.setProperty('background-color', event.data.bgColor, 'important');
                
                if(event.data.bgImage !== undefined) {
                    if(event.data.bgImage === '') {
                        el.style.setProperty('background-image', 'none', 'important');
                    } else {
                        let currentBg = el.style.backgroundImage || window.getComputedStyle(el).backgroundImage;
                        if(currentBg && currentBg.includes('linear-gradient')) {
                            let gradientPart = currentBg.split(', url')[0];
                            el.style.setProperty('background-image', \`\${gradientPart}, url('\${event.data.bgImage}')\`, 'important');
                        } else {
                            el.style.setProperty('background-image', \`url('\${event.data.bgImage}')\`, 'important');
                        }
                        el.style.setProperty('background-size', 'cover', 'important');
                        el.style.setProperty('background-position', 'center', 'important');
                    }
                }

                if(event.data.fontSize !== undefined) {
                    el.style.setProperty('font-size', event.data.fontSize + 'px', 'important');
                }

                if(event.data.textAlign !== undefined) {
                    el.classList.remove('text-left', 'text-center', 'text-right', 'text-justify');
                    if(event.data.textAlign) el.classList.add(event.data.textAlign);
                }
                sendCleanHtml();
            }
        }
        if(event.data.type === 'REPLACE_ELEMENT_HTML') {
            let el = document.getElementById(event.data.id);
            if(el) { el.outerHTML = event.data.newHtml; sendCleanHtml(); }
        }
    });

    document.addEventListener('click', (e) => {
        if (modoEdicao) {
            e.preventDefault(); 
            e.stopPropagation();
            selectElement(e.target);
        } else {
            let targetLink = e.target.closest('a');
            if (targetLink && targetLink.getAttribute('href')?.startsWith('#')) {
                e.preventDefault();
                let targetId = targetLink.getAttribute('href').substring(1);
                let targetEl = document.getElementById(targetId);
                if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, true); 
</script>`;

export default function Home() {
  useEffect(() => {
    const verificarAcesso = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/login'; }
    };
    verificarAcesso();
  }, []);

  const [historicoCodigo, setHistoricoCodigo] = useState<string[]>([]);
  const [textEngine, setTextEngine] = useState<'gemini' | 'groq'>('gemini');
  const [modoInspetor, setModoInspetor] = useState(false);
  const [elementoSelecionado, setElementoSelecionado] = useState<any>(null);
  const [statusApis, setStatusApis] = useState<{ texto: string; processing: boolean }>({ texto: 'Aguardando Operação', processing: false });

  // CONFIGURAÇÕES DE DESIGN GERAL
  const [formatoLivro, setFormatoLivro] = useState<'A4' | '15x21' | '14x21'>('A4');
  const [fontFamily, setFontFamily] = useState('Lato');
  const [tamanhoFonteBase, setTamanhoFonteBase] = useState('14pt');
  const [espacamentoLinhas, setEspacamentoLinhas] = useState('1.5');
  const [espacamentoParagrafo, setEspacamentoParagrafo] = useState('1.5em');
  const [recuoParagrafo, setRecuoParagrafo] = useState('20px');
  
  const [tipoBorda, setTipoBorda] = useState<'none' | 'single' | 'double'>('none');
  const [tipoCapa, setTipoCapa] = useState<'imagem-texto' | 'imagem-pura' | 'texto'>('imagem-texto');
  const [imagemCapaUrl, setImagemCapaUrl] = useState('https://picsum.photos/1200/1600?random=1');
  const [htmlTemplate, setHtmlTemplate] = useState('');

  // CONFIGURAÇÕES DE CAPÍTULO E AUTOR
  const [estiloCapitulos, setEstiloCapitulos] = useState<'padrao' | 'box-arredondado' | 'imagem-pura' | 'inline'>('padrao');
  const [alinhamentoCapitulo, setAlinhamentoCapitulo] = useState<'center' | 'flex-start' | 'flex-end'>('center');
  const [corBoxCapitulo, setCorBoxCapitulo] = useState('rgba(255, 255, 255, 0.95)');
  
  const [estiloRodape, setEstiloRodape] = useState<'simples' | 'linha-superior' | 'centralizado'>('simples');
  const [paletaCores, setPaletaCores] = useState<'classico' | 'moderno' | 'sepia' | 'dark' | 'personalizado'>('classico');
  
  const [autorPosicao, setAutorPosicao] = useState<'esquerda' | 'topo'>('esquerda');
  const [autorFormato, setAutorFormato] = useState<'circulo' | 'retangulo'>('circulo');

  // DADOS DO PROJETO
  const [livroTitulo, setLivroTitulo] = useState('');
  const [livroAutores, setLivroAutores] = useState('');
  const [productContent, setProductContent] = useState('');
  const [modoConteudo, setModoConteudo] = useState<'prompt' | 'rigoroso' | 'expandido'>('expandido');
  const [incluirIntroConclusao, setIncluirIntroConclusao] = useState(true);

  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Img = event.target?.result as string;
      if (elementoSelecionado && elementoSelecionado.tagName === 'img') {
        atualizarElemento('src', base64Img);
        (window as any).showNotification("Imagem substituída com sucesso!", "success");
      } else if (elementoSelecionado && elementoSelecionado.bgImage !== undefined) {
        atualizarElemento('bgImage', base64Img);
        (window as any).showNotification("Fundo substituído com sucesso!", "success");
      } else {
        setImagemCapaUrl(base64Img);
        (window as any).showNotification("Capa atualizada com sucesso!", "success");
      }
    };
    reader.readAsDataURL(file);
  };

  const getPaletaObj = () => {
      if (htmlTemplate.trim() && paletaCores === 'personalizado') {
          return { bg: 'var(--template-bg, #ffffff)', text: 'var(--template-text, #111827)', pri: 'var(--template-pri, #3b82f6)', sec: 'var(--template-sec, #60a5fa)', borda: 'var(--template-border, #e5e7eb)' };
      }
      switch(paletaCores) {
          case 'moderno': return { bg: '#ffffff', text: '#111827', pri: '#2563eb', sec: '#3b82f6', borda: '#e5e7eb' };
          case 'sepia': return { bg: '#fdf6e3', text: '#4a4036', pri: '#8b6d4f', sec: '#c08770', borda: '#e8dccc' };
          case 'dark': return { bg: '#1f2937', text: '#f3f4f6', pri: '#a78bfa', sec: '#8b5cf6', borda: '#374151' };
          case 'personalizado': return { bg: '#ffffff', text: '#111827', pri: '#10b981', sec: '#34d399', borda: '#e5e7eb' };
          default: return { bg: '#ffffff', text: '#1e1914', pri: '#8b6d4f', sec: '#c08770', borda: '#e2e8f0' };
      }
  };

  const purificarHTML = (rawHtml: string) => {
      let clean = rawHtml.replace(/```html/gi, '').replace(/```/gi, '').trim();
      clean = clean.replace(/<script id="editor-magic-script">[\s\S]*?<\/script>/gi, '');
      clean = clean.replace(/<style id="builder-core-styles">[\s\S]*?<\/style>/gi, '');
      clean = clean.replace(/\bbuilder-editing\b/gi, '');
      clean = clean.replace(/cursor:\s*pointer;?/gi, '')
                   .replace(/cursor:\s*text;?/gi, '')
                   .replace(/outline:\s*3px dashed rgb\(79, 70, 229\);?/gi, '')
                   .replace(/outline:\s*1px solid rgb\(203, 213, 225\);?/gi, '')
                   .replace(/outline-offset:\s*-3px;?/gi, '')
                   .replace(/data-old-outline="[^"]*"/gi, '')
                   .replace(/<br\s*\/?>/gi, '') 
                   .replace(/\s*style="\s*"/gi, ''); 
      clean = clean.replace(/ class="\s*"/gi, ''); 
      return clean;
  };

  const getEstilosFormato = (formato: string) => {
      if(formato === '15x21') return { width: '150mm', height: '210mm', padding: '15mm 15mm 15mm 20mm' };
      if(formato === '14x21') return { width: '140mm', height: '210mm', padding: '15mm 15mm 15mm 20mm' };
      return { width: '210mm', height: '297mm', padding: '22mm 20mm 28mm 20mm' };
  };

  const moldarApresentacaoHtml = (rawHtml: string) => {
      let clean = purificarHTML(rawHtml);
      const conf = getEstilosFormato(formatoLivro);
      const paleta = getPaletaObj();
      
      const ebookStyles = `<style>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap');

:root {
    --color-bg: ${paleta.bg};
    --color-text: ${paleta.text};
    --color-primary: ${paleta.pri};
    --color-secondary: ${paleta.sec};
    --color-border: ${paleta.borda};
    --font-heading: ${fontFamily === 'Poppins' ? "'Poppins', sans-serif" : fontFamily === 'Arial' || fontFamily === 'Verdana' ? `'${fontFamily}', sans-serif` : "'Playfair Display', serif"};
    --font-body: ${['Arial', 'Verdana', 'Poppins', 'Lato'].includes(fontFamily) ? `'${fontFamily}', sans-serif` : `'${fontFamily}', serif`};
    --line-spacing: ${espacamentoLinhas};
    --p-spacing: ${espacamentoParagrafo};
    --text-indent: ${recuoParagrafo};
}

body { background-color: #e2e8f0; margin: 0; padding: 2rem 0; display: flex; flex-direction: column; align-items: center; overflow-x: hidden; font-family: var(--font-body); color: var(--color-text); }
#ebook-container { display: flex; flex-direction: column; align-items: center; width: 100%; }

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
    break-after: page;
    page-break-inside: avoid;
    break-inside: avoid;
    word-wrap: break-word;
    overflow-wrap: break-word;
    border: ${tipoBorda === 'single' ? '2px solid var(--color-primary)' : tipoBorda === 'double' ? '6px double var(--color-primary)' : 'none'};
}

/* CAPAS INICIAIS */
.page-cover-img { display: flex; flex-direction: column; justify-content: ${alinhamentoCapitulo}; align-items: center; text-align: center; background: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.9)), url('${imagemCapaUrl}') center/cover no-repeat !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; color: #ffffff; padding: 20mm; box-sizing: border-box; }
.page-cover-img h1 { color: #fff; font-size: 3.5rem; margin-bottom: 1rem; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); }
.page-cover-pura { background: url('${imagemCapaUrl}') center/cover no-repeat !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page-cover-text { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background: var(--color-bg); color: var(--color-primary); padding: 20mm; box-sizing: border-box; border: 4px double var(--color-primary); }
.page-cover-text h1 { font-size: 3.5rem; margin-bottom: 1.5rem; }

/* CAPAS DE CAPÍTULO */
.cap-img-overlay { display: flex; flex-direction: column; justify-content: ${alinhamentoCapitulo}; align-items: center; text-align: center; background: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.8)); background-size: cover !important; background-position: center !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; color: #ffffff; padding: 20mm; box-sizing: border-box; }
.cap-img-overlay h1 { color: #fff; font-size: 2.8rem; margin-top: 15px; }
.cap-icon { font-size: 40px; color: var(--color-secondary); font-family: "Font Awesome 6 Free"; font-weight: 900; margin-bottom: 10px; }

.cap-box-rounded { display: flex; flex-direction: column; justify-content: ${alinhamentoCapitulo}; align-items: center; padding: 20mm; box-sizing: border-box; background-size: cover !important; background-position: center !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.cap-box-inner { background: ${corBoxCapitulo}; padding: 35px 25px; border-radius: 20px; text-align: center; width: 85%; box-shadow: 0 10px 25px rgba(0,0,0,0.2); border: 2px solid var(--color-primary); }
.cap-box-inner h1 { margin:0; font-size: 2.2rem; color: var(--color-primary); }

.cap-img-pura { background-size: cover !important; background-position: center !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

/* CABEÇALHOS E RODAPÉS */
.page-header { position: absolute; top: 10mm; left: 20mm; right: 20mm; display: flex; justify-content: space-between; font-size: 9pt; color: var(--color-primary); border-bottom: 1px solid rgba(139, 109, 79, 0.3); padding-bottom: 5px; font-weight: bold; text-transform: uppercase; z-index: 20; }
.page-footer { position: absolute; bottom: 10mm; left: 20mm; right: 20mm; font-size: 9pt; color: var(--color-primary); z-index: 20; 
    ${estiloRodape === 'linha-superior' ? 'border-top: 1px solid rgba(139, 109, 79, 0.3); padding-top: 5px; display: flex; justify-content: space-between;' : ''}
    ${estiloRodape === 'simples' ? 'display: flex; justify-content: space-between;' : ''}
    ${estiloRodape === 'centralizado' ? 'text-align: center; display: block;' : ''}
}

/* CONTEÚDO BASE (BLINDADO COM !IMPORTANT) */
h1, h2, h3, h4 { font-family: var(--font-heading); color: var(--color-primary); }
h1 { font-weight: 800; font-size: 2.2rem; margin-top: 1.5rem; margin-bottom: 1em; line-height: 1.2; text-align: center; }
h2 { font-weight: 700; font-size: 1.6rem; margin-top: 2rem; margin-bottom: 1em; }

p { font-size: ${tamanhoFonteBase} !important; line-height: var(--line-spacing) !important; margin-top: 0 !important; margin-bottom: var(--p-spacing) !important; text-align: justify !important; text-indent: var(--text-indent) !important; hyphens: auto; -webkit-hyphens: auto; }

blockquote { page-break-inside: avoid; break-inside: avoid; font-style: italic; color: var(--color-text); border-left: 5px solid var(--color-secondary); background: rgba(139, 109, 79, 0.08); padding: 15px 20px; margin: 1.5rem 0; font-size: 11.5pt; font-family: var(--font-heading); border-radius: 0 8px 8px 0; }
.highlight-box { background: rgba(139, 109, 79, 0.15); padding: 15px 20px; border-radius: 8px; margin: 1.5rem 0; font-weight: 500; }

img { max-width: 100%; height: auto; max-height: 40vh; border-radius: 0.5rem; margin: 1.5rem auto; display: block; object-fit: cover; page-break-inside: avoid; break-inside: avoid; }
ul, ol { margin-top: 0; margin-bottom: 1.2em; padding-left: 2rem; font-size: ${tamanhoFonteBase}; line-height: var(--line-spacing); }
li { margin-bottom: 0.5rem; page-break-inside: avoid; }

/* ÍNDICE CEGO (TOC) */
.toc-list { display: flex; flex-direction: column; gap: 10px; width: 100%; margin-top: 2rem; }
.toc-list a { display: flex; justify-content: space-between; text-decoration: none; color: var(--color-text); font-size: 12pt; font-weight: 600; line-height: var(--line-spacing); }
.toc-list a:hover { color: var(--color-secondary); }
.toc-dots { flex-grow: 1; border-bottom: 2px dotted var(--color-primary); margin: 0 10px; position: relative; top: -5px; opacity: 0.3; }

/* SEÇÃO DO AUTOR CENTRALIZADA */
.page-container.author-page { display: flex; align-items: center; justify-content: center; min-height: 100%; }
.author-section { display: flex; align-items: center; gap: 30px; width: 100%; }
.author-section.layout-topo { flex-direction: column; text-align: center; }
.author-section.layout-esquerda { flex-direction: row; text-align: justify; }
.author-photo { object-fit: cover; box-shadow: 0 10px 15px rgba(0,0,0,0.1); flex-shrink: 0; }
.author-photo.circulo { border-radius: 50%; width: 180px; height: 180px; }
.author-photo.retangulo { border-radius: 8px; width: 160px; height: 210px; }
.author-bio { flex: 1; }
.author-bio h2 { margin-top: 0; }

@page { size: ${formatoLivro === 'A4' ? 'A4' : formatoLivro === '15x21' ? '150mm 210mm' : '140mm 210mm'} portrait; margin: 0; }
@media print {
    html, body { background: #ffffff !important; padding: 0 !important; margin: 0 !important; display: block !important; width: ${conf.width} !important; height: auto !important; }
    #ebook-container { width: 100%; padding: 0; margin: 0; }
    .page-container { width: ${conf.width} !important; height: ${conf.height} !important; box-sizing: border-box !important; margin: 0 !important; padding: ${conf.padding} !important; page-break-after: always !important; box-shadow: none !important; overflow: hidden !important; position: relative !important; 
        border: ${tipoBorda === 'single' ? '2px solid var(--color-primary) !important' : tipoBorda === 'double' ? '6px double var(--color-primary) !important' : 'none !important'};
    }
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
    <link href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,400;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
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
  }, [fontFamily, formatoLivro, tamanhoFonteBase, livroTitulo, tipoBorda, tipoCapa, imagemCapaUrl, espacamentoLinhas, espacamentoParagrafo, recuoParagrafo, paletaCores, estiloRodape, alinhamentoCapitulo, corBoxCapitulo, autorPosicao, autorFormato, htmlTemplate]);

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
  }, [fontFamily, formatoLivro, tamanhoFonteBase, livroTitulo, tipoBorda, tipoCapa, imagemCapaUrl, espacamentoLinhas, espacamentoParagrafo, recuoParagrafo, paletaCores, estiloRodape, alinhamentoCapitulo, corBoxCapitulo, autorPosicao, autorFormato, htmlTemplate]);

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

  const transformarEmNode = (novoTag: string, classExtra: string = '') => {
      if(!elementoSelecionado) return;
      const iframe = document.getElementById('previewFrame') as HTMLIFrameElement;
      const newHtml = `<${novoTag} id="${elementoSelecionado.id}" class="${classExtra}">${elementoSelecionado.text}</${novoTag}>`;
      iframe.contentWindow?.postMessage({ type: 'REPLACE_ELEMENT_HTML', id: elementoSelecionado.id, newHtml }, '*');
      setElementoSelecionado(null);
      (window as any).showNotification("Elemento transformado!", "success");
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

  const chamarMotorIA = async (systemInstructionText: string, promptParts: any[], isElementRefinement = false) => {
    setStatusApis({ texto: isElementRefinement ? 'A IA está processando...' : 'A IA está diagramando o E-book...', processing: true });
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
      try { data = JSON.parse(responseText); } catch (err) { throw new Error(`Erro no Servidor (${response.status}): ${responseText.substring(0, 80)}`); }
      if (!data.success) throw new Error(data.error || "Erro retornado pela API.");
      return data;
    } catch (err: any) {
      let errorMsg = err.message;
      if (errorMsg.includes('429') || errorMsg.toLowerCase().includes('quota')) { errorMsg = "Limite excedido (Quota)."; }
      (window as any).showNotification(errorMsg, 'error'); return null;
    } finally { setStatusApis({ texto: 'Aguardando', processing: false }); }
  };

  const aplicarModificacaoGlobal = async () => {
      const input = document.getElementById('ai_prompt_global') as HTMLInputElement;
      const comando = input?.value.trim();
      const codEl = document.getElementById('codigoGerado') as HTMLTextAreaElement;
      
      if(!comando) { (window as any).showNotification("Digite o que deseja alterar no e-book.", "error"); return; }
      if(!codEl || !codEl.value) { (window as any).showNotification("Nenhum E-book gerado para modificar.", "error"); return; }

      const instrucao = `Você é um Revisor Editorial Sênior. 
      Vou fornecer o HTML COMPLETO do E-book atual. Aplique a seguinte alteração global DE FORMA RIGOROSA E OBEDIENTE: "${comando}".
      
      REGRAS MÁXIMAS DE PENALIZAÇÃO SE NÃO CUMPRIDAS: 
      1. Se a ordem remover ou adicionar páginas, VOCÊ DEVE OBRIGATORIAMENTE reajustar a numeração de páginas nos rodapés (.page-footer) de todas as páginas subsequentes.
      2. Se remover/adicionar capítulos, VOCÊ DEVE reescrever a seção do Índice (TOC) para que links e números fiquem exatos.
      3. NUNCA adicione estilos inline <p style="...">.
      4. Mantenha as tags HTML intactas. Devolva TODO O HTML validado.`;

      const resData = await chamarMotorIA(instrucao, [{text: `HTML ATUAL DO E-BOOK:\n${codEl.value}`}], false);

      if(resData && resData.html) {
          let htmlFinal = moldarApresentacaoHtml(purificarHTML(resData.html));
          const prevEl = document.getElementById('previewFrame') as HTMLIFrameElement;
          
          setHistoricoCodigo((prev) => [...prev, codEl.value]); 
          codEl.value = htmlFinal; 
          if (prevEl) prevEl.srcdoc = htmlFinal + SCRIPT_PREVIEW; 
          
          if(input) input.value = '';
          (window as any).showNotification("E-book modificado globalmente com sucesso!", "success");
      }
  };

  const executarGeracaoEbook = async () => {
    const content = productContent.trim();
    if (!content && modoConteudo !== 'prompt') { (window as any).showNotification('Insira ou cole o texto base.', 'error'); return; }

    let regraDesignInspirado = htmlTemplate.trim() && paletaCores === 'personalizado'
        ? `\nCLONAGEM DE DESIGN AVANÇADA (INSPIRAÇÃO NO HTML/CSS FORNECIDO):
Você recebeu o código-fonte de um site como inspiração:
\`\`\`html
${htmlTemplate.substring(0, 3000)}
\`\`\`
SUA TAREFA DE DESIGN:
1. Extraia a paleta de cores principal e adote nas variáveis CSS globais da página gerada.
2. ANALISE A ESTRUTURA: Observe como o site original constrói caixas de destaque, quadros explicativos, citações, elementos circulares ou layouts em formato de blocos/cards.
3. REPLIQUE A ESTÉTICA: Construa as páginas do e-book utilizando as MESMAS lógicas estruturais visuais. Se o site uses caixas arredondadas com sombra suave para destacar tópicos importantes, crie elementos (divs) similares no e-book.
4. IGNORE O TEXTO ORIGINAL DO SITE: Use apenas a arquitetura visual, preenchendo as tags com o conteúdo literário do E-book solicitado.`
        : "";

    let regraCapaHtml = "";
    if (tipoCapa === 'imagem-texto') {
        regraCapaHtml = `<div class="page-container page-cover-img"><h1>${livroTitulo || 'Meu E-book'}</h1><p>Por ${livroAutores || 'Autor'}</p></div>`;
    } else if (tipoCapa === 'imagem-pura') {
        regraCapaHtml = `<div class="page-container page-cover-pura"></div>`;
    } else {
        regraCapaHtml = `<div class="page-container page-cover-text"><h1 style="font-size: 3rem; margin-bottom: 1.5rem; text-transform: uppercase;">${livroTitulo || 'Meu E-book'}</h1><div style="width: 80px; height: 2px; background: var(--color-primary); margin: 0 auto 1.5rem auto;"></div><p style="font-size: 1.3rem; font-style: italic;">Por ${livroAutores || 'Autor'}</p></div>`;
    }

    let regraEstiloCapitulos = "";
    if (estiloCapitulos === 'padrao') {
        regraEstiloCapitulos = `Crie uma página de capa de capítulo exclusiva com a div: <div class="page-container cap-img-overlay" style="background: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.8)), url('INSIRA_URL_IMAGEM_AQUI') center/cover no-repeat;"><div class="cap-icon">&#xf02d;</div><h1>Título do Capítulo</h1></div>`;
    } else if (estiloCapitulos === 'box-arredondado') {
        regraEstiloCapitulos = `Crie uma página de capa de capítulo exclusiva com a div: <div class="page-container cap-box-rounded" style="background: url('INSIRA_URL_IMAGEM_AQUI') center/cover no-repeat;"><div class="cap-box-inner"><h1 style="margin:0; font-size: 2.2rem;">Título do Capítulo</h1></div></div>`;
    } else if (estiloCapitulos === 'imagem-pura') {
        regraEstiloCapitulos = `Crie uma página EXCLUSIVA contendo APENAS a imagem pura de abertura do capítulo, usando: <div class="page-container cap-img-pura" style="background: url('INSIRA_URL_IMAGEM_AQUI') center/cover no-repeat;"></div>`;
    } else {
        regraEstiloCapitulos = `Estilo Inline: Adicione o título do capítulo no topo da página de conteúdo (.page-container) seguido pela imagem e parágrafos, sem página exclusiva.`;
    }

    let regraRodape = "";
    if (estiloRodape === 'simples' || estiloRodape === 'linha-superior') regraRodape = `<span>${livroAutores}</span><span>5</span>`;
    else regraRodape = `<span>5</span>`;

    const instrucaoSistema = `Atue como um Escritor Bestseller e Especialista Editorial Rigoroso. Gere um E-book perfeito num ÚNICO HTML.
DADOS DO PROJETO: ${livroTitulo} por ${livroAutores} ${regraDesignInspirado}

DIRETRIZES MÁXIMAS DE PENALIZAÇÃO (CUMPRA ESTAS REGRAS ESTRITAMENTE OU O SISTEMA FALHARÁ):
1. MODO DE TEXTO: ${modoConteudo === 'expandido' ? 'Expanda o texto de forma exaustiva.' : modoConteudo === 'rigoroso' ? 'Corrija ortografia rigorosamente, sem alterar sentido.' : 'Crie um e-book monumental pelo prompt.'}
2. DENSIDADE OBRIGATÓRIA E TAMANHO DE CAPÍTULO: Para CADA capítulo, você DEVE gerar texto abundante e preencher MÚLTIPLAS divs .page-container separadas. É PROIBIDO criar capítulos de apenas 1 página. Preencha todo o espaço da folha de forma orgânica.
3. ÍNDICE (TOC) OBRIGAÇÕES EXATAS: 
   - A estrutura HTML do índice DEVE SER EXATAMENTE esta: <div class="toc-list"><a href="#cap-1"><span>Nome do Capítulo</span><span class="toc-dots"></span><span>Número</span></a></div>
   - O Índice DEVE ficar em UMA ÚNICA página (.page-container) se tiver menos de 20 itens. NÃO divida o índice sem necessidade.
   - É ESTRITAMENTE PROIBIDO usar títulos como "Continuação" ou "Parte 2" no índice. Se precisar quebrar página, apenas feche a <div class="page-container"> e abra uma nova para continuar a lista.
4. ESTILO DOS CAPÍTULOS: ${regraEstiloCapitulos}
5. CITAÇÕES (QUOTES): NUNCA escreva o nome do autor dentro das tags <blockquote> ou ao final delas. Apenas a citação pura.
6. PÁGINA DO AUTOR OBRIGATÓRIA: Crie no final do livro UMA UNICA <div class="page-container author-page"> contendo: <div class="author-section layout-${autorPosicao}"><img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80" class="author-photo ${autorFormato}" alt="Autor"><div class="author-bio"><h2>Sobre o Autor</h2><p>Escreva uma biografia inspiradora e robusta.</p></div></div></div>.
7. IMAGENS REAIS: Use URLs Unsplash reais. Exclusivamente fotografias reais de humanos.
8. CABEÇALHOS/RODAPÉS: Use <div class="page-header"><span>${livroTitulo}</span><span>Capítulo X</span></div> e <div class="page-footer">${regraRodape}</div> (NUNCA escreva a palavra "página" perto do número).
9. PROIBIÇÃO DE ESTILOS INLINE: É ESTRITAMENTE PROIBIDO adicionar 'style="margin:..."' , '<br>' ou espaçamentos diretamente nas tags <p> ou <h2>. O CSS global do sistema cuidará dos parágrafos automaticamente! Se você quebrar essa regra, o e-book ficará deformado.
10. INICIO DA ESTRUTURA HTML EXIGIDA:
   - ${regraCapaHtml}
   - Índice ancorado perfeitamente.
   - Páginas de capítulos longos e detalhados.`;

    const data = await chamarMotorIA(instrucaoSistema, [{ text: `TEXTO BASE:\n"""\n${content || 'Gerar E-book'}\n"""` }], false);
    
    if (data && data.html) {
        const codEl = document.getElementById('codigoGerado') as HTMLTextAreaElement;
        const prevEl = document.getElementById('previewFrame') as HTMLIFrameElement;
        let htmlFinal = moldarApresentacaoHtml(purificarHTML(data.html));
        if (codEl) { setHistoricoCodigo((prev) => [...prev, codEl.value]); codEl.value = htmlFinal; }
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

    (window as any).baixarPdf = () => {
        const iframe = document.getElementById('previewFrame') as HTMLIFrameElement;
        if(iframe && iframe.contentWindow) { iframe.contentWindow.print(); }
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

      <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

      {statusApis.processing && (
          <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center">
              <div className="w-14 h-14 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-5"></div>
              <p className="text-slate-800 font-black text-xl tracking-tight mb-2">{statusApis.texto}</p>
              <p className="text-slate-500 font-medium text-sm">Organizando estrutura e conteúdo editorial...</p>
          </div>
      )}

      {/* PAINEL LATERAL ESQUERDO */}
      <aside className="w-[380px] bg-white border-r border-slate-200 flex flex-col h-full z-10 flex-shrink-0 shadow-sm">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h1 className="text-xl font-black tracking-tight text-slate-800 flex items-center">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center mr-2.5 text-white shadow-md shadow-indigo-200"><i className="fas fa-book-open text-xs"></i></div>
                  E-book<span className="text-indigo-600">Pro</span>
              </h1>
              <button onClick={toggleInspetor} className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${modoInspetor ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                  <i className={`fas fa-pen-nib ${modoInspetor ? 'animate-pulse text-yellow-300' : ''}`}></i> {modoInspetor ? 'Editor Inteligente' : 'Modo Editor'}
              </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
              {modoInspetor ? (
                  <div className="animate-[fadeIn_0.2s_ease]">
                      <div className="bg-indigo-600 text-white p-4 text-[11px] font-black tracking-widest uppercase flex justify-between items-center shadow-inner">
                          <span>Mestre Editorial (IA)</span>
                          <i className="fas fa-magic text-indigo-300"></i>
                      </div>

                      {/* COMANDO GLOBAL (EX: EXCLUIR PÁGINA) */}
                      <div className="p-4 bg-indigo-50 border-b border-indigo-100 shadow-sm">
                          <label className="input-label text-indigo-900 mb-2"><i className="fas fa-bolt mr-1 text-yellow-500"></i> Modificação Global no E-book</label>
                          <textarea id="ai_prompt_global" rows={2} className="input-standard text-xs mb-2 border-indigo-200 shadow-inner" placeholder="Ex: Remova o capítulo 2 e reajuste a numeração inteira e o índice."></textarea>
                          <button onClick={aplicarModificacaoGlobal} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase tracking-wide py-2.5 rounded-lg transition shadow-sm">Aplicar no Livro Inteiro</button>
                      </div>

                      {!elementoSelecionado ? (
                          <div className="flex flex-col items-center justify-center p-14 text-center text-slate-400">
                              <div className="w-16 h-16 rounded-full bg-white border-2 border-dashed border-slate-200 flex items-center justify-center mb-4 shadow-sm">
                                  <i className="fas fa-hand-pointer text-2xl text-indigo-300"></i>
                              </div>
                              <p className="text-sm font-bold text-slate-600 mb-1">Selecione para Revisar</p>
                              <p className="text-xs font-medium text-slate-400">Clique em textos, títulos ou imagens de fundo na página ao lado para ajustar detalhes específicos.</p>
                          </div>
                      ) : (
                          <div className="pb-10 bg-white">
                              <div className="panel-section bg-slate-50/50">
                                  <div className="flex justify-between items-center mb-3">
                                      <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-md shadow-sm">Tag: {elementoSelecionado.tagName}</span>
                                      <div className="flex gap-2">
                                          {(elementoSelecionado.tagName === 'img' || elementoSelecionado.bgImage) && (
                                              <button onClick={() => imageInputRef.current?.click()} className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 transition flex items-center bg-indigo-50 border border-indigo-200 px-2 py-1 rounded shadow-sm"><i className="fas fa-upload mr-1"></i> Trocar Fundo</button>
                                          )}
                                          <button onClick={() => {
                                              let el = document.getElementById('previewFrame') as HTMLIFrameElement;
                                              el.contentWindow?.postMessage({ type: 'DELETE_ELEMENT', id: elementoSelecionado.id }, '*');
                                          }} className="text-[9px] font-bold text-red-500 hover:text-red-700 transition flex items-center bg-red-50 border border-red-200 hover:border-red-400 px-2 py-1 rounded shadow-sm"><i className="fas fa-trash-alt mr-1"></i> Apagar</button>
                                      </div>
                                  </div>

                                  {elementoSelecionado.tagName === 'img' || elementoSelecionado.bgImage ? (
                                      <div className="space-y-3">
                                          <div>
                                              <label className="input-label mb-1">Buscar URL (Unsplash)</label>
                                              <input type="text" value={elementoSelecionado.src || elementoSelecionado.bgImage} onChange={(e) => atualizarElemento(elementoSelecionado.tagName === 'img' ? 'src' : 'bgImage', e.target.value)} className="input-standard text-xs" />
                                          </div>
                                          {elementoSelecionado.tagName === 'img' && (
                                              <div className="grid grid-cols-2 gap-2">
                                                  <div>
                                                      <label className="input-label mb-1">Largura</label>
                                                      <input type="text" value={elementoSelecionado.width || ''} placeholder="Ex: 100%" onChange={(e) => atualizarElemento('width', e.target.value)} className="input-standard text-xs" />
                                                  </div>
                                                  <div>
                                                      <label className="input-label mb-1">Altura</label>
                                                      <input type="text" value={elementoSelecionado.height || ''} placeholder="Ex: auto" onChange={(e) => atualizarElemento('height', e.target.value)} className="input-standard text-xs" />
                                                  </div>
                                              </div>
                                          )}
                                      </div>
                                  ) : (
                                      <div>
                                          <label className="input-label mb-2">Edição de Texto</label>
                                          <textarea rows={5} value={elementoSelecionado.text} onChange={(e) => atualizarElemento('text', e.target.value, true)} className="input-standard resize-y shadow-inner text-sm leading-relaxed font-serif"></textarea>
                                          
                                          {/* FERRAMENTAS DE HIGHLIGHT E QUOTE */}
                                          <div className="mt-3 flex gap-2">
                                              <button onClick={() => transformarEmNode('blockquote')} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[9px] uppercase py-2 rounded border border-slate-300 transition"><i className="fas fa-quote-right mr-1"></i> Virar Citação</button>
                                              <button onClick={() => transformarEmNode('div', 'highlight-box')} className="flex-1 bg-yellow-50 hover:bg-yellow-100 text-yellow-800 font-bold text-[9px] uppercase py-2 rounded border border-yellow-200 transition"><i className="fas fa-highlighter mr-1"></i> Destacar Fundo</button>
                                          </div>
                                      </div>
                                  )}
                              </div>

                              {elementoSelecionado.tagName !== 'img' && (
                                  <div className="panel-section grid grid-cols-2 gap-4 border-t border-slate-100">
                                      <div>
                                          <label className="input-label mb-2 text-[9px]">Cor Fundo (Box)</label>
                                          <input type="color" value={elementoSelecionado.bgColor || '#ffffff'} onChange={(e) => atualizarElemento('bgColor', e.target.value)} className="w-full h-8 rounded cursor-pointer border-none" />
                                      </div>
                                      <div>
                                          <div className="flex justify-between items-center mb-2">
                                              <label className="input-label mb-0 text-[9px]">Tamanho Fonte</label>
                                              <span className="text-[10px] font-bold text-indigo-600">{elementoSelecionado.fontSize || 16}px</span>
                                          </div>
                                          <input type="range" min="10" max="60" value={elementoSelecionado.fontSize || 16} onChange={(e) => atualizarElemento('fontSize', parseInt(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-2" />
                                      </div>
                                  </div>
                              )}
                              
                              {/* ALINHAMENTO FIXADO COM CONTRASTE */}
                              {elementoSelecionado.tagName !== 'img' && (
                                <div className="panel-section border-t border-slate-100">
                                    <label className="input-label mb-2 text-[9px]">Alinhamento</label>
                                    <div className="flex bg-slate-100 rounded-lg border border-slate-200 p-1">
                                        <button onClick={() => atualizarElemento('textAlign', 'text-left')} className={`flex-1 h-8 flex items-center justify-center rounded text-sm transition-all duration-200 ${elementoSelecionado.textAlign === 'text-left' ? 'bg-indigo-600 shadow-md text-white font-bold' : 'text-slate-600 hover:bg-slate-200'}`}><i className="fas fa-align-left"></i></button>
                                        <button onClick={() => atualizarElemento('textAlign', 'text-center')} className={`flex-1 h-8 flex items-center justify-center rounded text-sm transition-all duration-200 ${elementoSelecionado.textAlign === 'text-center' ? 'bg-indigo-600 shadow-md text-white font-bold' : 'text-slate-600 hover:bg-slate-200'}`}><i className="fas fa-align-center"></i></button>
                                        <button onClick={() => atualizarElemento('textAlign', 'text-right')} className={`flex-1 h-8 flex items-center justify-center rounded text-sm transition-all duration-200 ${elementoSelecionado.textAlign === 'text-right' ? 'bg-indigo-600 shadow-md text-white font-bold' : 'text-slate-600 hover:bg-slate-200'}`}><i className="fas fa-align-right"></i></button>
                                        <button onClick={() => atualizarElemento('textAlign', 'text-justify')} className={`flex-1 h-8 flex items-center justify-center rounded text-sm transition-all duration-200 ${elementoSelecionado.textAlign === 'text-justify' ? 'bg-indigo-600 shadow-md text-white font-bold' : 'text-slate-600 hover:bg-slate-200'}`}><i className="fas fa-align-justify"></i></button>
                                    </div>
                                </div>
                              )}
                          </div>
                      )}
                  </div>
              ) : (
                  <div className="p-5 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                      {/* CONFIGURAÇÕES DE DESIGN GERAL */}
                      <div>
                          <h3 className="text-xs font-black uppercase text-slate-800 mb-3.5 tracking-wide flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-500">1</span> Capa & Design Geral</h3>
                          <div className="space-y-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                              <div>
                                  <label className="input-label mb-2">Tamanho do Livro</label>
                                  <select value={formatoLivro} onChange={(e) => setFormatoLivro(e.target.value as any)} className="input-standard font-bold text-indigo-700 bg-indigo-50">
                                      <option value="A4">A4 (Digital Clássico)</option>
                                      <option value="15x21">15x21cm (Padrão Impresso)</option>
                                      <option value="14x21">14x21cm (Livro de Bolso)</option>
                                  </select>
                              </div>

                              <div className="pt-3 border-t border-slate-100">
                                  <label className="input-label mb-2">Paleta de Cores</label>
                                  <select value={paletaCores} onChange={(e) => setPaletaCores(e.target.value as any)} className="input-standard font-medium text-slate-800">
                                      <option value="classico">Clássico (Branco & Marrom)</option>
                                      <option value="moderno">Moderno (Branco & Azul Vivo)</option>
                                      <option value="sepia">Sépia Literário (Creme & Marrom)</option>
                                      <option value="dark">Dark Elegante (Grafite & Roxo)</option>
                                      <option value="personalizado">Personalizado (Inspirado no HTML abaixo)</option>
                                  </select>
                              </div>

                              {paletaCores === 'personalizado' && (
                                  <div className="pt-3 border-t border-slate-100">
                                      <label className="input-label mb-2 text-indigo-600"><i className="fas fa-magic mr-1"></i> Template de Inspiração (Cole HTML/CSS)</label>
                                      <textarea 
                                          value={htmlTemplate} 
                                          onChange={(e) => setHtmlTemplate(e.target.value)} 
                                          className="input-standard h-24 resize-y text-[10px] font-mono border-indigo-200 shadow-inner" 
                                          placeholder="Cole o código-fonte de um site aqui. A IA extrairá as cores e replicará elementos como quadros e círculos (ignorando o texto original)..."
                                      ></textarea>
                                  </div>
                              )}

                              <div className="pt-3 border-t border-slate-100">
                                  <label className="input-label mb-2">Buscar Imagem por Termo (Unsplash)</label>
                                  <div className="flex gap-2">
                                      <input type="text" id="termoBuscaImg" placeholder="Ex: business, nature..." className="input-standard text-xs" />
                                      <button onClick={() => {
                                          const termo = (document.getElementById('termoBuscaImg') as HTMLInputElement).value || 'abstract';
                                          setImagemCapaUrl(`https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80&query=${termo}`);
                                          (window as any).showNotification("Nova imagem buscada!", "success");
                                      }} className="bg-indigo-600 text-white font-bold text-xs px-3 py-2 rounded-lg"><i className="fas fa-search"></i></button>
                                  </div>
                              </div>

                              {(tipoCapa === 'imagem-texto' || tipoCapa === 'imagem-pura') && (
                                  <div className="pt-3 border-t border-slate-100">
                                      <label className="input-label mb-2">Imagem de Capa</label>
                                      <button onClick={() => imageInputRef.current?.click()} className="w-full bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 rounded-lg transition">Carregar do PC</button>
                                  </div>
                              )}

                              <div className="pt-3 border-t border-slate-100">
                                  <label className="input-label mb-2">Bordas das Páginas</label>
                                  <select value={tipoBorda} onChange={(e) => setTipoBorda(e.target.value as any)} className="input-standard font-medium text-slate-800">
                                      <option value="none">Sem Borda (Clean)</option>
                                      <option value="single">Borda Simples (Elegante)</option>
                                      <option value="double">Borda Dupla (Clássico Premium)</option>
                                  </select>
                              </div>

                              <div className="pt-3 border-t border-slate-100">
                                  <label className="input-label mb-2">Estilo do Rodapé</label>
                                  <select value={estiloRodape} onChange={(e) => setEstiloRodape(e.target.value as any)} className="input-standard font-medium text-slate-800">
                                      <option value="simples">Simples (Autor esq. | Número dir.)</option>
                                      <option value="linha-superior">Com Linha Superior de Divisão</option>
                                      <option value="centralizado">Minimalista (Apenas Número Centralizado)</option>
                                  </select>
                              </div>
                          </div>
                      </div>

                      {/* LAYOUT DE CAPITULOS E AUTOR */}
                      <div>
                          <h3 className="text-xs font-black uppercase text-slate-800 mb-3.5 tracking-wide flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-500">2</span> Capítulos & Autor</h3>
                          <div className="space-y-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                              <div>
                                  <label className="input-label mb-2">Títulos de Capítulo</label>
                                  <select value={estiloCapitulos} onChange={(e) => setEstiloCapitulos(e.target.value as any)} className="input-standard font-medium text-slate-800">
                                      <option value="padrao">Página Exclusiva (Imagem Fundo + Texto + Ícone)</option>
                                      <option value="box-arredondado">Página Exclusiva (Imagem + Box Branco Arredondado)</option>
                                      <option value="imagem-pura">Página Exclusiva (Apenas a Imagem s/ texto)</option>
                                      <option value="inline">Texto Contínuo (Sem página exclusiva)</option>
                                  </select>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                                  <div>
                                      <label className="input-label mb-2 text-[9px]">Alinhamento do Título</label>
                                      <select value={alinhamentoCapitulo} onChange={(e) => setAlinhamentoCapitulo(e.target.value as any)} className="input-standard text-[10px] font-medium text-slate-800">
                                          <option value="flex-start">Topo</option>
                                          <option value="center">Centro</option>
                                          <option value="flex-end">Base</option>
                                      </select>
                                  </div>
                                  <div>
                                      <label className="input-label mb-2 text-[9px]">Cor Fundo (Box Arredondado)</label>
                                      <input type="color" value={corBoxCapitulo === 'rgba(255, 255, 255, 0.95)' ? '#ffffff' : corBoxCapitulo} onChange={(e) => setCorBoxCapitulo(e.target.value)} className="w-full h-8 rounded border-none cursor-pointer" />
                                  </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                                  <div>
                                      <label className="input-label mb-2 text-[9px]">Posição (Foto do Autor)</label>
                                      <select value={autorPosicao} onChange={(e) => setAutorPosicao(e.target.value as any)} className="input-standard text-[10px] font-medium text-slate-800">
                                          <option value="esquerda">Lateral Esquerda</option>
                                          <option value="topo">No Topo (Centro)</option>
                                      </select>
                                  </div>
                                  <div>
                                      <label className="input-label mb-2 text-[9px]">Formato (Foto Autor)</label>
                                      <select value={autorFormato} onChange={(e) => setAutorFormato(e.target.value as any)} className="input-standard text-[10px] font-medium text-slate-800">
                                          <option value="circulo">Círculo</option>
                                          <option value="retangulo">Retângulo</option>
                                      </select>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* TIPOGRAFIA E ESPAÇAMENTOS */}
                      <div>
                          <h3 className="text-xs font-black uppercase text-slate-800 mb-3.5 tracking-wide flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-500">3</span> Tipografia</h3>
                          <div className="space-y-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                              <div>
                                  <label className="input-label mb-2">Fonte do Livro</label>
                                  <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="input-standard font-medium text-slate-800">
                                      <option value="Lato">Lato (Moderna/Versátil)</option>
                                      <option value="Arial">Arial (Padrão e Limpa)</option>
                                      <option value="Verdana">Verdana (Muito Legível)</option>
                                      <option value="Poppins">Poppins (Moderna e Arredondada)</option>
                                      <option value="Merriweather">Merriweather (Leitura Longa)</option>
                                      <option value="EB Garamond">EB Garamond (Clássico)</option>
                                  </select>
                              </div>

                              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                                  <div>
                                      <label className="input-label mb-2 text-[9px]">Tamanho Fonte Base</label>
                                      <select value={tamanhoFonteBase} onChange={(e) => setTamanhoFonteBase(e.target.value)} className="input-standard text-[10px] font-medium text-slate-800">
                                          <option value="11pt">11pt</option><option value="12pt">12pt</option><option value="14pt">14pt</option><option value="16pt">16pt</option>
                                      </select>
                                  </div>
                                  <div>
                                      <label className="input-label mb-2 text-[9px]">Entrelinhas</label>
                                      <select value={espacamentoLinhas} onChange={(e) => setEspacamentoLinhas(e.target.value)} className="input-standard text-[10px] font-medium text-slate-800">
                                          <option value="1.0">Simples (1.0)</option>
                                          <option value="1.15">Justo (1.15)</option>
                                          <option value="1.5">Padrão (1.5)</option>
                                          <option value="2.0">Duplo (2.0)</option>
                                      </select>
                                  </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                                  <div>
                                      <label className="input-label mb-2 text-[9px]">Espaço (Fim Parágrafo)</label>
                                      <select value={espacamentoParagrafo} onChange={(e) => setEspacamentoParagrafo(e.target.value)} className="input-standard text-[10px] font-medium text-slate-800">
                                          <option value="1em">Colado (1em)</option>
                                          <option value="1.5em">Normal (1.5em)</option>
                                          <option value="2.2em">Afastado (2.2em)</option>
                                      </select>
                                  </div>
                                  <div>
                                      <label className="input-label mb-2 text-[9px]">Recuo 1ª Linha</label>
                                      <select value={recuoParagrafo} onChange={(e) => setRecuoParagrafo(e.target.value)} className="input-standard text-[10px] font-medium text-slate-800">
                                          <option value="20px">Clássico (20px)</option>
                                          <option value="0px">Sem Recuo</option>
                                          <option value="40px">Largo (40px)</option>
                                      </select>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* CONTEÚDO */}
                      <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-sm flex flex-col">
                          <div className="mb-4">
                              <label className="input-label text-indigo-800">Motor de Inteligência (IA)</label>
                              <select value={textEngine} onChange={(e) => setTextEngine(e.target.value as any)} className="input-standard font-bold text-slate-700 bg-white">
                                  <option value="gemini">Google Gemini (Gemini 3.6 Flash)</option>
                                  <option value="groq">Groq Llama 3 (Llama 3.3)</option>
                              </select>
                          </div>
                          <h3 className="text-xs font-black uppercase text-indigo-900 mb-3 tracking-wide flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">4</span> Geração Editorial</h3>
                          
                          <div className="mb-4">
                              <label className="input-label text-indigo-800">Título do E-book</label>
                              <input type="text" value={livroTitulo} onChange={e => setLivroTitulo(e.target.value)} className="input-standard text-sm" placeholder="Ex: O Poder da Mente" />
                          </div>
                          
                          <div className="mb-4">
                              <label className="input-label text-indigo-800">Autor(es)</label>
                              <input type="text" value={livroAutores} onChange={e => setLivroAutores(e.target.value)} className="input-standard text-sm" placeholder="Ex: João Silva" />
                          </div>

                          <div className="mb-4">
                              <label className="input-label text-indigo-800">Modo de Geração</label>
                              <select value={modoConteudo} onChange={(e) => setModoConteudo(e.target.value as any)} className="input-standard font-bold text-indigo-700 bg-white mb-2">
                                  <option value="expandido">Expandir e Enriquecer Textos com IA</option>
                                  <option value="rigoroso">Rigoroso (Apenas corrigir ortografia)</option>
                                  <option value="prompt">Criar 100% do Zero via Prompt</option>
                              </select>
                          </div>

                          <div className="mb-4 flex items-center justify-between bg-white p-3 rounded-lg border border-indigo-100">
                              <label className="input-label mb-0 cursor-pointer text-indigo-900">Incluir Introdução e Conclusão</label>
                              <input type="checkbox" checked={incluirIntroConclusao} onChange={(e) => setIncluirIntroConclusao(e.target.checked)} className="w-4 h-4 accent-indigo-600 rounded cursor-pointer" />
                          </div>

                          <div className="mb-4">
                              <label className="input-label text-indigo-800 mb-2">Texto Base ou Prompt de Comando</label>
                              <textarea 
                                  value={productContent} 
                                  onChange={(e) => setProductContent(e.target.value)} 
                                  className="input-standard h-36 resize-y leading-relaxed text-sm p-4 rounded-xl border-indigo-200 shadow-inner font-serif" 
                                  placeholder="Cole as dezenas de páginas aqui, ou digite o tema que a IA criará sozinha..."
                              ></textarea>
                          </div>

                          <div className="flex flex-col gap-2 mt-auto">
                              <button onClick={() => executarGeracaoEbook()} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 text-xs flex items-center justify-center gap-2">
                                  <i className="fas fa-file-alt text-yellow-300 text-lg"></i> Gerar Livro Completo
                              </button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      </aside>

      {/* ÁREA PRINCIPAL - CANVAS EDITORIAL */}
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
                  <button onClick={() => (window as any).baixarPdf()} className="px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-xs uppercase tracking-wide rounded-lg transition flex items-center shadow-sm">
                      <i className="fas fa-file-pdf mr-1.5"></i> Salvar PDF
                  </button>
              </div>
          </div>
          
          <div className="flex-grow relative bg-slate-200 p-0 md:p-8 overflow-y-auto overflow-x-hidden flex justify-center items-start custom-scrollbar">
              <iframe id="previewFrame" className="w-full min-h-full border-none active bg-transparent" sandbox="allow-scripts allow-same-origin allow-modals" title="Leitor do Ebook"></iframe>
              
              <div id="codigoContainer" className="absolute inset-0 bg-[#0d1117] hidden">
                  <textarea id="codigoGerado" className="w-full h-full font-mono text-[13px] bg-[#0d1117] text-[#56d364] border-none outline-none resize-none custom-scrollbar p-8 leading-relaxed"
                      onChange={(e) => {
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