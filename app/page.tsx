'use client';

import { supabase } from '@/lib/supabase';
import React, { useEffect, useState, useRef } from 'react';

// ==========================================
// FUNÇÕES DE INJEÇÃO DO IFRAME (MOTOR A4)
// ==========================================
function getScriptPreview(indexShowSubtopics: boolean) {
    return `<script id="editor-magic-script">
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

    // 1. SINCRONIZADOR DE ÍNDICE MESTRE E CURA DE DUPLICIDADES
    function sincronizarIndice() {
        document.querySelectorAll('p').forEach(p => {
            if(p.innerHTML.trim() === '' || p.innerHTML.trim() === '&nbsp;') p.remove();
        });

        const allTocs = document.querySelectorAll('.toc-container');
        if (allTocs.length === 0) return;

        // Mantém apenas o primeiro índice (original) e apaga as cópias alucinadas pela IA
        const mainToc = allTocs[0];
        for(let i = 1; i < allTocs.length; i++) { allTocs[i].closest('.page-container')?.remove(); }

        const indexTitles = Array.from(document.querySelectorAll('h2.chapter-title-inline')).filter(el => (el.textContent || '').trim().toLowerCase() === 'índice' || (el.textContent || '').trim().toLowerCase() === 'sumário');
        for(let i = 1; i < indexTitles.length; i++) indexTitles[i].closest('.page-container')?.remove();

        const introTitles = Array.from(document.querySelectorAll('h2.chapter-title-inline')).filter(el => (el.textContent || '').trim().toLowerCase() === 'introdução');
        for(let i = 1; i < introTitles.length; i++) introTitles[i].closest('.page-container')?.remove();

        // Elimina capas duplicadas inseridas acidentalmente no meio do livro
        const covers = document.querySelectorAll('.page-cover-img, .page-cover-text, .page-cover-pura');
        for(let i = 1; i < covers.length; i++) { covers[i].closest('.page-container')?.remove(); }

        const selector = ${indexShowSubtopics ? "'h1.chapter-title-exclusive, h2.chapter-title-inline, h3.subtopic-title'" : "'h1.chapter-title-exclusive, h2.chapter-title-inline'"};
        const titles = document.querySelectorAll(selector);
        
        mainToc.innerHTML = '';

        titles.forEach((titleEl) => {
            if (titleEl.tagName === 'H1' && !titleEl.id && titleEl.closest('.page-cover-img, .page-cover-text, .page-cover-pura')) return;
            const textContent = (titleEl.textContent || '').trim().toLowerCase();
            if (textContent === 'índice' || textContent === 'sumário') return;

            if (!titleEl.id) { titleEl.id = 'sec-auto-' + Math.random().toString(36).substr(2, 9); }

            const a = document.createElement('a');
            a.className = 'toc-item';
            
            if (titleEl.tagName === 'H2' || titleEl.tagName === 'H1') {
                a.style.fontWeight = ${indexShowSubtopics ? "'700'" : "'400'"};
                a.style.color = 'var(--color-primary)';
            } else if (titleEl.tagName === 'H3') {
                a.style.paddingLeft = '20px';
                a.style.fontSize = '0.9em';
                a.style.opacity = '0.85';
                a.style.fontWeight = '400';
            }

            a.href = '#' + titleEl.id;
            
            const spanTitle = document.createElement('span');
            spanTitle.innerText = titleEl.textContent.trim();
            const spanDots = document.createElement('span');
            spanDots.className = 'toc-dots';
            const spanPage = document.createElement('span');
            spanPage.className = 'toc-page-num';
            
            a.appendChild(spanTitle);
            a.appendChild(spanDots);
            a.appendChild(spanPage);
            mainToc.appendChild(a);
        });
    }

    // 2. MOTOR DE REFLUXO AVANÇADO CORRIGIDO (Evita Vácuo e Otimiza Preenchimento)
    function aplicarRefluxoDePagina() {
        let requiresReflow = true;
        let maxIterations = 80; 
        
        while(requiresReflow && maxIterations > 0) {
            requiresReflow = false;
            maxIterations--;
            let pages = document.querySelectorAll('.page-container');
            
            for(let i=0; i < pages.length; i++) {
                let page = pages[i];
                
                if(page.classList.contains('page-cover-pura') || 
                   page.classList.contains('page-cover-img') || 
                   page.classList.contains('page-cover-text') || 
                   page.classList.contains('cap-img-overlay') || 
                   page.classList.contains('cap-box-rounded') || 
                   page.classList.contains('cap-img-pura')) continue;

                let computedStyle = window.getComputedStyle(page);
                let paddingBottom = parseFloat(computedStyle.paddingBottom);
                let pageRect = page.getBoundingClientRect();
                
                let limitY = pageRect.bottom - paddingBottom;
                
                let childNodes = Array.from(page.children).filter(el => 
                    !el.classList.contains('page-header') && 
                    !el.classList.contains('page-footer') && 
                    el.tagName !== 'STYLE' && el.tagName !== 'SCRIPT'
                );

                let overflowIndex = -1;
                let tocOverflowIndex = -1;

                for(let j=0; j < childNodes.length; j++) {
                    let node = childNodes[j];
                    if (node.classList.contains('toc-container')) {
                        let tocItems = Array.from(node.children);
                        for(let k=0; k < tocItems.length; k++) {
                            let itemRect = tocItems[k].getBoundingClientRect();
                            if(itemRect.bottom > limitY) {
                                tocOverflowIndex = k;
                                overflowIndex = j;
                                break;
                            }
                        }
                        if (overflowIndex !== -1) break;
                    } else {
                        let nodeRect = node.getBoundingClientRect();
                        let nodeBottom = nodeRect.bottom + parseFloat(window.getComputedStyle(node).marginBottom || 0);
                        if (nodeBottom > limitY + 2) { 
                            overflowIndex = j;
                            break;
                        }
                    }
                }

                if (overflowIndex !== -1) {
                    let node = childNodes[overflowIndex];
                    let nodesToMove = [];
                    
                    if (node.classList.contains('toc-container') && tocOverflowIndex !== -1) {
                        let tocItems = Array.from(node.children);
                        let movedTocItems = tocItems.slice(tocOverflowIndex);
                        let nextContainer = node.cloneNode(false);
                        movedTocItems.forEach(item => nextContainer.appendChild(item));
                        
                        nodesToMove = childNodes.slice(overflowIndex + 1);
                        nodesToMove.unshift(nextContainer);
                    } else {
                        // Anti-órfão brando
                        let safeBreak = overflowIndex;
                        if (safeBreak > 0) {
                            let prevNode = childNodes[safeBreak - 1];
                            if (prevNode.tagName.match(/^H[1-6]$/i) || prevNode.classList.contains('subtopic-title')) {
                                safeBreak--;
                            }
                        }
                        if (safeBreak === 0 && childNodes.length > 1) { safeBreak = 1; }
                        nodesToMove = childNodes.slice(safeBreak);
                    }

                    if (nodesToMove.length > 0) {
                        let newPage = document.createElement('div');
                        newPage.className = 'page-container'; 
                        
                        let header = page.querySelector('.page-header');
                        let footer = page.querySelector('.page-footer');
                        
                        if(header) newPage.appendChild(header.cloneNode(true));
                        nodesToMove.forEach(n => newPage.appendChild(n));
                        if(footer) newPage.appendChild(footer.cloneNode(true));
                        
                        page.parentNode.insertBefore(newPage, page.nextSibling);
                        requiresReflow = true;
                        break; 
                    }
                }
            }
        }

        document.querySelectorAll('.page-container').forEach(page => {
            const contentNodes = Array.from(page.children).filter(el => 
                !el.classList.contains('page-header') && 
                !el.classList.contains('page-footer') && 
                el.tagName !== 'STYLE' && el.tagName !== 'SCRIPT'
            );
            if (contentNodes.length === 0 && 
                !page.classList.contains('page-cover-pura') && 
                !page.classList.contains('page-cover-img') && 
                !page.classList.contains('page-cover-text') && 
                !page.classList.contains('cap-img-overlay') && 
                !page.classList.contains('cap-box-rounded') && 
                !page.classList.contains('cap-img-pura')) {
                page.remove();
            }
        });
    }

    // 3. ORQUESTRADOR
    function triggerSmartReflow() {
        const images = Array.from(document.images);
        let loaded = 0;
        
        function runFormatting() {
            sincronizarIndice(); 
            aplicarRefluxoDePagina(); 
            
            const pages = Array.from(document.querySelectorAll('.page-container, .page-cover-img, .page-cover-text, .page-cover-pura, .cap-img-overlay, .cap-box-rounded, .cap-img-pura'));
            document.querySelectorAll('.toc-item').forEach(item => {
                const href = item.getAttribute('href');
                if(!href || !href.startsWith('#')) return;
                const target = document.getElementById(href.substring(1));
                if(target) {
                    const page = target.closest('.page-container, .page-cover-img, .page-cover-text, .page-cover-pura, .cap-img-overlay, .cap-box-rounded, .cap-img-pura');
                    if(page) {
                        const pageIndex = pages.indexOf(page) + 1;
                        const pageNumberSpan = item.querySelector('.toc-page-num');
                        if (pageNumberSpan) pageNumberSpan.innerText = pageIndex;
                    }
                }
            });
        }

        if(images.length === 0) { runFormatting(); return; }
        let timeoutTriggered = false;
        const checkDone = () => { loaded++; if(loaded >= images.length && !timeoutTriggered) { runFormatting(); } };

        images.forEach(img => {
            if(img.complete) { checkDone(); } else { img.addEventListener('load', checkDone); img.addEventListener('error', checkDone); }
        });
        setTimeout(() => { if(!timeoutTriggered && loaded < images.length) { timeoutTriggered = true; runFormatting(); } }, 3000);
    }

    window.addEventListener('DOMContentLoaded', () => { setTimeout(triggerSmartReflow, 300); });

    function sendCleanHtml() {
        triggerSmartReflow(); 
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
            let matches = bgImgRaw.match(/url\\(['"]?(.*?)['"]?\\)/);
            if(matches && matches[1]) bgImgUrl = matches[1];
        }

        let isBgTarget = ['DIV', 'HEADER', 'FOOTER', 'SECTION', 'ARTICLE'].includes(elSelecionado.tagName) || elSelecionado.classList.contains('page-container');

        window.parent.postMessage({
            type: 'ELEMENT_SELECTED', id: elSelecionado.id, tagName: elSelecionado.tagName.toLowerCase(),
            text: elSelecionado.innerText || '', src: elSelecionado.src || '', bgImage: bgImgUrl,
            isBgTarget: isBgTarget, className: elSelecionado.className, textColor: rgbToHex(compStyle.color),
            bgColor: rgbToHex(compStyle.backgroundColor), fontSize: parseInt(compStyle.fontSize) || 16,
            textAlign: tAlign, outerHTML: elSelecionado.outerHTML
        }, '*');
    }

    window.addEventListener('message', (event) => {
        if(event.data.type === 'TOGGLE_EDIT_MODE') {
            modoEdicao = event.data.value;
            if(modoEdicao) { document.body.classList.add('builder-editing'); } 
            else {
                document.body.classList.remove('builder-editing');
                if(elSelecionado) { elSelecionado.style.outline = ''; elSelecionado.style.outlineOffset = ''; elSelecionado = null; }
                document.querySelectorAll('[data-old-outline]').forEach(el => { el.style.outline = el.dataset.oldOutline || ''; el.style.outlineOffset = ''; delete el.dataset.oldOutline; });
            }
        }
        if (event.data.type === 'DELETE_ELEMENT') {
            let el = document.getElementById(event.data.id);
            if(el) { el.remove(); elSelecionado = null; sendCleanHtml(); }
        }
        if(event.data.type === 'UPDATE_ELEMENT') {
            let el = document.getElementById(event.data.id);
            if(el) {
                if(event.data.text !== undefined && event.data.forceTextUpdate) { el.innerText = event.data.text; }
                if(event.data.src !== undefined) el.src = event.data.src;
                if(event.data.textColor !== undefined) el.style.setProperty('color', event.data.textColor, 'important');
                if(event.data.bgColor !== undefined) el.style.setProperty('background-color', event.data.bgColor, 'important');
                if(event.data.bgImage !== undefined) {
                    if(event.data.bgImage === '') { el.style.setProperty('background-image', 'none', 'important'); } 
                    else { el.style.setProperty('background-image', \`url('\${event.data.bgImage}')\`, 'important'); el.style.setProperty('background-size', 'cover', 'important'); el.style.setProperty('background-position', 'center', 'important'); }
                }
                if(event.data.rawBgImage !== undefined) {
                    el.style.setProperty('background-image', event.data.rawBgImage, 'important');
                    el.style.setProperty('background-size', 'cover', 'important'); el.style.setProperty('background-position', 'center', 'important');
                }
                if(event.data.fontSize !== undefined) { el.style.setProperty('font-size', event.data.fontSize + 'px', 'important'); }
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
            e.preventDefault(); e.stopPropagation(); selectElement(e.target);
        } else {
            let targetLink = e.target.closest('a');
            if (targetLink && targetLink.getAttribute('href')?.startsWith('#')) {
                e.preventDefault();
                let targetId = targetLink.getAttribute('href').substring(1);
                let targetEl = document.getElementById(targetId);
                if (targetEl) {
                    if (window.getComputedStyle(targetEl).display === 'none') {
                        let parentPage = targetEl.closest('.page-container, .page-cover-img, .page-cover-text, .page-cover-pura, .cap-img-overlay, .cap-box-rounded, .cap-img-pura');
                        if (parentPage) parentPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } else { targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
                }
            }
        }
    }, true); 
</script>`;
}

export default function Home() {
  const [historicoCodigo, setHistoricoCodigo] = useState<string[]>([]);
  const [textEngine, setTextEngine] = useState<'gemini' | 'groq'>('gemini'); 
  const [modoInspetor, setModoInspetor] = useState(false);
  const [elementoSelecionado, setElementoSelecionado] = useState<any>(null);
  const [statusApis, setStatusApis] = useState<{ texto: string; processing: boolean }>({ texto: 'Aguardando Operação', processing: false });

  // CONFIGURAÇÕES DE DESIGN GERAL - Margens restauradas para o Padrão Ouro
  const [fontFamily, setFontFamily] = useState('Lato');
  const [tamanhoFonteBase, setTamanhoFonteBase] = useState('14pt');
  const [espacamentoLinhas, setEspacamentoLinhas] = useState('1.5');
  const [espacamentoParagrafo, setEspacamentoParagrafo] = useState('0.8em'); 
  const [recuoParagrafo, setRecuoParagrafo] = useState('20px');
  
  const [tipoBorda, setTipoBorda] = useState<'none' | 'single' | 'double' | 'double-thin'>('none');
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
  const [estiloCapitulos, setEstiloCapitulos] = useState<'padrao' | 'box-arredondado' | 'imagem-pura' | 'inline-imagem' | 'inline'>('inline-imagem');
  const [alinhamentoCapitulo, setAlinhamentoCapitulo] = useState<'center' | 'flex-start' | 'flex-end'>('center');
  const [corBoxCapitulo, setCorBoxCapitulo] = useState('rgba(255, 255, 255, 0.95)');
  const [estiloRodape, setEstiloRodape] = useState<'simples' | 'simples-circulo' | 'linha-superior' | 'centralizado' | 'centralizado-circulo'>('simples');
  const [autorPosicao, setAutorPosicao] = useState<'esquerda' | 'topo'>('esquerda');
  const [autorFormato, setAutorFormato] = useState<'circulo' | 'retangulo'>('circulo');

  // DADOS DO PROJETO E OPÇÕES DO ÍNDICE
  const [livroTitulo, setLivroTitulo] = useState('');
  const [livroAutores, setLivroAutores] = useState('');
  const [productContent, setProductContent] = useState('');
  const [modoConteudo, setModoConteudo] = useState<'expandido' | 'rigoroso'>('expandido');
  const [indexShowSubtopics, setIndexShowSubtopics] = useState(true);

  // BIBLIOTECA LOCAL E SALVAMENTO
  const [livrosSalvos, setLivrosSalvos] = useState<{id: string, titulo: string, data: string, html: string, prompt: string}[]>([]);
  const [modalBiblioteca, setModalBiblioteca] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const verificarAcesso = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/login'; }
    };
    verificarAcesso();

    // 💾 RECUPERA O RASCUNHO E O PROMPT ATUAL
    const savedHtml = localStorage.getItem('ebook_draft_html');
    const savedPrompt = localStorage.getItem('ebook_draft_prompt');
    
    if (savedHtml) {
        const codEl = document.getElementById('codigoGerado') as HTMLTextAreaElement;
        const prevEl = document.getElementById('previewFrame') as HTMLIFrameElement;
        if (codEl) codEl.value = savedHtml;
        if (prevEl) prevEl.srcdoc = savedHtml + getScriptPreview(indexShowSubtopics);
    }
    if (savedPrompt) {
        setProductContent(savedPrompt);
    }

    // 📚 RECUPERA A BIBLIOTECA DE LIVROS SALVOS
    const lib = localStorage.getItem('ebook_saved_books');
    if (lib) { setLivrosSalvos(JSON.parse(lib)); }
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
      clean = clean.replace(/<p>[\s\n\r&nbsp;]*<\/p>/gi, ''); 
      
      clean = clean.replace(/<span class="toc-page-num">[^<]*<\/span>/gi, '<span class="toc-page-num"></span>');
      clean = clean.replace(/<span class="page-number( circulo)?">[^<]*<\/span>/gi, '<span class="page-number$1"></span>');

      clean = clean.replace(/<p>\s*<a class="toc-item"/gi, '<a class="toc-item"');
      clean = clean.replace(/<\/a>\s*<\/p>/gi, '</a>');
      clean = clean.replace(/<p>\s*<div class="toc-container"/gi, '<div class="toc-container"');
      clean = clean.replace(/<\/div>\s*<\/p>/gi, '</div>');
      clean = clean.replace(/<div class="page-container[^>]*>[\s\n\r]*(<div class="page-header"[^>]*>.*?<\/div>)?[\s\n\r]*(<div class="page-footer"[^>]*>.*?<\/div>)?[\s\n\r]*<\/div>/gi, '');

      return clean.trim();
  }

  // Focado apenas em A4 - Top Padding RESTAURADO PARA 32mm para margem perfeita
  function getEstilosFormato() {
      return { width: '210mm', height: '297mm', padding: '32mm 20mm 25mm 20mm' }; 
  }

  function moldarApresentacaoHtml(rawHtml: string) {
      let clean = purificarHTML(rawHtml);
      const conf = getEstilosFormato();
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

/* Aplicado para todas as páginas garantindo o tamanho A4 BLINDADO */
.page-container, .page-cover-img, .page-cover-pura, .page-cover-text, 
.cap-img-overlay, .cap-box-rounded, .cap-img-pura {
    background-color: var(--color-bg);
    width: ${conf.width} !important;
    height: ${conf.height} !important;
    min-width: ${conf.width} !important;
    min-height: ${conf.height} !important;
    max-width: ${conf.width} !important;
    max-height: ${conf.height} !important;
    flex-shrink: 0 !important;
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

.page-container::after, .page-cover-img::after, .page-cover-pura::after, .page-cover-text::after,
.cap-img-overlay::after, .cap-box-rounded::after, .cap-img-pura::after {
    content: '';
    position: absolute;
    top: 6mm; left: 6mm; right: 6mm; bottom: 6mm;
    pointer-events: none; z-index: 50;
    border: ${tipoBorda === 'single' ? '2px solid var(--color-primary)' : tipoBorda === 'double' ? '6px double var(--color-primary)' : tipoBorda === 'double-thin' ? '3px double var(--color-primary)' : 'none'};
}

/* Oculta a borda se a opção de borda for 'none' OU se for uma página inteira de imagem */
.page-cover-img::after, .page-cover-pura::after, .cap-img-overlay::after, .cap-box-rounded::after, .cap-img-pura::after {
    display: none !important;
}

/* CLASSE ESPECIAL DO TÍTULO NAS PÁGINAS EXCLUSIVAS (Capturada pelo Índice) */
h1.chapter-title-exclusive { color: #fff; font-size: 2.8rem; margin-top: 15px; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); z-index: 10; position: relative; text-align: center; width: 100%; }

/* BLINDAGEM DO DISPLAY PARA EXCLUSIVAS (Força a centralizar dentro do A4) */
.cap-img-overlay { display: flex; flex-direction: column; justify-content: ${alinhamentoCapitulo}; align-items: center; text-align: center; background-size: cover !important; background-position: center !important; background-repeat: no-repeat !important; color: #ffffff; }
.cap-icon { font-size: 40px; color: var(--color-secondary); margin-bottom: 10px; text-shadow: 1px 1px 3px rgba(0,0,0,0.8); z-index: 10; position: relative; }

.cap-box-rounded { display: flex; flex-direction: column; justify-content: ${alinhamentoCapitulo}; align-items: center; background-size: cover !important; background-position: center !important; background-repeat: no-repeat !important; }
.cap-box-inner { background: ${corBoxCapitulo}; padding: 35px 25px; border-radius: 20px; text-align: center; width: 85%; box-shadow: 0 10px 25px rgba(0,0,0,0.2); border: 2px solid var(--color-primary); z-index: 10; position: relative; }
.cap-box-inner h1.chapter-title-exclusive { margin:0; font-size: 2.2rem; color: var(--color-primary); text-shadow: none; }

.cap-img-pura { background-size: cover !important; background-position: center !important; background-repeat: no-repeat !important; display: block; }

/* CAPAS INICIAIS */
.page-cover-img { display: flex; flex-direction: column; justify-content: ${alinhamentoCapitulo}; align-items: center; text-align: center; background: url('${imagemCapaUrl}') center/cover no-repeat !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; color: #ffffff; }
.page-cover-img h1 { color: #fff; font-size: 3.5rem; margin-bottom: 1rem; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); }
.page-cover-pura { background: url('${imagemCapaUrl}') center/cover no-repeat !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page-cover-text { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; color: var(--color-primary); }
.page-cover-text h1 { font-size: 3.5rem; margin-bottom: 1.5rem; }

/* IMAGEM HORIZONTAL E TÍTULO PRINCIPAL */
.chapter-banner-img { width: 100%; height: 300px; object-fit: cover; border-radius: 8px; margin: 0.5rem 0 1.2rem 0; box-shadow: 0 4px 10px rgba(0,0,0,0.08); }
.chapter-title-inline { text-align: center; font-size: 2.1rem; margin-top: 0; margin-bottom: 1.2rem; color: var(--color-primary); font-weight: 800; line-height: 1.15; }

/* TÍTULOS DE TÓPICOS DENTRO DO CAPÍTULO (H3) */
h3.subtopic-title { font-weight: 800; font-size: 1.4rem; margin-top: 1.8rem; margin-bottom: 0.8rem; color: var(--color-primary); line-height: 1.2; text-align: left; }

/* CABEÇALHOS E RODAPÉS - Topo em 12mm padrão ouro */
.page-header { 
    position: absolute; top: 12mm; left: 18mm; right: 18mm; 
    display: flex; justify-content: space-between; align-items: flex-end;
    font-size: 8pt; color: var(--color-primary); opacity: 0.8;
    border-bottom: 1px solid rgba(0,0,0, 0.1); padding-bottom: 5px; 
    font-weight: 700; text-transform: uppercase; z-index: 20; letter-spacing: 0.5px;
}
.page-header span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 48%; }

.page-footer { 
    position: absolute; bottom: 10mm; left: 18mm; right: 18mm; 
    font-size: 9pt; color: var(--color-primary); font-weight: 600; z-index: 20; opacity: 0.8;
    ${estiloRodape.includes('centralizado') ? 'display: flex; justify-content: center; align-items: center;' : 'display: flex; justify-content: space-between; align-items: center;'}
    ${estiloRodape.includes('linha-superior') ? 'border-top: 1px solid rgba(0,0,0, 0.1); padding-top: 8px;' : ''}
}
.page-number::after { content: counter(ebook-page); }

.page-number.circulo { 
    display: inline-flex; justify-content: center; align-items: center;
    width: 26px; height: 26px; border-radius: 50%; 
    background-color: var(--color-primary); color: #ffffff !important; 
    font-size: 10px; font-weight: 800; margin-bottom: -3px; 
}
.page-number.circulo::after { color: #ffffff !important; }

h1, h2, h3, h4 { font-family: var(--font-heading); color: var(--color-primary); }
h1 { font-weight: 800; font-size: 2.2rem; margin-top: 0; margin-bottom: 1em; line-height: 1.2; text-align: center; }

h2:not(.chapter-title-inline) { font-weight: 700; font-size: 1.8rem; margin-top: 1.5rem; margin-bottom: 1.5rem; }

p { font-size: ${tamanhoFonteBase} !important; line-height: var(--line-spacing) !important; margin-top: 0 !important; margin-bottom: var(--p-spacing) !important; text-align: justify !important; text-indent: var(--text-indent) !important; hyphens: auto; -webkit-hyphens: auto; }

blockquote { page-break-inside: avoid; break-inside: avoid; font-style: italic; color: var(--color-text); border-left: 5px solid var(--color-secondary); background: rgba(0,0,0, 0.03); padding: 12px 18px; margin: 1rem 0; font-size: ${tamanhoFonteBase}; border-radius: 0 8px 8px 0; }
.highlight-box { background: rgba(139, 109, 79, 0.15); padding: 12px 18px; border-radius: 8px; margin: 1rem 0; font-weight: 500; font-size: ${tamanhoFonteBase}; }

img { max-width: 100%; height: auto; max-height: 35vh; border-radius: 0.5rem; margin: 1rem auto; display: block; object-fit: cover; page-break-inside: avoid; break-inside: avoid; }
ul, ol { margin-top: 0; margin-bottom: 1em; padding-left: 2rem; font-size: ${tamanhoFonteBase}; line-height: var(--line-spacing); }
li { margin-bottom: 0.4rem; page-break-inside: avoid; }

.toc-container { display: flex; flex-direction: column; width: 100%; margin: 1rem 0; z-index: 60; position: relative; }
.toc-item { display: flex; align-items: baseline; justify-content: space-between; width: 100%; text-decoration: none; color: var(--color-text); font-family: var(--font-body) !important; font-size: ${tamanhoFonteBase} !important; line-height: var(--line-spacing) !important; padding: 6px 0; cursor: pointer; margin-bottom: 0.2rem; }
.toc-item:hover { color: var(--color-secondary); }
.toc-dots { flex-grow: 1; border-bottom: 2px dotted var(--color-primary); margin: 0 8px; opacity: 0.3; }
.toc-page-num { font-weight: bold; color: var(--color-primary); }

/* SEÇÃO DO AUTOR - ALINHAMENTO FLEX PROFISSIONAL */
.page-container.author-page { display: block; }
.author-section { width: 100%; margin-top: 2rem; display: flex; align-items: center; gap: 2rem; page-break-inside: avoid; break-inside: avoid; }
.author-section.layout-topo { flex-direction: column; text-align: center; }
.author-section.layout-esquerda { flex-direction: row; text-align: left; }
.author-photo { flex-shrink: 0; object-fit: cover; box-shadow: 0 10px 15px rgba(0,0,0,0.1); }
.author-photo.circulo { border-radius: 50%; width: 150px; height: 150px; }
.author-photo.retangulo { border-radius: 8px; width: 130px; height: 180px; }
.author-bio { flex-grow: 1; }
.author-bio h2 { margin-top: 0; margin-bottom: 1rem; }

@page { size: A4 portrait; margin: 0; }
@media print {
    html, body { background: #ffffff !important; padding: 0 !important; margin: 0 !important; display: block !important; width: ${conf.width} !important; height: auto !important; }
    #ebook-container { width: 100%; padding: 0; margin: 0; }
    .page-container, .page-cover-img, .page-cover-pura, .page-cover-text, .cap-img-overlay, .cap-box-rounded, .cap-img-pura { 
        width: ${conf.width} !important; height: ${conf.height} !important; box-sizing: border-box !important; margin: 0 !important; padding: ${conf.padding} !important; page-break-after: always !important; box-shadow: none !important; overflow: hidden !important; position: relative !important; border: none !important;
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
  // FUNÇÕES DE AÇÃO PRINCIPAIS
  // ==========================================

  function handleImageUploadBtn(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          const base64Img = event.target?.result as string;
          if (elementoSelecionado && elementoSelecionado.tagName === 'img') {
              atualizarElemento('src', base64Img);
              (window as any).showNotification("Imagem substituída com sucesso!", "success");
          } else if (elementoSelecionado && (elementoSelecionado.bgImage !== undefined || elementoSelecionado.isBgTarget)) {
              atualizarElemento('bgImage', base64Img);
              (window as any).showNotification("Fundo substituído com sucesso!", "success");
          } else {
              setImagemCapaUrl(base64Img);
              (window as any).showNotification("Capa atualizada com sucesso!", "success");
          }
          if (imageInputRef.current) imageInputRef.current.value = '';
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

  // 📝 INICIAR NOVO LIVRO
  function iniciarNovoLivro() {
      if (confirm("ATENÇÃO: Tem certeza que deseja iniciar um novo livro? Todo o progresso atual não salvo será perdido.")) {
          localStorage.removeItem('ebook_draft_html');
          localStorage.removeItem('ebook_draft_prompt');
          const codEl = document.getElementById('codigoGerado') as HTMLTextAreaElement;
          const prevEl = document.getElementById('previewFrame') as HTMLIFrameElement;
          if (codEl) codEl.value = '';
          if (prevEl) prevEl.srcdoc = '';
          setLivroTitulo('');
          setProductContent('');
          (window as any).showNotification("Novo documento em branco criado.", "info");
      }
  }

  // 📚 SALVAR NA BIBLIOTECA LOCAL
  function salvarNaBiblioteca() {
      if (!livroTitulo || livroTitulo.trim() === '') {
          (window as any).showNotification("Dê um título ao E-book antes de salvar.", "error");
          return;
      }
      const codEl = document.getElementById('codigoGerado') as HTMLTextAreaElement;
      if (!codEl || codEl.value.trim() === '') {
          (window as any).showNotification("Não há conteúdo para salvar.", "error");
          return;
      }

      const id = Date.now().toString();
      const novoLivro = { id, titulo: livroTitulo, data: new Date().toLocaleDateString('pt-BR'), html: codEl.value, prompt: productContent };
      const novaBiblioteca = [...livrosSalvos, novoLivro];
      
      setLivrosSalvos(novaBiblioteca);
      localStorage.setItem('ebook_saved_books', JSON.stringify(novaBiblioteca));
      (window as any).showNotification("E-book salvo na sua Biblioteca Local!", "success");
  }

  function carregarDaBiblioteca(livro: any) {
      setLivroTitulo(livro.titulo);
      setProductContent(livro.prompt || '');
      aplicarHtmlNovo(livro.html, false);
      setModalBiblioteca(false);
      (window as any).showNotification(`Livro "${livro.titulo}" carregado.`, "success");
  }

  function excluirDaBiblioteca(id: string) {
      if (confirm("Tem certeza que deseja excluir este e-book da biblioteca?")) {
          const novaBiblioteca = livrosSalvos.filter(l => l.id !== id);
          setLivrosSalvos(novaBiblioteca);
          localStorage.setItem('ebook_saved_books', JSON.stringify(novaBiblioteca));
      }
  }

  function desfazerCodigo() {
    if (historicoCodigo.length === 0) { (window as any).showNotification("Nenhuma alteração para desfazer.", "error"); return; }
    const novoHistorico = [...historicoCodigo];
    const estadoAnterior = novoHistorico.pop();
    setHistoricoCodigo(novoHistorico);
    const codEl = document.getElementById('codigoGerado') as HTMLTextAreaElement;
    const prevEl = document.getElementById('previewFrame') as HTMLIFrameElement;
    if (codEl) {
        codEl.value = estadoAnterior || '';
        localStorage.setItem('ebook_draft_html', estadoAnterior || ''); 
    }
    if (prevEl) prevEl.srcdoc = (estadoAnterior || '') + getScriptPreview(indexShowSubtopics); 
    setElementoSelecionado(null);
    (window as any).showNotification("Ação desfeita com sucesso.", "success");
  }

  // BUSCADOR UNSPLASH ORIGINAL À PROVA DE FALHAS
  async function buscarImagemUnsplash() {
      if (!elementoSelecionado) return;
      (window as any).showNotification("Buscando no Unsplash...", "info");
      
      let keywords = "abstract"; 
      try {
          const instrucao = "Retorne APENAS 2 palavras-chave em inglês, separadas por vírgula, que representem visualmente este texto. Nenhuma palavra a mais.";
          const data = await chamarMotorIA(instrucao, [{ text: elementoSelecionado.text || elementoSelecionado.outerHTML }], true);
          
          if (data && data.html) {
              keywords = data.html.replace(/<[^>]*>?/gm, '').trim().replace(/[\n\r]/g, ' ').replace(/\s+/g, ',');
          }
      } catch (e) {
          console.error("Falha ao ler palavras-chave via Gemini, usando padrão.");
      }

      const url = `https://source.unsplash.com/1200x800/?${encodeURIComponent(keywords)}&t=${new Date().getTime()}`;
      let isBg = elementoSelecionado.tagName !== 'img';
      atualizarElemento(isBg ? 'bgImage' : 'src', url);
      (window as any).showNotification("Imagem do Unsplash adicionada!", "success");
  }

  // GERADOR GEMINI IA DEDICADO
  async function gerarImagemGemini() {
      if (!elementoSelecionado) return;
      setStatusApis({ texto: 'Gerando com Gemini AI...', processing: true });
      try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token || '';

          const promptParaGemini = `A highly detailed, professional illustration or photography representing: ${elementoSelecionado.text || 'book cover'}. Clean, cinematic lighting, no text, no watermarks.`;
          const response = await fetch('/api/gerar', {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}` 
              },
              body: JSON.stringify({
                  systemInstruction: '',
                  promptParts: [{ text: promptParaGemini }],
                  isImageGeneration: true 
              })
          });
          
          const data = await response.json();
          if(data.success && data.image) {
              const base64Url = `data:image/jpeg;base64,${data.image}`;
              let isBg = elementoSelecionado.tagName !== 'img';
              atualizarElemento(isBg ? 'bgImage' : 'src', base64Url);
              (window as any).showNotification("Imagem Gemini gerada!", "success");
          } else {
              (window as any).showNotification("Erro ao gerar imagem pela IA.", "error");
          }
      } catch (err) {
          (window as any).showNotification("Falha na API do Gemini Image.", "error");
      } finally {
          setStatusApis({ texto: 'Aguardando', processing: false });
      }
  }

  async function aplicarModificacaoGlobal() {
      const input = document.getElementById('ai_prompt_global') as HTMLInputElement;
      const comando = input?.value.trim();
      const codEl = document.getElementById('codigoGerado') as HTMLTextAreaElement;
      
      if(!comando) { (window as any).showNotification("Digite o que deseja alterar no e-book.", "error"); return; }
      if(!codEl || !codEl.value) { (window as any).showNotification("Nenhum E-book gerado para modificar.", "error"); return; }

      const instrucao = `Você é um Revisor Editorial Sênior. 
      Vou fornecer o HTML COMPLETO do E-book atual. Aplique a seguinte alteração global DE FORMA RIGOROSA E OBEDIENTE: "${comando}".
      
      REGRAS MÁXIMAS DE SEGURANÇA:
      1. PRESERVAÇÃO ABSOLUTA: Você é OBRIGADO a devolver o código HTML inteiro, do começo ao fim. NUNCA resuma ou apague o resto do livro.
      2. NUNCA adicione estilos inline <p style="...">. Mantenha as tags HTML intactas.`;

      const data = await chamarMotorIA(instrucao, [{text: `HTML ATUAL DO E-BOOK:\n${codEl.value}`}], false);

      if(data && data.html) {
          let htmlFinal = moldarApresentacaoHtml(purificarHTML(data.html));
          const prevEl = document.getElementById('previewFrame') as HTMLIFrameElement;
          
          setHistoricoCodigo((prev) => [...prev, codEl.value]); 
          codEl.value = htmlFinal; 
          localStorage.setItem('ebook_draft_html', htmlFinal);
          if (prevEl) prevEl.srcdoc = htmlFinal + getScriptPreview(indexShowSubtopics); 
          
          if(input) input.value = '';
          (window as any).showNotification("E-book modificado com sucesso!", "success");
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
      1. PRESERVAÇÃO DE ESTRUTURA: Se o elemento for uma <div class="page-container">, preserve OBRIGATORIAMENTE o cabeçalho (page-header) e o rodapé (page-footer) intactos. Não os apague.
      2. Retorne APENAS o código HTML modificado DESSA CAIXA/ELEMENTO específico. 
      3. Mantenha as classes originais.`;

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
      
      let cleanNovo = htmlNovo;
      const bodyMatch = cleanNovo.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) cleanNovo = bodyMatch[1];
      cleanNovo = cleanNovo.replace(/<!DOCTYPE[^>]*>/gi, '').replace(/<\/?html[^>]*>/gi, '').trim();
      const containerMatch = cleanNovo.match(/<div id="ebook-container">([\s\S]*?)<\/div>\s*$/i);
      if (containerMatch) cleanNovo = containerMatch[1];

      let lastBodyIndex = htmlBase.lastIndexOf('</body>');
      if(lastBodyIndex === -1) lastBodyIndex = htmlBase.lastIndexOf('</BODY>');
      
      if(lastBodyIndex !== -1) {
          let lastDivIndex = htmlBase.lastIndexOf('</div>', lastBodyIndex);
          if(lastDivIndex === -1) lastDivIndex = htmlBase.lastIndexOf('</DIV>', lastBodyIndex);
          
          if (lastDivIndex !== -1) {
              return htmlBase.substring(0, lastDivIndex) + '\n' + cleanNovo + '\n' + htmlBase.substring(lastDivIndex);
          }
      }
      
      return htmlBase.replace(/<\/div>\s*<\/body>\s*<\/html>/gi, '\n' + cleanNovo + '\n    </div>\n</body>\n</html>');
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

      if (codEl) { 
          setHistoricoCodigo((prev) => [...prev, codEl.value]); 
          codEl.value = htmlFinal; 
          localStorage.setItem('ebook_draft_html', htmlFinal);
      }
      if (prevEl) prevEl.srcdoc = htmlFinal + getScriptPreview(indexShowSubtopics); 
  }

  async function chamarMotorIA(systemInstructionText: string, promptParts: any[], isElementRefinement = false) {
    setStatusApis({ texto: isElementRefinement ? 'A IA processando...' : 'A IA está diagramando os capítulos...', processing: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const response = await fetch('/api/gerar', { 
          method: 'POST', 
          headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
          }, 
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
      if (errorMsg.includes('429') || errorMsg.toLowerCase().includes('quota')) { errorMsg = "Limite excedido (Quota). O sistema não gerou por falta de saldo/cota na API."; }
      if (isElementRefinement) throw new Error(errorMsg);
      (window as any).showNotification(errorMsg, 'error'); return null;
    } finally { setStatusApis({ texto: 'Aguardando', processing: false }); }
  }

  // ==== GERADOR DO BLOCO DO AUTOR NATIVO ====
  function obterBlocoAutorHtml() {
      let numSpan = estiloRodape.includes('circulo') ? '<span class="page-number circulo"></span>' : '<span class="page-number"></span>';
      let regraRodape = "";
      if (estiloRodape.includes('simples') || estiloRodape.includes('linha-superior')) { regraRodape = `<span>${livroAutores}</span>${numSpan}`; } 
      else { regraRodape = `${numSpan}`; }

      return `
      <div class="page-container author-page">
          <div class="page-header"><span>${livroTitulo || 'Título do Livro'}</span><span>SOBRE O AUTOR</span></div>
          <h2 id="sobre-o-autor" class="chapter-title-inline" style="opacity:0; position:absolute; z-index:-1;">Sobre o Autor</h2>
          <div class="author-section layout-${autorPosicao}">
              <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80" class="author-photo ${autorFormato}" alt="${livroAutores || 'Autor'}">
              <div class="author-bio">
                  <h2>${livroAutores || 'Sobre o Autor'}</h2>
                  <p>Substitua este texto com a sua biografia. Descreva sua trajetória, experiências e propósito profissional. Este espaço é dedicado a apresentar quem você é para o leitor.</p>
              </div>
          </div>
          <div class="page-footer">${regraRodape}</div>
      </div>`;
  }

  // ==== INSTRUÇÕES DO PROMPT ====
  function obterInstrucoesBase() {
      let numSpan = estiloRodape.includes('circulo') ? '<span class="page-number circulo"></span>' : '<span class="page-number"></span>';
      let regraRodape = "";
      if (estiloRodape.includes('simples') || estiloRodape.includes('linha-superior')) { regraRodape = `<span>${livroAutores}</span>${numSpan}`; } 
      else { regraRodape = `${numSpan}`; }

      let regraEstiloCapitulos = "";
      if (estiloCapitulos === 'padrao') {
          regraEstiloCapitulos = `
          Para ABRIR um novo capítulo, você é OBRIGADO a usar EXATAMENTE este bloco HTML (Página Exclusiva do Capítulo):
          <div class="page-container cap-img-overlay" style="background-image: url('URL_DA_IMAGEM_UNSPLASH_AQUI');">
              <div class="cap-icon"><i class="fas fa-book-open"></i></div>
              <h1 id="ID_DO_CAPITULO" class="chapter-title-exclusive">Capítulo X: Nome Exclusivo Deste Capítulo</h1>
          </div>
          NUNCA repita o nome do livro todo aí. Substitua 'URL_DA_IMAGEM_UNSPLASH_AQUI' por uma URL REAL fotográfica do Unsplash. NÃO INCLUA nenhum texto de parágrafo nesta mesma div!
          Após a div de capa, abra uma NOVA <div class="page-container"> normal com cabeçalho e rodapé. 
          OBRIGATÓRIO: No topo desta nova página, escreva EXATOS 2 PARÁGRAFOS CURTOS. E SOMENTE DEPOIS deles inicie o primeiro Título de Tópico (h3).`;
      } else if (estiloCapitulos === 'box-arredondado') {
          regraEstiloCapitulos = `
          Para ABRIR um novo capítulo, você é OBRIGADO a usar EXATAMENTE este bloco HTML (Página Exclusiva do Capítulo):
          <div class="page-container cap-box-rounded" style="background-image: url('URL_DA_IMAGEM_UNSPLASH_AQUI');">
              <div class="cap-box-inner"><h1 id="ID_DO_CAPITULO" class="chapter-title-exclusive">Capítulo X: Nome Exclusivo Deste Capítulo</h1></div>
          </div>
          NUNCA repita o nome do livro todo aí. Substitua 'URL_DA_IMAGEM_UNSPLASH_AQUI' por uma URL REAL fotográfica do Unsplash. NÃO INCLUA nenhum texto de parágrafo nesta mesma div!
          Após a div de capa, abra uma NOVA <div class="page-container"> normal com cabeçalho e rodapé. 
          OBRIGATÓRIO: No topo desta nova página, escreva EXATOS 2 PARÁGRAFOS CURTOS. E SOMENTE DEPOIS deles inicie o primeiro Título de Tópico (h3).`;
      } else if (estiloCapitulos === 'imagem-pura') {
          regraEstiloCapitulos = `
          Para ABRIR um novo capítulo, você é OBRIGADO a criar UMA PÁGINA EXCLUSIVA apenas com a imagem de fundo:
          <div class="page-container cap-img-pura" style="background-image: url('URL_DA_IMAGEM_UNSPLASH_AQUI');"></div>
          ATENÇÃO: Substitua 'URL_DA_IMAGEM_UNSPLASH_AQUI' por uma URL REAL fotográfica do Unsplash. NÃO INCLUA texto ou título nesta div!
          Após ela, abra uma NOVA <div class="page-container"> normal, coloque o título <h2 id="ID_DO_CAPITULO" class="chapter-title-inline">Capítulo X: Nome Exclusivo Deste Capítulo</h2> no topo. 
          OBRIGATÓRIO: Imediatamente abaixo do h2, escreva EXATOS 2 PARÁGRAFOS CURTOS e SOMENTE DEPOIS inicie o primeiro Título de Tópico (h3).`;
      } else if (estiloCapitulos === 'inline-imagem') {
          regraEstiloCapitulos = `
          NÃO crie página de capa exclusiva de fundo. Para abrir o capítulo, USE UM ÚNICO CONTAINER com a Imagem no topo:
          <div class="page-container">
              <div class="page-header"><span>${livroTitulo}</span><span>NOME DO CAPÍTULO</span></div>
              <h2 id="ID_DO_CAPITULO" class="chapter-title-inline">Capítulo X: Nome Exclusivo Deste Capítulo</h2>
              <img src="URL_DA_IMAGEM_UNSPLASH_AQUI" class="chapter-banner-img" alt="Ilustração do Capítulo" />
              <p>[Primeiro parágrafo curto...]</p>
              <p>[Segundo parágrafo curto...]</p>
              <h3 class="subtopic-title">Nome do Tópico</h3>
              <p>[Continuar texto e criar mais tópicos h3...]</p>
              <div class="page-footer">${regraRodape}</div>
          </div>
          ATENÇÃO: Substitua a URL por uma foto real do Unsplash (ex: https://source.unsplash.com/random/1200x800/?tema). Nunca repita o nome do livro no lugar do nome do capitulo. 
          OBRIGATÓRIO: A imagem OBRIGATORIAMENTE deve ser seguida por EXATOS 2 PARÁGRAFOS CURTOS antes do primeiro <h3> para preencher a página.`;
      } else {
          regraEstiloCapitulos = `
          NÃO crie página de capa exclusiva e NÃO use imagens. O capítulo deve iniciar como texto contínuo:
          <div class="page-container">
              <div class="page-header"><span>${livroTitulo}</span><span>NOME DO CAPÍTULO</span></div>
              <h2 id="ID_DO_CAPITULO" class="chapter-title-inline">Capítulo X: Nome Exclusivo Deste Capítulo</h2>
              <p>[Primeiro parágrafo curto...]</p>
              <p>[Segundo parágrafo curto...]</p>
              <h3 class="subtopic-title">Nome do Tópico</h3>
              <p>[Continuar texto e criar mais tópicos h3...]</p>
              <div class="page-footer">${regraRodape}</div>
          </div>
          OBRIGATÓRIO: O h2 OBRIGATORIAMENTE deve ser seguido por EXATOS 2 PARÁGRAFOS CURTOS antes do primeiro <h3>. Nunca use <img> neste modo.`;
      }

      let regraCapaHtml = "";
      if (tipoCapa === 'imagem-texto') {
          regraCapaHtml = `<div class="page-container page-cover-img"><h1>${livroTitulo || 'Meu E-book'}</h1><p>Por ${livroAutores || 'Autor'}</p></div>`;
      } else if (tipoCapa === 'imagem-pura') {
          regraCapaHtml = `<div class="page-container page-cover-pura"></div>`;
      } else {
          regraCapaHtml = `<div class="page-container page-cover-text"><h1 style="font-size: 3rem; margin-bottom: 1.5rem; text-transform: uppercase;">${livroTitulo || 'Meu E-book'}</h1><div style="width: 80px; height: 2px; background: var(--color-primary); margin: 0 auto 1.5rem auto;"></div><p style="font-size: 1.3rem; font-style: italic;">Por ${livroAutores || 'Autor'}</p></div>`;
      }

      const regraModo = modoConteudo === 'rigoroso' 
          ? `MODO RIGOROSO (REVISOR E FORMATADOR): VOCÊ ESTÁ PROIBIDO DE INVENTAR CONTEÚDO NOVO. Sua única função é pegar o texto fornecido pelo usuário, corrigir pontuações e ortografia, e formata-lo perfeitamente com as tags HTML solicitadas, respeitando exatamente a quantidade de conteúdo original e dividindo nos containers apropriados. Se o texto for pequeno, deixe-o pequeno.` 
          : `MODO EXPANDIDO (CRIATIVO): O usuário forneceu um tema ou rascunho. Atue como um autor best-seller e EXPANDA esse texto gerando um e-book muito profundo, detalhado e rico.`;

      const regrasComuns = `
      DIRETRIZES ESTRITAS DE VOLUME, ESTRUTURA E ÍNDICE (LEIA COM ATENÇÃO MÁXIMA):
      1. REGRA DE OPERAÇÃO: ${regraModo}
      2. REGRA DE NOMENCLATURA (ÍNDICE E TÍTULOS): NUNCA omita a palavra "Capítulo". O título de cada capítulo DEVE OBRIGATORIAMENTE começar com "Capítulo X: " (Ex: Capítulo 1: O Despertar). NUNCA repita o nome do livro como nome do capítulo.
      3. REGRA DO INÍCIO DO CAPÍTULO E TÓPICOS (H3): Logo após o Título do capítulo (ou Imagem), OBRIGATORIAMENTE escreva EXATOS 2 PARÁGRAFOS CURTOS e SOMENTE DEPOIS inicie os subtópicos <h3>.
      4. REGRA DE VOLUME EXTREMO (3 PÁGINAS POR CAPÍTULO): Aprofunde muito o texto. Gere NO MÍNIMO 4 a 5 subtópicos (<h3>) por capítulo. Dentro de cada subtópico, escreva de 3 a 5 parágrafos curtos. Parágrafos curtos (3 a 4 linhas) são essenciais para leitura e corte automático de página fluir perfeitamente. NUNCA crie capítulos rápidos.
      5. ELEMENTOS VISUAIS OBRIGATÓRIOS: Para quebrar a leitura, em TODOS os capítulos você DEVE incluir pelo menos uma citação (<blockquote class="highlight-box">Texto da citação</blockquote>) e pelo menos um quadro ilustrativo (<div class="highlight-box">Quadro Resumo</div>). Espalhe-os de forma ALEATÓRIA pelo capítulo, nunca um colado no outro.
      6. ESTRUTURA ÚNICA POR CAPÍTULO: NUNCA quebre a página manualmente no meio do capítulo! Coloque TODOS OS PARÁGRAFOS de um capítulo inteiro dentro de UMA ÚNICA <div class="page-container">. Meu sistema cortará as páginas automaticamente!
      7. ÍNDICE DINÂMICO: Apenas crie o bloco vazio do índice <div class="page-container"><div class="page-header"><span>${livroTitulo}</span><span>ÍNDICE</span></div><h2 class="chapter-title-inline">Índice</h2><div class="toc-container"></div><div class="page-footer">${regraRodape}</div></div>. O meu sistema fará os links.
      8. PROIBIDO CAPAS DUPLAS E ÍNDICES DUPLOS: Se for instruído a continuar os capítulos, JAMAIS repita o Índice, Capa ou Introdução.
      9. REGRAS DE IMAGEM: Use APENAS URLs fotográficas REAIS do Unsplash (ex: https://source.unsplash.com/random/1200x800/?CHAVE). Substitua 'CHAVE' pelo termo em inglês.
      `;

      return { regrasComuns, regraCapaHtml, regraRodape, regraEstiloCapitulos };
  }

  async function gerarLivroCompleto() {
    const content = productContent.trim();
    if (!content) { (window as any).showNotification('Insira o texto base.', 'error'); return; }

    const { regrasComuns, regraCapaHtml, regraRodape, regraEstiloCapitulos } = obterInstrucoesBase();

    const instrucao = `Atue como Especialista Editorial. Gere o E-book COMPLETO em HTML.
    ${regrasComuns}
    OBRIGAÇÕES DESTE MODO (COMPLETO):
    - Gere a Capa OBRIGATORIAMENTE COM ESTE CÓDIGO EXATO: 
      ${regraCapaHtml}
    - Gere o Índice OBRIGATORIAMENTE DENTRO DE UMA PÁGINA: 
      <div class="page-container">
          <div class="page-header"><span>${livroTitulo}</span><span>ÍNDICE</span></div>
          <h2 class="chapter-title-inline">Índice</h2>
          <div class="toc-container"></div>
          <div class="page-footer">${regraRodape}</div>
      </div>
    
    - A INTRODUÇÃO DEVE USAR UM ÚNICO CONTAINER E SER DENSA: 
      <!-- PROIBIDO USAR TAG IMG AQUI -->
      <div class="page-container">
          <div class="page-header"><span>${livroTitulo}</span><span>INTRODUÇÃO</span></div>
          <h2 id="intro" class="chapter-title-inline">Introdução</h2>
          <p>[Parágrafo curto 1...]</p>
          <p>[Parágrafo curto 2...]</p>
          <h3 class="subtopic-title">O Começo da Jornada</h3>
          <p>[Parágrafo curto 3...]</p>
          ... (Gere no total 10 a 12 parágrafos curtos para preencher pelo menos 2 páginas, SEM IMAGENS)
          <div class="page-footer">${regraRodape}</div>
      </div>
    
    - Gere TODOS os capítulos solicitados aplicando RIGOROSAMENTE A ESTRUTURA ABAIXO PARA CADA CAPÍTULO:
      ${regraEstiloCapitulos}
    
    - OBRIGATÓRIO (MOLDE FINAL DA IA): Ao chegar na conclusão, use EXATAMENTE esta estrutura HTML para finalizar o livro:
      <!-- PROIBIDO USAR TAG IMG AQUI -->
      <div class="page-container">
          <div class="page-header"><span>${livroTitulo}</span><span>CONCLUSÃO</span></div>
          <h2 id="conclusao" class="chapter-title-inline">Conclusão</h2>
          <p>[Escreva a conclusão com 6 a 8 parágrafos curtos a médios preenchendo a folha dentro desta única div, SEM IMAGENS...]</p>
          <div class="page-footer">${regraRodape}</div>
      </div>

      AVISO: NUNCA crie a página de autor. O sistema fará isso nativamente ao receber a sua resposta. Apenas termine fechando a div de Conclusão.
    `;

    const data = await chamarMotorIA(instrucao, [{ text: `TEMA BASE:\n"""\n${content}\n"""` }], false);
    if (data && data.html) {
        let htmlFinal = data.html + '\n' + obterBlocoAutorHtml();
        aplicarHtmlNovo(htmlFinal, false);
        (window as any).showNotification("E-book completo gerado com sucesso!", "success");
    }
  }

  async function iniciarEbookEtapas() {
      const content = productContent.trim();
      if (!content) { (window as any).showNotification('Insira o texto base.', 'error'); return; }

      const { regrasComuns, regraCapaHtml, regraRodape } = obterInstrucoesBase();

      const instrucao = `Atue como Especialista Editorial. Você vai INICIAR um e-book gerando APENAS a estrutura base e a introdução.
      ${regrasComuns}
      OBRIGAÇÕES DESTE MODO (PASSO 1 - INÍCIO):
      1. GERE A CAPA OBRIGATORIAMENTE COM ESTE CÓDIGO EXATO: 
         ${regraCapaHtml}
      2. GERE O ÍNDICE OBRIGATORIAMENTE DENTRO DE UMA PÁGINA: 
         <div class="page-container">
            <div class="page-header"><span>${livroTitulo}</span><span>ÍNDICE</span></div>
            <h2 class="chapter-title-inline">Índice</h2>
            <div class="toc-container"></div>
            <div class="page-footer">${regraRodape}</div>
         </div>
      
      3. A INTRODUÇÃO DEVE USAR APENAS UMA DIV ÚNICA E TEXTO LONGO E DENSO: 
         <!-- PROIBIDO USAR TAG IMG AQUI -->
         <div class="page-container">
            <div class="page-header"><span>${livroTitulo}</span><span>INTRODUÇÃO</span></div>
            <h2 id="intro" class="chapter-title-inline">Introdução</h2>
            <p>[Parágrafo curto 1...]</p>
            <p>[Parágrafo curto 2...]</p>
            <h3 class="subtopic-title">Visão Geral</h3>
            <p>[Continue gerando de 10 a 12 parágrafos no total, SEM IMAGENS...]</p>
            <div class="page-footer">${regraRodape}</div>
         </div>
      
      4. ORDEM MÁXIMA DE PARADA: PARE IMEDIATAMENTE APÓS A ÚNICA DIV DA INTRODUÇÃO. NÃO escreva o Capítulo 1 ainda.
      `;

      const data = await chamarMotorIA(instrucao, [{ text: `TEMA BASE PARA CRIAR O ÍNDICE E A INTRODUÇÃO:\n"""\n${content}\n"""` }], false);
      if (data && data.html) {
          aplicarHtmlNovo(data.html, false);
          (window as any).showNotification("Passo 1 Concluído! Capa, Índice e Introdução gerados.", "success");
      }
  }

  async function continuarEbookEtapas() {
      const content = productContent.trim();
      const codEl = document.getElementById('codigoGerado') as HTMLTextAreaElement;
      const currentHtml = codEl?.value || '';

      if (!currentHtml.includes('page-container')) { (window as any).showNotification('Gere o Passo 1 primeiro!', 'error'); return; }

      const { regrasComuns, regraEstiloCapitulos } = obterInstrucoesBase();

      const instrucao = `Atue como Especialista Editorial. Você vai CONTINUAR a escrita de um e-book já existente.
      ${regrasComuns}
      OBRIGAÇÕES DESTE MODO (PASSO 2 - MEIO):
      1. PROIBIÇÃO ABSOLUTA CRÍTICA: Sua resposta deve começar DIRETAMENTE com <div class="page-container"> do novo capítulo. É EXTREMAMENTE PROIBIDO gerar a capa. PROIBIDO gerar o Índice. PROIBIDO repetir a Introdução.
      2. IDENTIFIQUE DE ONDE CONTINUAR: Leia o HTML atual para saber em qual capítulo parou e comece pelo próximo (ex: se parou no 2, faça o 3 e 4).
      3. APLIQUE O ESTILO DEFINIDO E A REGRA DE CONTEINER ÚNICO POR CAPÍTULO: 
         ${regraEstiloCapitulos}
      4. RETORNE AS DIVS COMPLETAS: Retorne TODO O CÓDIGO HTML COMPLETO DOS NOVOS CAPÍTULOS. NÃO pule os IDs, use o prefixo "Capítulo X:" no título.
      `;

      const data = await chamarMotorIA(instrucao, [
          { text: `CÓDIGO HTML ATUAL DO LIVRO (LEIA PARA SABER ONDE PAROU E QUAIS IDs USAR):\n"""\n${currentHtml}\n"""` },
          { text: `INSTRUÇÕES EXTRAS:\n"""\n${content || 'Gere os próximos capítulos garantindo volume de 3 páginas cheias por capítulo.'}\n"""` }
      ], false);
      
      if (data && data.html) {
          aplicarHtmlNovo(data.html, true);
          (window as any).showNotification("Passo 2 Concluído! Próximos capítulos adicionados.", "success");
      }
  }

  async function finalizarEbookEtapas() {
      const codEl = document.getElementById('codigoGerado') as HTMLTextAreaElement;
      if (!codEl?.value.includes('page-container')) { (window as any).showNotification('Gere o livro antes de finalizar.', 'error'); return; }

      const { regrasComuns, regraRodape } = obterInstrucoesBase();

      const instrucao = `Atue como Especialista Editorial. Você vai FINALIZAR a escrita do e-book.
      ${regrasComuns}

      OBRIGAÇÕES DESTE MODO (PASSO 3 - FIM):
      1. PROIBIÇÃO ABSOLUTA: Sua resposta deve conter APENAS o bloco da conclusão. Não crie capas ou capítulos adicionais.
      2. Você DEVE obrigatoriamente usar EXATAMENTE o molde de código HTML abaixo para finalizar o livro. 

      <!-- PROIBIDO USAR TAG IMG AQUI -->
      <div class="page-container">
          <div class="page-header"><span>${livroTitulo}</span><span>CONCLUSÃO</span></div>
          <h2 id="conclusao" class="chapter-title-inline">Conclusão</h2>
          <p>[Parágrafo curto para preencher espaço...]</p>
          <p>[Parágrafo curto para preencher espaço...]</p>
          <p>[Parágrafo curto para preencher espaço...]</p>
          <p>[Escreva a conclusão densa com vários parágrafos preenchendo o espaço dentro desta mesma div, SEM IMAGENS...]</p>
          <div class="page-footer">${regraRodape}</div>
      </div>

      NUNCA INVENTE A PÁGINA DO AUTOR. O SISTEMA FARÁ ISSO. Termine apenas fechando a div de Conclusão.
      `;

      const data = await chamarMotorIA(instrucao, [{ text: `TEMA DO E-BOOK (Para basear a conclusão):\n"""\n${livroTitulo}\n"""` }], false);
      if (data && data.html) {
          let htmlFinal = data.html + '\n' + obterBlocoAutorHtml();
          aplicarHtmlNovo(htmlFinal, true);
          (window as any).showNotification("Passo 3 Concluído! Conclusão e Autores gerados.", "success");
      }
  }

  // ==========================================
  // EFEITOS E INTERFACE
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
                localStorage.setItem('ebook_draft_html', htmlLimpo);
            }
        }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fontFamily, tamanhoFonteBase, livroTitulo, tipoBorda, tipoCapa, imagemCapaUrl, espacamentoLinhas, espacamentoParagrafo, recuoParagrafo, paletaCores, corManualPri, corManualSec, corManualText, corManualBg, estiloRodape, alinhamentoCapitulo, corBoxCapitulo, autorPosicao, autorFormato, htmlTemplate, livroAutores]);

  useEffect(() => {
    const codEl = document.getElementById('codigoGerado') as HTMLTextAreaElement;
    const prevEl = document.getElementById('previewFrame') as HTMLIFrameElement;
    if (codEl && codEl.value && prevEl) {
        prevEl.srcdoc = moldarApresentacaoHtml(codEl.value) + getScriptPreview(indexShowSubtopics);
    }
  }, [fontFamily, tamanhoFonteBase, livroTitulo, tipoBorda, tipoCapa, imagemCapaUrl, espacamentoLinhas, espacamentoParagrafo, recuoParagrafo, paletaCores, corManualPri, corManualSec, corManualText, corManualBg, estiloRodape, alinhamentoCapitulo, corBoxCapitulo, autorPosicao, autorFormato, htmlTemplate, indexShowSubtopics, livroAutores]);

  const isTextElement = elementoSelecionado ? ['p', 'h1', 'h2', 'h3', 'h4', 'span', 'li', 'a', 'blockquote', 'strong', 'em', 'i', 'b'].includes(elementoSelecionado.tagName.toLowerCase()) : false;

  return (
    <>
      {/* 📱 AVISO MOBILE */}
      <div className="md:hidden fixed inset-0 z-[99999] bg-slate-900 text-white flex flex-col items-center justify-center p-8 text-center">
          <i className="fas fa-desktop text-6xl mb-6 text-indigo-400"></i>
          <h2 className="text-2xl font-black mb-3">Acesso Restrito ao Computador</h2>
          <p className="text-base text-slate-300">Para garantir uma experiência de nível profissional na edição e diagramação do seu E-book, o painel do E-bookPro deve ser acessado por uma tela maior.</p>
      </div>

      {/* 💻 APP DESKTOP */}
      <div className="hidden md:flex h-screen overflow-hidden relative bg-slate-100 text-slate-800 font-sans selection:bg-indigo-100">
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

        <input type="file" ref={imageInputRef} onChange={handleImageUploadBtn} accept="image/*" className="hidden" />

        {statusApis.processing && (
            <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center">
                <div className="w-14 h-14 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-5"></div>
                <p className="text-slate-800 font-black text-xl tracking-tight mb-2">{statusApis.texto}</p>
                <p className="text-slate-500 font-medium text-sm">Organizando estrutura e conteúdo editorial...</p>
            </div>
        )}

        {/* 📚 MODAL BIBLIOTECA LOCAL */}
        {modalBiblioteca && (
            <div className="fixed inset-0 z-[99998] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
                    <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
                        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><i className="fas fa-book text-indigo-600"></i> Seus E-books Salvos</h2>
                        <button onClick={() => setModalBiblioteca(false)} className="text-slate-400 hover:text-slate-600"><i className="fas fa-times text-xl"></i></button>
                    </div>
                    <div className="p-5 max-h-[60vh] overflow-y-auto">
                        {livrosSalvos.length === 0 ? (
                            <div className="text-center py-10 text-slate-400">
                                <i className="fas fa-folder-open text-4xl mb-3 opacity-30"></i>
                                <p className="font-bold">Sua biblioteca está vazia</p>
                                <p className="text-sm mt-1">Salve seus e-books clicando em "Salvar Local" no topo da tela.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {livrosSalvos.map(livro => (
                                    <div key={livro.id} className="border border-slate-200 rounded-xl p-4 flex justify-between items-center hover:border-indigo-300 hover:shadow-md transition bg-white">
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-base">{livro.titulo}</h3>
                                            <p className="text-xs text-slate-400 font-medium mt-1"><i className="far fa-calendar-alt"></i> Salvo em: {livro.data}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => carregarDaBiblioteca(livro)} className="bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white font-bold px-4 py-2 rounded-lg text-xs transition">Carregar</button>
                                            <button onClick={() => excluirDaBiblioteca(livro.id)} className="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white font-bold px-3 py-2 rounded-lg text-xs transition"><i className="fas fa-trash"></i></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
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

                        <div className="p-4 bg-indigo-50 border-b border-indigo-100 shadow-sm">
                            <label className="input-label text-indigo-900 mb-2"><i className="fas fa-bolt mr-1 text-yellow-500"></i> Modificação Global no E-book</label>
                            <textarea id="ai_prompt_global" rows={2} className="input-standard text-xs mb-2 border-indigo-200 shadow-inner" placeholder="Ex: Adicionar um quadro em todo final de capítulo."></textarea>
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
                                            {(elementoSelecionado.tagName === 'img' || elementoSelecionado.bgImage || elementoSelecionado.isBgTarget) && (
                                                <button onClick={() => imageInputRef.current?.click()} className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 transition flex items-center bg-indigo-50 border border-indigo-200 px-2 py-1 rounded shadow-sm"><i className="fas fa-upload mr-1"></i> Upload PC</button>
                                            )}
                                            <button onClick={() => {
                                                let el = document.getElementById('previewFrame') as HTMLIFrameElement;
                                                el.contentWindow?.postMessage({ type: 'DELETE_ELEMENT', id: elementoSelecionado.id }, '*');
                                            }} className="text-[9px] font-bold text-red-500 hover:text-red-700 transition flex items-center bg-red-50 border border-red-200 hover:border-red-400 px-2 py-1 rounded shadow-sm"><i className="fas fa-trash-alt mr-1"></i> Apagar</button>
                                        </div>
                                    </div>

                                    <div className="mt-2 mb-4">
                                        <label className="input-label mb-2 text-indigo-700 flex items-center gap-1"><i className="fas fa-magic text-yellow-500"></i> Editar este trecho com IA</label>
                                        <textarea id="ai_prompt_local" rows={2} className="input-standard text-xs mb-2 border-indigo-200 shadow-inner" placeholder="Ex: Reescreva este parágrafo em um tom mais persuasivo..."></textarea>
                                        <button onClick={aplicarModificacaoLocal} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-[10px] uppercase tracking-wide py-2 rounded-lg transition shadow-sm">Aplicar IA no Selecionado</button>
                                    </div>

                                    {(elementoSelecionado.tagName === 'img' || elementoSelecionado.bgImage || elementoSelecionado.isBgTarget) && (
                                        <div className="space-y-3 pt-3 border-t border-slate-100">
                                            <div>
                                                <label className="input-label mb-2 text-indigo-800">🖼️ Controles de Imagem</label>
                                                <div className="grid grid-cols-2 gap-2 mb-3">
                                                    <button onClick={buscarImagemUnsplash} className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-[9px] uppercase py-2 rounded shadow-sm transition">
                                                        <i className="fas fa-search mr-1"></i> Buscar Unsplash
                                                    </button>
                                                    <button onClick={gerarImagemGemini} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[9px] uppercase py-2 rounded shadow-sm transition">
                                                        <i className="fas fa-magic mr-1"></i> Gerar IA (Gemini)
                                                    </button>
                                                </div>
                                                <input type="text" value={elementoSelecionado.src || elementoSelecionado.bgImage} onChange={(e) => atualizarElemento(elementoSelecionado.tagName === 'img' ? 'src' : 'bgImage', e.target.value)} className="input-standard text-[10px] mb-2 font-mono text-slate-500" placeholder="URL da imagem (cole aqui)..." />
                                            </div>

                                            {(elementoSelecionado.bgImage || elementoSelecionado.isBgTarget) && (
                                                <div className="mt-3 pt-3 border-t border-slate-100">
                                                    <label className="input-label mb-1">Escurecer Fundo (Opacidade para Leitura)</label>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-slate-500 font-bold">0%</span>
                                                        <input 
                                                            type="range" min="0" max="1" step="0.05" defaultValue="0" 
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                const newBg = val === "0" ? `url('${elementoSelecionado.bgImage}')` : `linear-gradient(rgba(0,0,0,${val}), rgba(0,0,0,${val})), url('${elementoSelecionado.bgImage}')`;
                                                                const iframe = document.getElementById('previewFrame') as HTMLIFrameElement;
                                                                iframe.contentWindow?.postMessage({ type: 'UPDATE_ELEMENT', id: elementoSelecionado.id, rawBgImage: newBg }, '*');
                                                            }} 
                                                            className="flex-1 accent-indigo-600 cursor-pointer" 
                                                        />
                                                        <span className="text-[10px] text-slate-500 font-bold">100%</span>
                                                    </div>
                                                    <button onClick={() => atualizarElemento('bgImage', '')} className="w-full mt-3 bg-orange-50 border border-orange-200 text-orange-700 font-bold text-[9px] uppercase py-2 rounded transition hover:bg-orange-100"><i className="fas fa-times-circle mr-1"></i> Remover Imagem de Fundo</button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {(!elementoSelecionado.isBgTarget && isTextElement) && (
                                        <div className="pt-3 border-t border-slate-100">
                                            <label className="input-label mb-2">Edição Manual de Texto</label>
                                            <textarea rows={5} value={elementoSelecionado.text} onChange={(e) => atualizarElemento('text', e.target.value, true)} className="input-standard resize-y shadow-inner text-sm leading-relaxed font-serif"></textarea>
                                            
                                            <div className="mt-3 flex gap-2">
                                                <button onClick={() => transformarEmNode('blockquote')} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[9px] uppercase py-2 rounded border border-slate-300 transition"><i className="fas fa-quote-right mr-1"></i> Virar Citação</button>
                                                <button onClick={() => transformarEmNode('div', 'highlight-box')} className="flex-1 bg-yellow-50 hover:bg-yellow-100 text-yellow-800 font-bold text-[9px] uppercase py-2 rounded border border-yellow-200 transition"><i className="fas fa-highlighter mr-1"></i> Destacar Fundo</button>
                                            </div>
                                        </div>
                                    )}

                                    {(!elementoSelecionado.isBgTarget && !isTextElement && elementoSelecionado.tagName !== 'img') && (
                                        <div className="pt-3 border-t border-slate-100">
                                            <div className="text-center p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-[10px] leading-relaxed">
                                                <i className="fas fa-layer-group mb-1.5 text-indigo-400 text-lg block"></i>
                                                <strong>Container Estrutural</strong><br/>
                                                A edição manual de texto está desabilitada aqui. Use a <strong>IA acima</strong> para alterar toda a página ou clique num parágrafo.
                                            </div>
                                        </div>
                                    )}

                                </div>

                                {elementoSelecionado.tagName !== 'img' && (
                                    <div className="panel-section grid grid-cols-2 gap-4 border-t border-slate-100 mt-3">
                                        <div>
                                            <label className="input-label mb-2 text-[9px]">Cor do Texto</label>
                                            <input type="color" value={elementoSelecionado.textColor || '#1e1914'} onChange={(e) => atualizarElemento('textColor', e.target.value)} className="w-full h-8 rounded cursor-pointer border-none" />
                                        </div>
                                        <div>
                                            <label className="input-label mb-2 text-[9px]">Cor Fundo (Box)</label>
                                            <input type="color" value={elementoSelecionado.bgColor || '#ffffff'} onChange={(e) => atualizarElemento('bgColor', e.target.value)} className="w-full h-8 rounded cursor-pointer border-none" />
                                        </div>
                                        <div className="col-span-2">
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="input-label mb-0 text-[9px]">Tamanho Fonte</label>
                                                <span className="text-[10px] font-bold text-indigo-600">{elementoSelecionado.fontSize || 16}px</span>
                                            </div>
                                            <input type="range" min="10" max="60" value={elementoSelecionado.fontSize || 16} onChange={(e) => atualizarElemento('fontSize', parseInt(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-2" />
                                        </div>
                                    </div>
                                )}
                                
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
                        {/* 1. CONFIGURAÇÕES DE DESIGN GERAL */}
                        <div>
                            <h3 className="text-xs font-black uppercase text-slate-800 mb-3.5 tracking-wide flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-500">1</span> Capa & Design</h3>
                            <div className="space-y-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                                <div className="pt-3 border-t border-slate-100">
                                    <label className="input-label mb-2">Paleta de Cores</label>
                                    <select value={paletaCores} onChange={(e) => setPaletaCores(e.target.value as any)} className="input-standard font-medium text-slate-800">
                                        <option value="classico">Clássico (Branco & Marrom)</option>
                                        <option value="moderno">Moderno (Branco & Azul Vivo)</option>
                                        <option value="sepia">Sépia Literário (Creme & Marrom)</option>
                                        <option value="dark">Dark Elegante (Grafite & Roxo)</option>
                                        <option value="manual">Cores Manuais (Escolha as cores)</option>
                                    </select>
                                </div>

                                {paletaCores === 'manual' && (
                                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                                        <div><label className="input-label mb-2 text-[9px]">Cor Primária</label><input type="color" value={corManualPri} onChange={(e) => setCorManualPri(e.target.value)} className="w-full h-8 rounded border-none" /></div>
                                        <div><label className="input-label mb-2 text-[9px]">Cor Secundária</label><input type="color" value={corManualSec} onChange={(e) => setCorManualSec(e.target.value)} className="w-full h-8 rounded border-none" /></div>
                                        <div><label className="input-label mb-2 text-[9px]">Cor do Texto</label><input type="color" value={corManualText} onChange={(e) => setCorManualText(e.target.value)} className="w-full h-8 rounded border-none" /></div>
                                        <div><label className="input-label mb-2 text-[9px]">Cor do Fundo</label><input type="color" value={corManualBg} onChange={(e) => setCorManualBg(e.target.value)} className="w-full h-8 rounded border-none" /></div>
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

                                <div className="pt-3 border-t border-slate-100">
                                    <label className="input-label mb-2">Estilo do Rodapé</label>
                                    <select value={estiloRodape} onChange={(e) => setEstiloRodape(e.target.value as any)} className="input-standard font-medium text-slate-800">
                                        <option value="simples">Simples (Autor esq. | Número dir.)</option>
                                        <option value="simples-circulo">Simples + Número no Círculo Colorido</option>
                                        <option value="linha-superior">Com Linha Superior de Divisão</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* 2. CAPÍTULOS E AUTORES */}
                        <div>
                            <h3 className="text-xs font-black uppercase text-slate-800 mb-3.5 tracking-wide flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-500">2</span> Capítulos & Autores</h3>
                            <div className="space-y-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                                <div>
                                    <label className="input-label mb-2">Títulos de Capítulo</label>
                                    <select value={estiloCapitulos} onChange={(e) => setEstiloCapitulos(e.target.value as any)} className="input-standard font-medium text-slate-800">
                                        <option value="padrao">Página Exclusiva (Imagem Fundo + Texto + Ícone)</option>
                                        <option value="box-arredondado">Página Exclusiva (Imagem + Box Branco Arredondado)</option>
                                        <option value="imagem-pura">Página Exclusiva (Apenas a Imagem s/ texto)</option>
                                        <option value="inline-imagem">Texto Contínuo com Imagem Abaixo do Título</option>
                                        <option value="inline">Texto Contínuo (Sem página exclusiva)</option>
                                    </select>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                                    <div>
                                        <label className="input-label mb-2 text-[9px]">Alinhamento do Título</label>
                                        <select value={alinhamentoCapitulo} onChange={(e) => setAlinhamentoCapitulo(e.target.value as any)} className="input-standard text-[10px] font-medium text-slate-800">
                                            <option value="flex-start">Topo</option><option value="center">Centro</option><option value="flex-end">Base</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="input-label mb-2 text-[9px]">Cor Fundo (Box)</label>
                                        <input type="color" value={corBoxCapitulo === 'rgba(255, 255, 255, 0.95)' ? '#ffffff' : corBoxCapitulo} onChange={(e) => setCorBoxCapitulo(e.target.value)} className="w-full h-8 rounded border-none cursor-pointer" />
                                    </div>
                                </div>

                                <div className="mb-4 pt-3 border-t border-slate-100">
                                    <label className="input-label text-indigo-800">Título do E-book</label>
                                    <input type="text" value={livroTitulo} onChange={e => setLivroTitulo(e.target.value)} className="input-standard text-sm" placeholder="Ex: O Poder da Mente" />
                                </div>

                                <div className="mb-2">
                                    <label className="input-label text-indigo-800 mb-2">Autor(es)</label>
                                    <input type="text" value={livroAutores} onChange={e => setLivroAutores(e.target.value)} className="input-standard text-sm" placeholder="Ex: João Silva" />
                                </div>
                            </div>
                        </div>

                        {/* 3. TIPOGRAFIA */}
                        <div>
                            <h3 className="text-xs font-black uppercase text-slate-800 mb-3.5 tracking-wide flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-500">3</span> Tipografia e Índice</h3>
                            <div className="space-y-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                                <div>
                                    <label className="input-label mb-2">Fonte do Livro</label>
                                    <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="input-standard font-medium text-slate-800">
                                        <option value="Lato">Lato (Moderna)</option><option value="Arial">Arial (Limpa)</option><option value="Verdana">Verdana (Legível)</option><option value="EB Garamond">EB Garamond (Clássico)</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                                    <div><label className="input-label mb-2 text-[9px]">Tamanho Fonte Base</label><select value={tamanhoFonteBase} onChange={(e) => setTamanhoFonteBase(e.target.value)} className="input-standard text-[10px]"><option value="12pt">12pt</option><option value="14pt">14pt</option><option value="16pt">16pt</option></select></div>
                                    <div><label className="input-label mb-2 text-[9px]">Entrelinhas</label><select value={espacamentoLinhas} onChange={(e) => setEspacamentoLinhas(e.target.value)} className="input-standard text-[10px]"><option value="1.15">Justo (1.15)</option><option value="1.5">Padrão (1.5)</option></select></div>
                                </div>
                                <div className="pt-3 border-t border-slate-100">
                                    <label className="flex items-center text-xs font-bold text-gray-700 cursor-pointer">
                                        <input type="checkbox" checked={indexShowSubtopics} onChange={(e) => setIndexShowSubtopics(e.target.checked)} className="mr-2 h-4 w-4 text-blue-600 rounded" />
                                        Incluir Tópicos (Subtítulos) no Índice
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* 4. GERAÇÃO EDITORIAL */}
                        <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-sm flex flex-col">
                            <h3 className="text-xs font-black uppercase text-indigo-900 mb-3 tracking-wide flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">4</span> Geração Editorial</h3>
                            
                            <div className="mb-4">
                                <label className="input-label text-indigo-800 mb-2">Instruções / Capítulos para Gerar</label>
                                <textarea 
                                    value={productContent} 
                                    onChange={(e) => {
                                        setProductContent(e.target.value);
                                        localStorage.setItem('ebook_draft_prompt', e.target.value);
                                    }} 
                                    className="input-standard h-36 resize-y leading-relaxed text-sm p-4 rounded-xl border-indigo-200 shadow-inner font-serif" 
                                    placeholder="Digite o tema principal ou cole seu texto/capítulos aqui..."
                                ></textarea>
                            </div>

                            <div className="flex flex-col gap-3 mt-2">
                                <button onClick={() => gerarLivroCompleto()} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 text-xs flex items-center justify-center gap-2 border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1">
                                    <i className="fas fa-bolt text-yellow-300 text-lg"></i> Gerar E-book Completo
                                </button>
                                
                                <div className="flex items-center my-1 opacity-50">
                                    <div className="flex-1 h-px bg-indigo-800"></div><span className="px-3 text-[9px] font-bold text-indigo-900 uppercase">Ou Gerar por Etapas</span><div className="flex-1 h-px bg-indigo-800"></div>
                                </div>

                                <div className="grid grid-cols-1 gap-2">
                                    <button onClick={() => iniciarEbookEtapas()} className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold uppercase tracking-wider py-2.5 rounded-lg shadow-md shadow-sky-200 transition-all hover:-translate-y-0.5 text-[10px] flex items-center justify-center gap-2"><i className="fas fa-play-circle text-white"></i> 1. Iniciar (Capa e Índice)</button>
                                    <button onClick={() => continuarEbookEtapas()} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-wider py-2.5 rounded-lg shadow-md shadow-emerald-200 transition-all hover:-translate-y-0.5 text-[10px] flex items-center justify-center gap-2"><i className="fas fa-plus-circle text-white"></i> 2. Adicionar Capítulos</button>
                                    <button onClick={() => finalizarEbookEtapas()} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase tracking-wider py-2.5 rounded-lg shadow-md shadow-amber-200 transition-all hover:-translate-y-0.5 text-[10px] flex items-center justify-center gap-2"><i className="fas fa-flag-checkered text-white"></i> 3. Finalizar (Conclusão)</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </aside>

        {/* ÁREA PRINCIPAL - CANVAS EDITORIAL */}
        <main className="flex-grow relative bg-slate-200 p-0 md:p-8 overflow-y-auto overflow-x-hidden flex justify-center items-start custom-scrollbar">
            <div className="bg-white border-b border-slate-200 flex justify-between items-center px-4 md:px-6 h-[60px] shadow-sm z-10 absolute top-0 left-0 right-0">
                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button id="tabPreview" onClick={() => (window as any).mudarSeparador('preview')} className="px-5 py-2 rounded-md font-bold text-xs bg-white text-indigo-700 shadow-sm transition">Ver Leitura</button>
                        <button id="tabCode" onClick={() => (window as any).mudarSeparador('code')} className="px-5 py-2 rounded-md font-bold text-xs text-slate-500 hover:text-slate-800 transition">Código HTML</button>
                    </div>
                    <div className="w-px h-6 bg-slate-200 mx-2 hidden md:block"></div>
                    <button onClick={desfazerCodigo} className="hidden md:flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-xs font-bold transition px-2 py-1 rounded hover:bg-slate-100" title="Desfazer"><i className="fas fa-undo"></i></button>
                    <button onClick={iniciarNovoLivro} className="hidden md:flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 text-xs font-bold transition px-2 py-1 rounded hover:bg-indigo-50" title="Apagar tela e iniciar novo arquivo em branco"><i className="fas fa-file"></i> Novo Livro</button>
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                    <button onClick={salvarNaBiblioteca} className="px-4 py-2 border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-bold text-xs rounded-lg transition flex items-center shadow-sm" title="Salvar progresso na Memória Local do seu navegador">
                        <i className="fas fa-save mr-1.5"></i> Salvar Local
                    </button>
                    <button onClick={() => setModalBiblioteca(true)} className="px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 font-bold text-xs rounded-lg transition flex items-center shadow-sm">
                        <i className="fas fa-folder-open mr-1.5 text-indigo-400"></i> Meus Livros
                    </button>
                    <div className="w-px h-6 bg-slate-200 mx-1 hidden md:block"></div>
                    <button onClick={() => (window as any).baixarPdf()} className="px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-xs uppercase tracking-wide rounded-lg transition flex items-center shadow-sm">
                        <i className="fas fa-file-pdf mr-1.5"></i> Baixar PDF
                    </button>
                </div>
            </div>
            
            <div className="pt-[60px] w-full h-full">
                <iframe id="previewFrame" className="w-full h-full border-none active bg-transparent" sandbox="allow-scripts allow-same-origin allow-modals" title="Leitor do Ebook"></iframe>
                
                <div id="codigoContainer" className="absolute inset-0 pt-[60px] bg-[#0d1117] hidden">
                    <textarea id="codigoGerado" className="w-full h-full font-mono text-[13px] bg-[#0d1117] text-[#56d364] border-none outline-none resize-none custom-scrollbar p-8 leading-relaxed"
                        onChange={(e) => {
                            const iframe = document.getElementById('previewFrame') as HTMLIFrameElement;
                            if (iframe) { iframe.srcdoc = moldarApresentacaoHtml(e.target.value) + getScriptPreview(indexShowSubtopics); }
                            localStorage.setItem('ebook_draft_html', e.target.value);
                        }}
                    ></textarea>
                </div>
            </div>
        </main>
      </div>
    </>
  );
}