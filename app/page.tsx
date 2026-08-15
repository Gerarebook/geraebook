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

    function autoUpdatePages() {
        const pages = Array.from(document.querySelectorAll('.page-container'));
        const tocItems = document.querySelectorAll('.toc-item');
        tocItems.forEach(item => {
            const href = item.getAttribute('href');
            if(!href || !href.startsWith('#')) return;
            const target = document.getElementById(href.substring(1));
            if(target) {
                const page = target.closest('.page-container');
                if(page) {
                    const pageIndex = pages.indexOf(page) + 1;
                    const spans = item.querySelectorAll('span');
                    if(spans.length >= 3) {
                        spans[2].innerText = pageIndex; 
                    }
                }
            }
        });
    }

    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(autoUpdatePages, 500); 
    });

    function sendCleanHtml() {
        autoUpdatePages(); 
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
                        el.style.setProperty('background-image', \`url('\${event.data.bgImage}')\`, 'important');
                        el.style.setProperty('background-size', 'cover', 'important');
                        el.style.setProperty('background-position', 'center', 'important');
                    }
                }

                if(event.data.rawBgImage !== undefined) {
                    el.style.setProperty('background-image', event.data.rawBgImage, 'important');
                    el.style.setProperty('background-size', 'cover', 'important');
                    el.style.setProperty('background-position', 'center', 'important');
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
  const [historicoCodigo, setHistoricoCodigo] = useState<string[]>([]);
  const [textEngine, setTextEngine] = useState<'gemini' | 'groq'>('gemini'); 
  const [modoInspetor, setModoInspetor] = useState(false);
  const [elementoSelecionado, setElementoSelecionado] = useState<any>(null);
  const [statusApis, setStatusApis] = useState<{ texto: string; processing: boolean }>({ texto: 'Aguardando Operação', processing: false });

  const [formatoLivro, setFormatoLivro] = useState<'A4' | '15x21' | '14x21'>('A4');
  const [fontFamily, setFontFamily] = useState('Lato');
  const [tamanhoFonteBase, setTamanhoFonteBase] = useState('14pt');
  const [espacamentoLinhas, setEspacamentoLinhas] = useState('1.5');
  const [espacamentoParagrafo, setEspacamentoParagrafo] = useState('0.8em'); 
  const [recuoParagrafo, setRecuoParagrafo] = useState('20px');
  
  const [tipoBorda, setTipoBorda] = useState<'none' | 'single' | 'double'>('none');
  const [tipoCapa, setTipoCapa] = useState<'imagem-texto' | 'imagem-pura' | 'texto'>('imagem-texto');
  const [imagemCapaUrl, setImagemCapaUrl] = useState('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80');
  const [htmlTemplate, setHtmlTemplate] = useState('');

  const [paletaCores, setPaletaCores] = useState<'classico' | 'moderno' | 'sepia' | 'dark' | 'personalizado' | 'manual'>('classico');
  const [corManualPri, setCorManualPri] = useState('#2563eb');
  const [corManualSec, setCorManualSec] = useState('#3b82f6');
  const [corManualText, setCorManualText] = useState('#111827');
  const [corManualBg, setCorManualBg] = useState('#ffffff');

  const [estiloCapitulos, setEstiloCapitulos] = useState<'padrao' | 'box-arredondado' | 'imagem-pura' | 'inline-imagem' | 'inline'>('inline-imagem');
  const [alinhamentoCapitulo, setAlinhamentoCapitulo] = useState<'center' | 'flex-start' | 'flex-end'>('center');
  const [corBoxCapitulo, setCorBoxCapitulo] = useState('rgba(255, 255, 255, 0.95)');
  const [estiloRodape, setEstiloRodape] = useState<'simples' | 'linha-superior' | 'centralizado'>('simples');
  const [autorPosicao, setAutorPosicao] = useState<'esquerda' | 'topo'>('esquerda');
  const [autorFormato, setAutorFormato] = useState<'circulo' | 'retangulo'>('circulo');

  const [livroTitulo, setLivroTitulo] = useState('');
  const [livroAutores, setLivroAutores] = useState('');
  const [productContent, setProductContent] = useState('');
  const [modoConteudo, setModoConteudo] = useState<'prompt' | 'rigoroso' | 'expandido'>('expandido');

  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const verificarAcesso = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/login'; }
    };
    verificarAcesso();
  }, []);

  function getPaletaObj() {
      if (paletaCores === 'manual') return { bg: corManualBg, text: corManualText, pri: corManualPri, sec: corManualSec, borda: '#e5e7eb' };
      if (htmlTemplate.trim() && paletaCores === 'personalizado') return { bg: 'var(--template-bg, #ffffff)', text: 'var(--template-text, #111827)', pri: 'var(--template-pri, #3b82f6)', sec: 'var(--template-sec, #60a5fa)', borda: 'var(--template-border, #e5e7eb)' };
      switch(paletaCores) {
          case 'moderno': return { bg: '#ffffff', text: '#111827', pri: '#2563eb', sec: '#3b82f6', borda: '#e5e7eb' };
          case 'sepia': return { bg: '#fdf6e3', text: '#4a4036', pri: '#8b6d4f', sec: '#c08770', borda: '#e8dccc' };
          case 'dark': return { bg: '#1f2937', text: '#f3f4f6', pri: '#a78bfa', sec: '#8b5cf6', borda: '#374151' };
          case 'personalizado': return { bg: '#ffffff', text: '#111827', pri: '#10b981', sec: '#34d399', borda: '#e5e7eb' };
          default: return { bg: '#ffffff', text: '#1e1914', pri: '#8b6d4f', sec: '#c08770', borda: '#e2e8f0' };
      }
  }

  function purificarHTML(rawHtml: string) {
      let clean = rawHtml;
      const markdownMatch = clean.match(/```html([\s\S]*?)```/i);
      if (markdownMatch) clean = markdownMatch[1];
      clean = clean.replace(/```html/gi, '').replace(/```/gi, '').trim();

      clean = clean.replace(/<script id="editor-magic-script">[\s\S]*?<\/script>/gi, '');
      clean = clean.replace(/<style id="builder-core-styles">[\s\S]*?<\/style>/gi, '');
      clean = clean.replace(/\bbuilder-editing\b/gi, '');
      clean = clean.replace(/cursor:\s*pointer;?/gi, '').replace(/cursor:\s*text;?/gi, '').replace(/outline:\s*3px dashed rgb\(79, 70, 229\);?/gi, '').replace(/outline:\s*1px solid rgb\(203, 213, 225\);?/gi, '').replace(/outline-offset:\s*-3px;?/gi, '').replace(/data-old-outline="[^"]*"/gi, '').replace(/\s*style="\s*"/gi, ''); 
      clean = clean.replace(/ class="\s*"/gi, ''); 

      clean = clean.replace(/<br\s*\/?>/gi, ''); 
      clean = clean.replace(/<p>\s*<\/p>/gi, ''); 
      clean = clean.replace(/<p>&nbsp;<\/p>/gi, ''); 
      clean = clean.replace(/<p>\s*&nbsp;\s*<\/p>/gi, ''); 
      clean = clean.replace(/<span class="page-number">[^<]*<\/span>/gi, '<span class="page-number"></span>');
      clean = clean.replace(/<p>\s*<a class="toc-item"/gi, '<a class="toc-item"');
      clean = clean.replace(/<\/a>\s*<\/p>/gi, '</a>');
      clean = clean.replace(/<p>\s*<div class="toc-container"/gi, '<div class="toc-container"');
      clean = clean.replace(/<\/div>\s*<\/p>/gi, '</div>');
      clean = clean.replace(/<div class="page-container[^>]*>[\s\n\r]*(<div class="page-header"[^>]*>.*?<\/div>)?[\s\n\r]*(<div class="page-footer"[^>]*>.*?<\/div>)?[\s\n\r]*<\/div>/gi, '');

      return clean.trim();
  }

  function getEstilosFormato(formato: string) {
      if(formato === '15x21') return { width: '150mm', height: '210mm', padding: '42mm 18mm 22mm 18mm' }; 
      if(formato === '14x21') return { width: '140mm', height: '210mm', padding: '42mm 18mm 22mm 18mm' };
      return { width: '210mm', height: '297mm', padding: '42mm 18mm 22mm 18mm' }; 
  }

  function moldarApresentacaoHtml(rawHtml: string) {
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

body { 
    background-color: #e2e8f0; margin: 0; padding: 2rem 0; display: flex; flex-direction: column; align-items: center; 
    font-family: var(--font-body); color: var(--color-text); 
    counter-reset: ebook-page; 
}

#ebook-container { display: flex; flex-direction: column; align-items: center; width: 100%; }

.page-container {
    background-color: var(--color-bg);
    width: ${conf.width};
    height: ${conf.height};
    max-height: ${conf.height};
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
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    counter-increment: ebook-page;
}

.page-container::after {
    content: '';
    position: absolute;
    top: 6mm; left: 6mm; right: 6mm; bottom: 6mm;
    pointer-events: none; z-index: 50;
    border: ${tipoBorda === 'single' ? '2px solid var(--color-primary)' : tipoBorda === 'double' ? '6px double var(--color-primary)' : 'none'};
}

.page-cover-img { display: flex; flex-direction: column; justify-content: ${alinhamentoCapitulo}; align-items: center; text-align: center; background: url('${imagemCapaUrl}') center/cover no-repeat !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; color: #ffffff; box-sizing: border-box; }
.page-cover-img h1 { color: #fff; font-size: 3.5rem; margin-bottom: 1rem; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); }
.page-cover-pura { background: url('${imagemCapaUrl}') center/cover no-repeat !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page-cover-text { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background: var(--color-bg); color: var(--color-primary); box-sizing: border-box; }
.page-cover-text h1 { font-size: 3.5rem; margin-bottom: 1.5rem; }

.cap-img-overlay { display: flex; flex-direction: column; justify-content: ${alinhamentoCapitulo}; align-items: center; text-align: center; background: url('INSIRA_URL_IMAGEM_AQUI') center/cover no-repeat !important; background-position: center !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; color: #ffffff; box-sizing: border-box; }
.cap-img-overlay h1 { color: #fff; font-size: 2.8rem; margin-top: 15px; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); }
.cap-icon { font-size: 40px; color: var(--color-secondary); margin-bottom: 10px; text-shadow: 1px 1px 3px rgba(0,0,0,0.8); }

.cap-box-rounded { display: flex; flex-direction: column; justify-content: ${alinhamentoCapitulo}; align-items: center; box-sizing: border-box; background: url('INSIRA_URL_IMAGEM_AQUI') center/cover no-repeat !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.cap-box-inner { background: ${corBoxCapitulo}; padding: 35px 25px; border-radius: 20px; text-align: center; width: 85%; box-shadow: 0 10px 25px rgba(0,0,0,0.2); border: 2px solid var(--color-primary); }
.cap-box-inner h1 { margin:0; font-size: 2.2rem; color: var(--color-primary); }

.cap-img-pura { background-size: cover !important; background-position: center !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

.chapter-banner-img { width: 100%; height: 260px; object-fit: cover; border-radius: 8px; margin: 1rem 0 1.5rem 0; box-shadow: 0 4px 10px rgba(0,0,0,0.08); }

.page-header { 
    position: absolute; top: 16mm; left: 18mm; right: 18mm; 
    display: flex; justify-content: space-between; align-items: flex-end;
    font-size: 8pt; color: var(--color-primary); opacity: 0.8;
    border-bottom: 1px solid rgba(0,0,0, 0.1); padding-bottom: 5px; 
    font-weight: 700; text-transform: uppercase; z-index: 20; letter-spacing: 0.5px;
}
.page-header span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 48%; }

.page-footer { 
    position: absolute; bottom: 10mm; left: 18mm; right: 18mm; 
    font-size: 9pt; color: var(--color-primary); font-weight: 600; z-index: 20; opacity: 0.8;
    ${estiloRodape === 'linha-superior' ? 'border-top: 1px solid rgba(0,0,0, 0.1); padding-top: 5px; display: flex; justify-content: space-between; align-items: flex-start;' : ''}
    ${estiloRodape === 'simples' ? 'display: flex; justify-content: space-between; align-items: flex-start;' : ''}
    ${estiloRodape === 'centralizado' ? 'display: flex; justify-content: center;' : ''}
}
.page-number::after { content: counter(ebook-page); }

h1, h2, h3, h4 { font-family: var(--font-heading); color: var(--color-primary); }
h1 { font-weight: 800; font-size: 2.2rem; margin-top: 0; margin-bottom: 1em; line-height: 1.2; text-align: center; }
h2 { font-weight: 700; font-size: 2.2rem; margin-top: 0.5rem; margin-bottom: 1.2rem; text-align: center; }

p { font-size: ${tamanhoFonteBase} !important; line-height: var(--line-spacing) !important; margin-top: 0 !important; margin-bottom: var(--p-spacing) !important; text-align: justify !important; text-indent: var(--text-indent) !important; hyphens: auto; -webkit-hyphens: auto; }

blockquote { page-break-inside: avoid; break-inside: avoid; font-style: italic; color: var(--color-text); border-left: 5px solid var(--color-secondary); background: rgba(0,0,0, 0.03); padding: 12px 18px; margin: 1rem 0; font-size: ${tamanhoFonteBase}; border-radius: 0 8px 8px 0; }
.highlight-box { background: rgba(139, 109, 79, 0.15); padding: 12px 18px; border-radius: 8px; margin: 1rem 0; font-weight: 500; font-size: ${tamanhoFonteBase}; }

img { max-width: 100%; height: auto; max-height: 35vh; border-radius: 0.5rem; margin: 1rem auto; display: block; object-fit: cover; page-break-inside: avoid; break-inside: avoid; }
ul, ol { margin-top: 0; margin-bottom: 1em; padding-left: 2rem; font-size: ${tamanhoFonteBase}; line-height: var(--line-spacing); }
li { margin-bottom: 0.4rem; page-break-inside: avoid; }

.toc-container { display: flex; flex-direction: column; width: 100%; margin: 1rem 0; }
.toc-item { display: flex; align-items: baseline; width: 100%; text-decoration: none; color: var(--color-text); font-size: ${tamanhoFonteBase}; font-weight: 600; padding: 6px 0; }
.toc-item:hover { color: var(--color-secondary); }
.toc-dots { flex-grow: 1; border-bottom: 2px dotted var(--color-primary); margin: 0 8px; opacity: 0.3; }

.page-container.author-page { display: block; }
.author-section { display: flex; align-items: flex-start; gap: 30px; width: 100%; margin-top: 1.5rem; }
.author-section.layout-topo { flex-direction: column; text-align: center; align-items: center; }
.author-section.layout-esquerda { flex-direction: row; text-align: justify; align-items: flex-start; }
.author-photo { object-fit: cover; box-shadow: 0 10px 15px rgba(0,0,0,0.1); flex-shrink: 0; }
.author-photo.circulo { border-radius: 50%; width: 160px; height: 160px; }
.author-photo.retangulo { border-radius: 8px; width: 140px; height: 190px; }
.author-bio { flex: 1; }
.author-bio h2 { margin-top: 0; }

@page { size: ${formatoLivro === 'A4' ? 'A4' : formatoLivro === '15x21' ? '150mm 210mm' : '140mm 210mm'} portrait; margin: 0; }
@media print {
    html, body { background: #ffffff !important; padding: 0 !important; margin: 0 !important; display: block !important; width: ${conf.width} !important; height: auto !important; }
    #ebook-container { width: 100%; padding: 0; margin: 0; }
    .page-container { width: ${conf.width} !important; height: ${conf.height} !important; box-sizing: border-box !important; margin: 0 !important; padding: ${conf.padding} !important; page-break-after: always !important; box-shadow: none !important; overflow: hidden !important; position: relative !important; 
        border: none !important;
    }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
}
</style>`;

      if (clean.toLowerCase().includes('<body')) {
          if (!clean.includes('@media print')) { clean = clean.replace('</head>', ebookStyles + '\n</head>'); }
          return clean;
      }
      
      return \`<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,400;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
    <title>\${livroTitulo || 'Meu E-book Profissional'}</title>
\${ebookStyles}
</head>
<body class="antialiased">
    <div id="ebook-container">
        \${clean}
    </div>
</body>
</html>\`;
  }

  // FUNÇÕES DE AÇÃO MANTIDAS
  function handleImageUploadBtn(e: React.ChangeEvent<HTMLInputElement>) {
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
  }

  function toggleInspetor() {
      const newMode = !modoInspetor;
      setModoInspetor(newMode);
      setElementoSelecionado(null);
      const iframe = document.getElementById('previewFrame') as HTMLIFrameElement;
      if(iframe.contentWindow) iframe.contentWindow.postMessage({ type: 'TOGGLE_EDIT_MODE', value: newMode }, '*');
  }

  function atualizarElemento(field: string, value: string | number | boolean, forceTextUpdate = false) {
      if(!elementoSelecionado) return;
      const iframe = document.getElementById('previewFrame') as HTMLIFrameElement;
      iframe.contentWindow?.postMessage({ type: 'UPDATE_ELEMENT', id: elementoSelecionado.id, [field]: value, forceTextUpdate }, '*');
      setElementoSelecionado((prev: any) => ({...prev, [field]: value}));
  }

  function transformarEmNode(novoTag: string, classExtra: string = '') {
      if(!elementoSelecionado) return;
      const iframe = document.getElementById('previewFrame') as HTMLIFrameElement;
      const newHtml = \`<\${novoTag} id="\${elementoSelecionado.id}" class="\${classExtra}">\${elementoSelecionado.text}</\${novoTag}>\`;
      iframe.contentWindow?.postMessage({ type: 'REPLACE_ELEMENT_HTML', id: elementoSelecionado.id, newHtml }, '*');
      setElementoSelecionado(null);
      (window as any).showNotification("Elemento transformado!", "success");
  }

  function desfazerCodigo() {
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
  }

  async function aplicarModificacaoGlobal() {
      const input = document.getElementById('ai_prompt_global') as HTMLInputElement;
      const comando = input?.value.trim();
      const codEl = document.getElementById('codigoGerado') as HTMLTextAreaElement;
      
      if(!comando) { (window as any).showNotification("Digite o que deseja alterar no e-book.", "error"); return; }
      if(!codEl || !codEl.value) { (window as any).showNotification("Nenhum E-book gerado para modificar.", "error"); return; }

      const instrucao = \`Você é um Revisor Editorial Sênior. 
      Vou fornecer o HTML COMPLETO do E-book atual. Aplique a seguinte alteração global DE FORMA RIGOROSA E OBEDIENTE: "\${comando}".
      
      REGRAS MÁXIMAS DE SEGURANÇA:
      1. PRESERVAÇÃO ABSOLUTA: Você é OBRIGADO a devolver o código HTML inteiro. NUNCA resuma ou corte.
      2. NUNCA adicione estilos inline <p style="...">. Mantenha as tags HTML intactas.`;

      const data = await chamarMotorIA(instrucao, [{text: \`HTML ATUAL DO E-BOOK:\n\${codEl.value}\`}], false);

      if(data && data.html) {
          let htmlFinal = moldarApresentacaoHtml(purificarHTML(data.html));
          const prevEl = document.getElementById('previewFrame') as HTMLIFrameElement;
          
          setHistoricoCodigo((prev) => [...prev, codEl.value]); 
          codEl.value = htmlFinal; 
          if (prevEl) prevEl.srcdoc = htmlFinal + SCRIPT_PREVIEW; 
          
          if(input) input.value = '';
          (window as any).showNotification("E-book modificado globalmente com sucesso!", "success");
      }
  }

  async function aplicarModificacaoLocal() {
      const input = document.getElementById('ai_prompt_local') as HTMLInputElement;
      const comando = input?.value.trim();
      if(!comando) { (window as any).showNotification("Digite o que alterar neste elemento.", "error"); return; }
      if(!elementoSelecionado) return;

      const codEl = document.getElementById('codigoGerado') as HTMLTextAreaElement;
      if(codEl) setHistoricoCodigo((prev) => [...prev, codEl.value]);

      const instrucao = \`Você é um Assistente Editorial. O usuário selecionou um trecho específico de HTML de um e-book.
      Sua tarefa é modificar APENAS este elemento HTML de acordo com o pedido: "\${comando}".
      
      REGRAS MÁXIMAS:
      1. Retorne APENAS o código HTML modificado DESSA CAIXA/ELEMENTO. 
      2. NUNCA retorne o livro todo. NUNCA retorne as tags <html>, <head> ou <body>.
      3. Mantenha as classes originais. Não use estilos inline.`;

      const data = await chamarMotorIA(instrucao, [{ text: \`HTML DO ELEMENTO SELECIONADO:\n"""\n\${elementoSelecionado.outerHTML}\n"""\` }], true);

      if(data && data.html) {
          let novoHtml = data.html;
          const markdownMatch = novoHtml.match(/```html([\s\S]*?)```/i);
          if (markdownMatch) novoHtml = markdownMatch[1];
          novoHtml = novoHtml.replace(/```html/gi, '').replace(/```/gi, '').trim();

          const iframe = document.getElementById('previewFrame') as HTMLIFrameElement;
          iframe.contentWindow?.postMessage({ type: 'REPLACE_ELEMENT_HTML', id: elementoSelecionado.id, newHtml: novoHtml }, '*');
          
          setElementoSelecionado(null);
          input.value = '';
          (window as any).showNotification("Trecho modificado com sucesso!", "success");
      }
  }

  function injetarHtmlNoFinal(htmlBase: string, htmlNovo: string) {
      if (!htmlBase.includes('id="ebook-container"')) return htmlBase + '\n' + htmlNovo;
      return htmlBase.replace(/<\/div>\s*<\/body>\s*<\/html>/gi, '\n' + htmlNovo + '\n    </div>\n</body>\n</html>');
  }

  function aplicarHtmlNovo(htmlCru: string, isInjetar: boolean) {
      const codEl = document.getElementById('codigoGerado') as HTMLTextAreaElement;
      const prevEl = document.getElementById('previewFrame') as HTMLIFrameElement;
      let novoConteudo = purificarHTML(htmlCru);
      
      let htmlFinal = "";
      if (isInjetar) {
          htmlFinal = injetarHtmlNoFinal(codEl?.value || '', novoConteudo);
      } else {
          htmlFinal = moldarApresentacaoHtml(novoConteudo);
      }

      if (codEl) { setHistoricoCodigo((prev) => [...prev, codEl.value]); codEl.value = htmlFinal; }
      if (prevEl) prevEl.srcdoc = htmlFinal + SCRIPT_PREVIEW; 
  }

  async function chamarMotorIA(systemInstructionText: string, promptParts: any[], isElementRefinement = false) {
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
      try { data = JSON.parse(responseText); } catch (err) { throw new Error(\`Erro no Servidor (\${response.status}): \${responseText.substring(0, 80)}\`); }
      if (!data.success) throw new Error(data.error || "Erro retornado pela API.");
      return data;
    } catch (err: any) {
      let errorMsg = err.message;
      if (errorMsg.includes('429') || errorMsg.toLowerCase().includes('quota')) { errorMsg = "Limite excedido (Quota)."; }
      (window as any).showNotification(errorMsg, 'error'); return null;
    } finally { setStatusApis({ texto: 'Aguardando', processing: false }); }
  }

  function obterInstrucoesBase() {
      let regraRodape = "";
      if (estiloRodape === 'simples' || estiloRodape === 'linha-superior') regraRodape = \`<span>\${livroAutores}</span><span class="page-number"></span>\`;
      else regraRodape = \`<span class="page-number"></span>\`;

      let regraEstiloCapitulos = "";
      if (estiloCapitulos === 'inline-imagem') {
          regraEstiloCapitulos = \`
          NÃO crie página de capa exclusiva. Para abrir o capítulo, use o formato de banner contínuo:
          <div class="page-container">
              <div class="page-header"><span>\${livroTitulo}</span><span>NOME DO CAPÍTULO</span></div>
              <h2 id="ID_DO_CAPITULO">NOME DO CAPÍTULO AQUI</h2>
              <img src="URL_DA_IMAGEM_UNSPLASH" class="chapter-banner-img" alt="Ilustração do Capítulo" />
              <p>[Parágrafo 1...]</p>
              <p>[Parágrafo 2...]</p>
              <p>[Parágrafo 3...]</p>
              <p>[Parágrafo 4...]</p>
              <p>[Parágrafo 5...]</p>
              <div class="page-footer">\${regraRodape}</div>
          </div>\`;
      } else {
        regraEstiloCapitulos = \`Use <h2 id="ID_DO_CAPITULO">NOME DO CAPÍTULO</h2> e 5 parágrafos por página.\`;
      }

      const regrasComuns = \`
      DIRETRIZES DE PENALIZAÇÃO ESTRITA:
      1. VOLUME: OBRIGATORIAMENTE gere EXATAMENTE 5 parágrafos por página para manter a consistência e preenchimento.
      2. MODO GERADOR CÓDIGO PURO: RETORNE APENAS HTML.
      3. IMAGENS: Use URLs do Unsplash (reais).
      4. TÍTULOS: Títulos de capítulo OBRIGATORIAMENTE com <h2 id="ID">Título</h2> centralizado.
      5. FORMATO: Em cada página use EXATAMENTE a estrutura de <div class="page-container"> com page-header e page-footer.
      6. ESTILO CAPÍTULOS: \${regraEstiloCapitulos}
      \`;

      return { regrasComuns };
  }

  // (Funções gerarLivroCompleto, iniciarEbookEtapas, etc. seguem a mesma lógica de garantir o parágrafo 5x)
  // ... rest of the component