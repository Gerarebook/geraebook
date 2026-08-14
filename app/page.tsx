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

    // Função de Ouro: Calcula e atualiza os números das páginas no Índice automaticamente
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
                        spans[2].innerText = pageIndex; // Substitui o 'X' pelo número real da página
                    }
                }
            }
        });
    }

    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(autoUpdatePages, 500); // Dá tempo para fontes renderizarem e ajustarem blocos
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

  // CONFIGURAÇÕES DE DESIGN GERAL
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

  // CORES MANUAIS
  const [paletaCores, setPaletaCores] = useState<'classico' | 'moderno' | 'sepia' | 'dark' | 'personalizado' | 'manual'>('classico');
  const [corManualPri, setCorManualPri] = useState('#2563eb');
  const [corManualSec, setCorManualSec] = useState('#3b82f6');
  const [corManualText, setCorManualText] = useState('#111827');
  const [corManualBg, setCorManualBg] = useState('#ffffff');

  // CONFIGURAÇÕES DE CAPÍTULO E AUTOR
  const [estiloCapitulos, setEstiloCapitulos] = useState<'padrao' | 'box-arredondado' | 'imagem-pura' | 'inline'>('padrao');
  const [alinhamentoCapitulo, setAlinhamentoCapitulo] = useState<'center' | 'flex-start' | 'flex-end'>('center');
  const [corBoxCapitulo, setCorBoxCapitulo] = useState('rgba(255, 255, 255, 0.95)');
  const [estiloRodape, setEstiloRodape] = useState<'simples' | 'linha-superior' | 'centralizado'>('simples');
  const [autorPosicao, setAutorPosicao] = useState<'esquerda' | 'topo'>('esquerda');
  const [autorFormato, setAutorFormato] = useState<'circulo' | 'retangulo'>('circulo');

  // DADOS DO PROJETO
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

  // ==========================================
  // FUNÇÕES DE ESTRUTURA (Hoisted)
  // ==========================================

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

      // FILTRO ANTI-ALUCINAÇÃO EXTREMA
      clean = clean.replace(/<br\s*\/?>/gi, ''); 
      clean = clean.replace(/<p>\s*<\/p>/gi, ''); 
      clean = clean.replace(/<p>&nbsp;<\/p>/gi, ''); 
      clean = clean.replace(/<p>\s*&nbsp;\s*<\/p>/gi, ''); 
      
      clean = clean.replace(/<p>\s*<a class="toc-item"/gi, '<a class="toc-item"');
      clean = clean.replace(/<\/a>\s*<\/p>/gi, '</a>');
      clean = clean.replace(/<p>\s*<div class="toc-container"/gi, '<div class="toc-container"');
      clean = clean.replace(/<\/div>\s*<\/p>/gi, '</div>');

      return clean.trim();
  }

  function getEstilosFormato(formato: string) {
      if(formato === '15x21') return { width: '150mm', height: '210mm', padding: '35mm 20mm 25mm 20mm' }; 
      if(formato === '14x21') return { width: '140mm', height: '210mm', padding: '35mm 20mm 25mm 20mm' };
      return { width: '210mm', height: '297mm', padding: '35mm 20mm 25mm 20mm' }; 
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

/* Paginação Automática via CSS Counters */
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
    top: 7mm; left: 7mm; right: 7mm; bottom: 7mm;
    pointer-events: none; z-index: 50;
    border: ${tipoBorda === 'single' ? '2px solid var(--color-primary)' : tipoBorda === 'double' ? '6px double var(--color-primary)' : 'none'};
}

.page-cover-img::after, .page-cover-pura::after, .cap-img-overlay::after, .cap-box-rounded::after, .cap-img-pura::after {
    display: none;
}

/* CAPAS INICIAIS */
.page-cover-img { display: flex; flex-direction: column; justify-content: ${alinhamentoCapitulo}; align-items: center; text-align: center; background: url('${imagemCapaUrl}') center/cover no-repeat !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; color: #ffffff; box-sizing: border-box; }
.page-cover-img h1 { color: #fff; font-size: 3.5rem; margin-bottom: 1rem; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); }
.page-cover-pura { background: url('${imagemCapaUrl}') center/cover no-repeat !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page-cover-text { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background: var(--color-bg); color: var(--color-primary); box-sizing: border-box; }
.page-cover-text h1 { font-size: 3.5rem; margin-bottom: 1.5rem; }

/* CAPAS DE CAPÍTULO */
.cap-img-overlay { display: flex; flex-direction: column; justify-content: ${alinhamentoCapitulo}; align-items: center; text-align: center; background: url('INSIRA_URL_IMAGEM_AQUI') center/cover no-repeat !important; background-position: center !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; color: #ffffff; box-sizing: border-box; }
.cap-img-overlay h1 { color: #fff; font-size: 2.8rem; margin-top: 15px; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); }
.cap-icon { font-size: 40px; color: var(--color-secondary); margin-bottom: 10px; text-shadow: 1px 1px 3px rgba(0,0,0,0.8); }

.cap-box-rounded { display: flex; flex-direction: column; justify-content: ${alinhamentoCapitulo}; align-items: center; box-sizing: border-box; background: url('INSIRA_URL_IMAGEM_AQUI') center/cover no-repeat !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.cap-box-inner { background: ${corBoxCapitulo}; padding: 35px 25px; border-radius: 20px; text-align: center; width: 85%; box-shadow: 0 10px 25px rgba(0,0,0,0.2); border: 2px solid var(--color-primary); }
.cap-box-inner h1 { margin:0; font-size: 2.2rem; color: var(--color-primary); }

.cap-img-pura { background-size: cover !important; background-position: center !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

/* CABEÇALHOS E RODAPÉS - ELEGANTES E BLINDADOS */
.page-header { 
    position: absolute; top: 15mm; left: 20mm; right: 20mm; 
    display: flex; justify-content: space-between; align-items: flex-end;
    font-size: 8pt; color: var(--color-primary); opacity: 0.8;
    border-bottom: 1px solid rgba(0,0,0, 0.1); padding-bottom: 5px; 
    font-weight: 700; text-transform: uppercase; z-index: 20; letter-spacing: 0.5px;
}
.page-header span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 48%; }

.page-footer { 
    position: absolute; bottom: 12mm; left: 20mm; right: 20mm; 
    font-size: 9pt; color: var(--color-primary); font-weight: 600; z-index: 20; opacity: 0.8;
    ${estiloRodape === 'linha-superior' ? 'border-top: 1px solid rgba(0,0,0, 0.1); padding-top: 5px; display: flex; justify-content: space-between; align-items: flex-start;' : ''}
    ${estiloRodape === 'simples' ? 'display: flex; justify-content: space-between; align-items: flex-start;' : ''}
    ${estiloRodape === 'centralizado' ? 'display: flex; justify-content: center;' : ''}
}
.page-number::after { content: counter(ebook-page); }

/* CONTEÚDO BASE */
h1, h2, h3, h4 { font-family: var(--font-heading); color: var(--color-primary); }
h1 { font-weight: 800; font-size: 2.2rem; margin-top: 1.5rem; margin-bottom: 1em; line-height: 1.2; text-align: center; }
h2 { font-weight: 700; font-size: 1.6rem; margin-top: 1.5rem; margin-bottom: var(--line-spacing); }

p { font-size: ${tamanhoFonteBase} !important; line-height: var(--line-spacing) !important; margin-top: 0 !important; margin-bottom: var(--p-spacing) !important; text-align: justify !important; text-indent: var(--text-indent) !important; hyphens: auto; -webkit-hyphens: auto; }

blockquote { page-break-inside: avoid; break-inside: avoid; font-style: italic; color: var(--color-text); border-left: 5px solid var(--color-secondary); background: rgba(0,0,0, 0.03); padding: 15px 20px; margin: 1.5rem 0; font-size: 11pt; border-radius: 0 8px 8px 0; }
.highlight-box { background: rgba(139, 109, 79, 0.15); padding: 15px 20px; border-radius: 8px; margin: 1.5rem 0; font-weight: 500; }

img { max-width: 100%; height: auto; max-height: 40vh; border-radius: 0.5rem; margin: 1.5rem auto; display: block; object-fit: cover; page-break-inside: avoid; break-inside: avoid; }
ul, ol { margin-top: 0; margin-bottom: 1.2em; padding-left: 2rem; font-size: ${tamanhoFonteBase}; line-height: var(--line-spacing); }
li { margin-bottom: 0.5rem; page-break-inside: avoid; }

/* ÍNDICE CEGO (TOC) */
.toc-container { display: flex; flex-direction: column; width: 100%; margin: 1.5rem 0; }
.toc-item { display: flex; align-items: baseline; width: 100%; text-decoration: none; color: var(--color-text); font-size: 11pt; font-weight: 600; padding: 6px 0; }
.toc-item:hover { color: var(--color-secondary); }
.toc-dots { flex-grow: 1; border-bottom: 2px dotted var(--color-primary); margin: 0 8px; opacity: 0.3; }
.toc-list { display: flex; flex-direction: column; width: 100%; margin: 4px 0; padding: 0; }
.toc-list a { display: flex; align-items: baseline; width: 100%; text-decoration: none; color: var(--color-text); font-size: 11pt; font-weight: 600; padding: 4px 0; }

/* SEÇÃO DO AUTOR - TOPO ALIGN */
.page-container.author-page { display: block; }
.author-section { display: flex; align-items: flex-start; gap: 30px; width: 100%; margin-top: 2rem; }
.author-section.layout-topo { flex-direction: column; text-align: center; align-items: center; }
.author-section.layout-esquerda { flex-direction: row; text-align: justify; align-items: flex-start; }
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
        border: none !important;
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
  }

  // ==========================================
  // FUNÇÕES DE BOTÃO E EVENTOS
  // ==========================================

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
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
      const newHtml = `<${novoTag} id="${elementoSelecionado.id}" class="${classExtra}">${elementoSelecionado.text}</${novoTag}>`;
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

      const instrucao = `Você é um Revisor Editorial Sênior. 
      Vou fornecer o HTML COMPLETO do E-book atual. Aplique a seguinte alteração global DE FORMA RIGOROSA E OBEDIENTE: "${comando}".
      
      REGRAS MÁXIMAS DE SEGURANÇA (RISCO DE DESTRUIÇÃO DO LIVRO):
      1. PRESERVAÇÃO ABSOLUTA: Você é OBRIGADO a devolver o código HTML inteiro, do começo ao fim. NUNCA resuma, corte ou apague capítulos que não foram mencionados na alteração.
      2. Se a alteração for apenas no índice, altere APENAS a div do índice e REPITA TODO O RESTO DO LIVRO EXATAMENTE COMO ESTÁ.
      3. NUNCA adicione estilos inline <p style="...">. Mantenha as tags HTML intactas.`;

      const data = await chamarMotorIA(instrucao, [{text: `HTML ATUAL DO E-BOOK:\n${codEl.value}`}], false);

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

      const instrucao = `Você é um Assistente Editorial. O usuário selecionou um trecho específico de HTML de um e-book.
      Sua tarefa é modificar APENAS este elemento HTML de acordo com o pedido: "${comando}".
      
      REGRAS MÁXIMAS:
      1. Retorne APENAS o código HTML modificado DESSA CAIXA/ELEMENTO específico. 
      2. NUNCA retorne o livro todo. NUNCA retorne as tags <html>, <head> ou <body>.
      3. Mantenha as classes originais a menos que solicitado o contrário. Não use estilos inline.`;

      const data = await chamarMotorIA(instrucao, [{ text: `HTML DO ELEMENTO SELECIONADO:\n"""\n${elementoSelecionado.outerHTML}\n"""` }], true);

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
      try { data = JSON.parse(responseText); } catch (err) { throw new Error(`Erro no Servidor (${response.status}): ${responseText.substring(0, 80)}`); }
      if (!data.success) throw new Error(data.error || "Erro retornado pela API.");
      return data;
    } catch (err: any) {
      let errorMsg = err.message;
      if (errorMsg.includes('429') || errorMsg.toLowerCase().includes('quota')) { errorMsg = "Limite excedido (Quota)."; }
      (window as any).showNotification(errorMsg, 'error'); return null;
    } finally { setStatusApis({ texto: 'Aguardando', processing: false }); }
  }

  function obterInstrucoesBase() {
      let regraEstiloCapitulos = "";
      if (estiloCapitulos === 'padrao') {
          regraEstiloCapitulos = `Crie uma página exclusiva de capa para o capítulo: <div class="page-container cap-img-overlay" style="background: url('INSIRA_URL_IMAGEM_AQUI') center/cover no-repeat;"><div class="cap-icon"><i class="fas fa-book-open"></i></div><h1 id="ID_DO_CAPITULO">NOME EXATO DO CAPÍTULO AQUI</h1></div>`;
      } else if (estiloCapitulos === 'box-arredondado') {
          regraEstiloCapitulos = `Crie uma página exclusiva de capa para o capítulo: <div class="page-container cap-box-rounded" style="background: url('INSIRA_URL_IMAGEM_AQUI') center/cover no-repeat;"><div class="cap-box-inner"><h1 id="ID_DO_CAPITULO" style="margin:0; font-size: 2.2rem;">NOME EXATO DO CAPÍTULO AQUI</h1></div></div>`;
      } else if (estiloCapitulos === 'imagem-pura') {
          regraEstiloCapitulos = `Crie uma página EXCLUSIVA contendo APENAS a imagem: <div class="page-container cap-img-pura" style="background: url('INSIRA_URL_IMAGEM_AQUI') center/cover no-repeat;"></div>`;
      } else {
          regraEstiloCapitulos = `Estilo Inline: Coloque o <h2 id="ID_DO_CAPITULO">NOME EXATO DO CAPÍTULO AQUI</h2> direto no topo da <div class="page-container"> normal de texto.`;
      }

      let regraRodape = "";
      if (estiloRodape === 'simples' || estiloRodape === 'linha-superior') regraRodape = `<span>${livroAutores}</span><span class="page-number"></span>`;
      else regraRodape = `<span class="page-number"></span>`;

      let regraCapaHtml = "";
      if (formatoLivro === '15x21' || formatoLivro === '14x21') {
          regraCapaHtml = `<div class="page-container page-cover-text"><br><br><h1 style="font-size: 2.5rem; text-transform: uppercase;">${livroTitulo || 'Meu E-book'}</h1><div style="width: 50px; height: 2px; background: var(--color-primary); margin: 2rem auto;"></div><p style="font-size: 1.2rem;">${livroAutores || 'Autor'}</p></div>`;
      } else if (tipoCapa === 'imagem-texto') {
          regraCapaHtml = `<div class="page-container page-cover-img"><h1>${livroTitulo || 'Meu E-book'}</h1><p>Por ${livroAutores || 'Autor'}</p></div>`;
      } else if (tipoCapa === 'imagem-pura') {
          regraCapaHtml = `<div class="page-container page-cover-pura"></div>`;
      } else {
          regraCapaHtml = `<div class="page-container page-cover-text"><h1 style="font-size: 3rem; margin-bottom: 1.5rem; text-transform: uppercase;">${livroTitulo || 'Meu E-book'}</h1><div style="width: 80px; height: 2px; background: var(--color-primary); margin: 0 auto 1.5rem auto;"></div><p style="font-size: 1.3rem; font-style: italic;">Por ${livroAutores || 'Autor'}</p></div>`;
      }

      const regrasComuns = `
      DIRETRIZES DE PENALIZAÇÃO ESTRITA:
      1. LIMITE DE PARÁGRAFOS E ESPAÇAMENTO: NUNCA coloque mais de 4 ou 5 parágrafos dentro de uma mesma <div class="page-container">. Para não sobrepor o rodapé, feche a div atual e abra uma NOVA <div class="page-container"> com os mesmos cabeçalhos e rodapés.
      2. PROIBIDO PARÁGRAFOS VAZIOS E QUEBRAS MANUAIS: NUNCA gere as tags <br> ou <p>&nbsp;</p>. Escreva um parágrafo de texto imediatamente após o outro.
      3. IMAGENS CONTEXTUAIS: Use EXCLUSIVAMENTE URLs do Unsplash com fotografias reais de pessoas. PROIBIDO desenhos, animações, ilustrações ou sci-fi.
      4. CABEÇALHOS/RODAPÉS: Em CADA PÁGINA de texto use EXATAMENTE <div class="page-header"><span>${livroTitulo}</span><span>NOME DO CAPÍTULO ATUAL</span></div> e <div class="page-footer">${regraRodape}</div>.
      5. ESTILO CAPÍTULOS: ${regraEstiloCapitulos}
      6. MODO GERADOR CÓDIGO PURO: RETORNE APENAS HTML. Não escreva textos informativos ou saudações.
      `;

      return { regrasComuns, regraCapaHtml, regraRodape };
  }

  async function gerarLivroCompleto() {
    const content = productContent.trim();
    if (!content && modoConteudo !== 'prompt') { (window as any).showNotification('Insira o texto base.', 'error'); return; }

    const { regrasComuns, regraCapaHtml, regraRodape } = obterInstrucoesBase();

    const instrucao = `Atue como Especialista Editorial. Gere o E-book COMPLETO em HTML.
    ${regrasComuns}
    OBRIGAÇÕES DESTE MODO (COMPLETO):
    - Gere a Capa: ${regraCapaHtml}
    - Gere o Índice Clicável: Crie UMA ÚNICA <div class="toc-container">. Dentro dela, insira um link para cada capítulo neste formato exato: <a class="toc-item" href="#cap-1"><span>1. Título</span><span class="toc-dots"></span><span>X</span></a>
      GARANTA que o último link seja para o autor: <a class="toc-item" href="#sobre-o-autor"><span>Sobre o Autor</span><span class="toc-dots"></span><span>X</span></a>
    - Gere TODOS os capítulos solicitados. Concentre narrativas no capítulo 1 e dicas práticas nos demais.
    
    - OBRIGATÓRIO (MOLDE FINAL): Ao chegar na conclusão, use EXATAMENTE esta estrutura para finalizar o HTML:
      <div class="page-container">
          <div class="page-header"><span>${livroTitulo}</span><span>CONCLUSÃO</span></div>
          <h1 id="conclusao">Conclusão</h1>
          <p>[Escreva a conclusão do e-book aqui...]</p>
          <div class="page-footer">${regraRodape}</div>
      </div>
      <div class="page-container author-page">
          <div class="page-header"><span>${livroTitulo}</span><span>SOBRE O AUTOR</span></div>
          <h1 id="sobre-o-autor" style="display:none;">Sobre o Autor</h1>
          <div class="author-section layout-${autorPosicao}">
              <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80" class="author-photo ${autorFormato}" alt="Autor">
              <div class="author-bio">
                  <h2>Sobre o Autor</h2>
                  <p>[Escreva uma biografia envolvente para o autor ${livroAutores}...]</p>
              </div>
          </div>
          <div class="page-footer">${regraRodape}</div>
      </div>
    `;

    const data = await chamarMotorIA(instrucao, [{ text: `TEMA BASE:\n"""\n${content}\n"""` }], false);
    if (data && data.html) aplicarHtmlNovo(data.html, false);
  }

  async function iniciarEbookEtapas() {
      const content = productContent.trim();
      const { regrasComuns, regraCapaHtml } = obterInstrucoesBase();

      const instrucao = `Atue como Especialista Editorial. Você vai INICIAR um e-book gerando APENAS a estrutura base e a introdução.
      ${regrasComuns}
      OBRIGAÇÕES DESTE MODO (PASSO 1 - INÍCIO):
      1. GERE A CAPA: ${regraCapaHtml}
      2. GERE O ÍNDICE COMPLETO (TOC): Crie um índice prevendo a estrutura TOTAL do livro (Introdução, todos os capítulos, Conclusão e Sobre o Autor).
         - Formato OBRIGATÓRIO: Crie UMA ÚNICA <div class="toc-container"> e, dentro dela, coloque os itens.
         - O último link DEVE ser OBRIGATORIAMENTE: <a class="toc-item" href="#sobre-o-autor"><span>Sobre o Autor</span><span class="toc-dots"></span><span>X</span></a>
         - IMPORTANTE: No lugar do número da página, coloque o caractere "X".
      3. GERE APENAS A INTRODUÇÃO: Escreva apenas a página (ou páginas) de Introdução. Coloque id="intro" na div ou h1 para o link do índice funcionar.
      4. ORDEM MÁXIMA DE PARADA: PARE IMEDIATAMENTE APÓS A INTRODUÇÃO. NÃO escreva o Capítulo 1 ou seguintes. NÃO escreva a conclusão.
      `;

      const data = await chamarMotorIA(instrucao, [{ text: `TEMA BASE PARA CRIAR O ÍNDICE E A INTRODUÇÃO:\n"""\n${content}\n"""` }], false);
      if (data && data.html) aplicarHtmlNovo(data.html, false);
      (window as any).showNotification("Passo 1 Concluído! Índice e Introdução gerados.", "success");
  }

  async function continuarEbookEtapas() {
      const content = productContent.trim();
      const codEl = document.getElementById('codigoGerado') as HTMLTextAreaElement;
      const currentHtml = codEl?.value || '';

      if (!currentHtml.includes('page-container')) { (window as any).showNotification('Gere o Passo 1 primeiro!', 'error'); return; }

      const { regrasComuns } = obterInstrucoesBase();

      const instrucao = `Atue como Especialista Editorial. Você vai CONTINUAR a escrita de um e-book já existente.
      ${regrasComuns}
      OBRIGAÇÕES DESTE MODO (PASSO 2 - MEIO):
      1. LEIA O ÍNDICE EXISTENTE: Analise o código HTML atual (fornecido abaixo). Veja os itens listados na classe "toc-container".
      2. IDENTIFIQUE DE ONDE CONTINUAR: Procure no final do código HTML qual foi o ÚLTIMO capítulo escrito.
      3. GERE OS PRÓXIMOS CAPÍTULOS: Escreva APENAS os próximos 2 capítulos exatos da sequência do índice.
      4. FIDELIDADE ABSOLUTA: Use EXATAMENTE os mesmos Nomes e os mesmos IDs (href) que constam no índice do HTML original. Nunca invente um nome diferente.
      5. FORMATO DE SAÍDA: Retorne APENAS as tags <div class="page-container"> dos capítulos novos. NUNCA gere capa, índice, <html> ou <body>.
      `;

      const data = await chamarMotorIA(instrucao, [
          { text: `CÓDIGO HTML ATUAL DO LIVRO (LEIA O ÍNDICE E VEJA ONDE PAROU O ÚLTIMO CAPÍTULO):\n"""\n${currentHtml}\n"""` },
          { text: `INSTRUÇÕES EXTRAS:\n"""\n${content || 'Siga a lista do índice fielmente e gere os próximos capítulos densos.'}\n"""` }
      ], false);
      
      if (data && data.html) aplicarHtmlNovo(data.html, true);
      (window as any).showNotification("Passo 2 Concluído! Próximos capítulos adicionados.", "success");
  }

  async function finalizarEbookEtapas() {
      const codEl = document.getElementById('codigoGerado') as HTMLTextAreaElement;
      if (!codEl?.value.includes('page-container')) { (window as any).showNotification('Gere o livro antes de finalizar.', 'error'); return; }

      const { regrasComuns, regraRodape } = obterInstrucoesBase();

      const instrucao = `Atue como Especialista Editorial. Você vai FINALIZAR a escrita do e-book.
      ${regrasComuns}

      OBRIGAÇÕES DESTE MODO (PASSO 3 - FIM):
      Você DEVE obrigatoriamente usar EXATAMENTE o molde de código HTML abaixo para finalizar o livro. 
      Sua única tarefa é COPIAR o código abaixo e substituir apenas os colchetes "[...]" pelo conteúdo real que você vai gerar.

      MOLDE HTML OBRIGATÓRIO (NÃO ALTERE AS CLASSES E AS DIVS):

      <div class="page-container">
          <div class="page-header"><span>${livroTitulo}</span><span>CONCLUSÃO</span></div>
          <h1 id="conclusao">Conclusão</h1>
          <p>[Escreva o parágrafo 1 da conclusão do e-book aqui...]</p>
          <p>[Escreva o parágrafo 2 da conclusão do e-book aqui...]</p>
          <p>[Escreva o parágrafo 3 da conclusão do e-book aqui...]</p>
          <div class="page-footer">${regraRodape}</div>
      </div>
      <div class="page-container author-page">
          <div class="page-header"><span>${livroTitulo}</span><span>SOBRE O AUTOR</span></div>
          <h1 id="sobre-o-autor" style="display:none;">Sobre o Autor</h1>
          <div class="author-section layout-${autorPosicao}">
              <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80" class="author-photo ${autorFormato}" alt="Autor">
              <div class="author-bio">
                  <h2>Sobre o Autor</h2>
                  <p>[Escreva a biografia do autor ${livroAutores} aqui...]</p>
              </div>
          </div>
          <div class="page-footer">${regraRodape}</div>
      </div>

      PROIBIÇÕES ABSOLUTAS:
      - NUNCA aplique a estrutura de "capa de capítulo" (com imagem de fundo e ícone) na Conclusão.
      - NUNCA omita a <div class="page-header"> ou a <div class="page-footer"> da página do autor.
      - RETORNE APENAS HTML. NUNCA gere capa frontal ou índice.
      `;

      const data = await chamarMotorIA(instrucao, [{ text: `TEMA DO E-BOOK (Para basear a conclusão):\n"""\n${livroTitulo}\n"""` }], false);
      if (data && data.html) aplicarHtmlNovo(data.html, true);
      (window as any).showNotification("Passo 3 Concluído! E-book finalizado com sucesso.", "success");
  }

  // ==========================================
  // EFEITOS (UseEffects devem ficar no final da declaração do componente)
  // ==========================================

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
        const iframe = document.getElementById('previewFrame') as HTMLIFrameElement;
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) { (window as any).showNotification("Nenhum código para baixar.", "error"); return; }
        
        const clone = doc.documentElement.cloneNode(true) as HTMLElement;
        const script = clone.querySelector('#editor-magic-script');
        if (script) script.remove(); 
        
        const finalHtml = "<!DOCTYPE html>\n<html lang=\"pt-BR\">\n" + clone.innerHTML + "\n</html>";
        const blob = new Blob([finalHtml], { type: 'text/html' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${livroTitulo ? livroTitulo.replace(/\s+/g, '-').toLowerCase() : 'meu-ebook'}.html`;
        a.click();
    };
  }, [livroTitulo]);

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
  }, [fontFamily, formatoLivro, tamanhoFonteBase, livroTitulo, tipoBorda, tipoCapa, imagemCapaUrl, espacamentoLinhas, espacamentoParagrafo, recuoParagrafo, paletaCores, corManualPri, corManualSec, corManualText, corManualBg, estiloRodape, alinhamentoCapitulo, corBoxCapitulo, autorPosicao, autorFormato, htmlTemplate]);

  useEffect(() => {
    const codEl = document.getElementById('codigoGerado') as HTMLTextAreaElement;
    const prevEl = document.getElementById('previewFrame') as HTMLIFrameElement;
    if (codEl && codEl.value && prevEl) {
        prevEl.srcdoc = moldarApresentacaoHtml(codEl.value) + SCRIPT_PREVIEW;
    }
  }, [fontFamily, formatoLivro, tamanhoFonteBase, livroTitulo, tipoBorda, tipoCapa, imagemCapaUrl, espacamentoLinhas, espacamentoParagrafo, recuoParagrafo, paletaCores, corManualPri, corManualSec, corManualText, corManualBg, estiloRodape, alinhamentoCapitulo, corBoxCapitulo, autorPosicao, autorFormato, htmlTemplate]);

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

                      {/* COMANDO GLOBAL */}
                      <div className="p-4 bg-indigo-50 border-b border-indigo-100 shadow-sm">
                          <label className="input-label text-indigo-900 mb-2"><i className="fas fa-bolt mr-1 text-yellow-500"></i> Modificação Global no E-book</label>
                          <textarea id="ai_prompt_global" rows={2} className="input-standard text-xs mb-2 border-indigo-200 shadow-inner" placeholder="Ex: Reescreva o Índice para incluir os novos capítulos que eu gerei nas etapas."></textarea>
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

                                  {/* NOVA ÁREA: IA PARA O ELEMENTO SELECIONADO */}
                                  <div className="mt-2 mb-4">
                                      <label className="input-label mb-2 text-indigo-700 flex items-center gap-1"><i className="fas fa-magic text-yellow-500"></i> Editar este trecho com IA</label>
                                      <textarea id="ai_prompt_local" rows={2} className="input-standard text-xs mb-2 border-indigo-200 shadow-inner" placeholder="Ex: Reescreva este parágrafo em um tom mais persuasivo... ou Atualize este índice..."></textarea>
                                      <button onClick={aplicarModificacaoLocal} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-[10px] uppercase tracking-wide py-2 rounded-lg transition shadow-sm">Aplicar IA no Selecionado</button>
                                  </div>

                                  {elementoSelecionado.tagName === 'img' || elementoSelecionado.bgImage ? (
                                      <div className="space-y-3 pt-3 border-t border-slate-100">
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
                                          {elementoSelecionado.bgImage && (
                                              <div className="mt-3 pt-3 border-t border-slate-100">
                                                  <label className="input-label mb-1">Escurecimento do Fundo (Opacidade)</label>
                                                  <div className="flex items-center gap-2">
                                                      <span className="text-[10px] text-slate-500 font-bold">0%</span>
                                                      <input 
                                                          type="range" min="0" max="0.9" step="0.1" defaultValue="0" 
                                                          onChange={(e) => {
                                                              const val = e.target.value;
                                                              const newBg = val === "0" 
                                                                  ? `url('${elementoSelecionado.bgImage}')` 
                                                                  : `linear-gradient(rgba(0,0,0,${val}), rgba(0,0,0,${val})), url('${elementoSelecionado.bgImage}')`;
                                                              const iframe = document.getElementById('previewFrame') as HTMLIFrameElement;
                                                              iframe.contentWindow?.postMessage({ type: 'UPDATE_ELEMENT', id: elementoSelecionado.id, rawBgImage: newBg }, '*');
                                                          }} 
                                                          className="flex-1 accent-indigo-600 cursor-pointer" 
                                                      />
                                                      <span className="text-[10px] text-slate-500 font-bold">90%</span>
                                                  </div>
                                                  <button onClick={() => atualizarElemento('bgImage', '')} className="w-full mt-3 bg-orange-50 border border-orange-200 text-orange-700 font-bold text-[9px] uppercase py-2 rounded transition hover:bg-orange-100"><i className="fas fa-times-circle mr-1"></i> Remover Imagem de Fundo</button>
                                              </div>
                                          )}
                                      </div>
                                  ) : (
                                      <div className="pt-3 border-t border-slate-100">
                                          <label className="input-label mb-2">Edição Manual de Texto</label>
                                          <textarea rows={5} value={elementoSelecionado.text} onChange={(e) => atualizarElemento('text', e.target.value, true)} className="input-standard resize-y shadow-inner text-sm leading-relaxed font-serif"></textarea>
                                          
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
                                          <label className="input-label mb-2 text-[9px]">Cor do Texto</label>
                                          <input type="color" value={elementoSelecionado.textColor || '#1e1914'} onChange={(e) => atualizarElemento('textColor', e.target.value)} className="w-full h-8 rounded cursor-pointer border-none" />
                                      </div>
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
                                      <option value="manual">Cores Manuais (Escolha as cores)</option>
                                      <option value="personalizado">Extrair HTML (Template)</option>
                                  </select>
                              </div>

                              {paletaCores === 'manual' && (
                                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                                      <div>
                                          <label className="input-label mb-2 text-[9px]">Cor Primária (Títulos)</label>
                                          <input type="color" value={corManualPri} onChange={(e) => setCorManualPri(e.target.value)} className="w-full h-8 rounded cursor-pointer border-none" />
                                      </div>
                                      <div>
                                          <label className="input-label mb-2 text-[9px]">Cor Secundária (Quotes)</label>
                                          <input type="color" value={corManualSec} onChange={(e) => setCorManualSec(e.target.value)} className="w-full h-8 rounded cursor-pointer border-none" />
                                      </div>
                                      <div>
                                          <label className="input-label mb-2 text-[9px]">Cor do Texto</label>
                                          <input type="color" value={corManualText} onChange={(e) => setCorManualText(e.target.value)} className="w-full h-8 rounded cursor-pointer border-none" />
                                      </div>
                                      <div>
                                          <label className="input-label mb-2 text-[9px]">Cor Fundo da Folha</label>
                                          <input type="color" value={corManualBg} onChange={(e) => setCorManualBg(e.target.value)} className="w-full h-8 rounded cursor-pointer border-none" />
                                      </div>
                                  </div>
                              )}

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
                                          <option value="0.8em">Colado (0.8em)</option>
                                          <option value="1em">Normal (1em)</option>
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

                      {/* CONTEÚDO E GERAÇÃO */}
                      <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-sm flex flex-col">
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
                              <label className="input-label text-indigo-800 mb-2">Instruções / Capítulos para Gerar</label>
                              <textarea 
                                  value={productContent} 
                                  onChange={(e) => setProductContent(e.target.value)} 
                                  className="input-standard h-36 resize-y leading-relaxed text-sm p-4 rounded-xl border-indigo-200 shadow-inner font-serif" 
                                  placeholder="Digite o tema principal ou cole a lista de capítulos que deseja gerar/continuar..."
                              ></textarea>
                          </div>

                          <div className="flex flex-col gap-3 mt-2">
                              {/* OPÇÃO 1: COMPLETO (RECOMENDADO PARA APIS PAGAS) */}
                              <button onClick={() => gerarLivroCompleto()} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 text-xs flex items-center justify-center gap-2 border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1">
                                  <i className="fas fa-bolt text-yellow-300 text-lg"></i> Gerar E-book Completo
                              </button>
                              
                              <div className="flex items-center my-1 opacity-50">
                                  <div className="flex-1 h-px bg-indigo-800"></div>
                                  <span className="px-3 text-[9px] font-bold text-indigo-900 uppercase">Ou Gerar por Etapas</span>
                                  <div className="flex-1 h-px bg-indigo-800"></div>
                              </div>

                              {/* OPÇÃO 2: ETAPAS */}
                              <div className="grid grid-cols-1 gap-2">
                                  <button onClick={() => iniciarEbookEtapas()} className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold uppercase tracking-wider py-2.5 rounded-lg shadow-md shadow-sky-200 transition-all hover:-translate-y-0.5 text-[10px] flex items-center justify-center gap-2">
                                      <i className="fas fa-play-circle text-white"></i> 1. Iniciar (Capa e Índice)
                                  </button>
                                  
                                  <button onClick={() => continuarEbookEtapas()} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-wider py-2.5 rounded-lg shadow-md shadow-emerald-200 transition-all hover:-translate-y-0.5 text-[10px] flex items-center justify-center gap-2">
                                      <i className="fas fa-plus-circle text-white"></i> 2. Adicionar Capítulos (Meio)
                                  </button>

                                  <button onClick={() => finalizarEbookEtapas()} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase tracking-wider py-2.5 rounded-lg shadow-md shadow-amber-200 transition-all hover:-translate-y-0.5 text-[10px] flex items-center justify-center gap-2">
                                      <i className="fas fa-flag-checkered text-white"></i> 3. Finalizar (Conclusão e Autor)
                                  </button>
                              </div>
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