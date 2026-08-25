'use client';

import { supabase } from '@/lib/supabase';
import React, { useEffect, useState, useRef } from 'react';

// ==========================================
// FUNÇÕES DE INJEÇÃO DO IFRAME (MOTOR A4)
// ==========================================
function getScriptPreview(indexShowSubtopics: boolean, ativarBgSegundaPagina: boolean, bgSegundaPaginaUrl: string, bgSegundaPaginaOpacidade: string) {
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

    function sincronizarIndice() {
        document.querySelectorAll('.page-container').forEach(page => {
            const title = page.querySelector('h2');
            if (title && (title.innerText.toLowerCase().includes('índice') || title.innerText.toLowerCase().includes('sumário'))) {
                page.querySelectorAll('ul, ol').forEach(list => list.remove());
            }
        });

        const allTocs = document.querySelectorAll('.toc-container');
        if (allTocs.length === 0) return;

        const mainToc = allTocs[0];
        for(let i = 1; i < allTocs.length; i++) { allTocs[i].closest('.page-container')?.remove(); }

        const indexTitles = Array.from(document.querySelectorAll('h2.chapter-title-inline')).filter(el => (el.textContent || '').trim().toLowerCase() === 'índice' || (el.textContent || '').trim().toLowerCase() === 'sumário');
        for(let i = 1; i < indexTitles.length; i++) indexTitles[i].closest('.page-container')?.remove();

        const introTitles = Array.from(document.querySelectorAll('h2.chapter-title-inline')).filter(el => (el.textContent || '').trim().toLowerCase() === 'introdução');
        for(let i = 1; i < introTitles.length; i++) introTitles[i].closest('.page-container')?.remove();

        const covers = document.querySelectorAll('.page-cover-img, .page-cover-text, .page-cover-pura');
        for(let i = 1; i < covers.length; i++) { covers[i].closest('.page-container')?.remove(); }

        const selector = ${indexShowSubtopics ? "'h1.chapter-title-exclusive, h2.chapter-title-inline, h3.subtopic-title'" : "'h1.chapter-title-exclusive, h2.chapter-title-inline'"};
        const titles = document.querySelectorAll(selector);
        
        mainToc.innerHTML = '';
        const titulosVistos = new Set(); 

        titles.forEach((titleEl) => {
            if (${!indexShowSubtopics} && titleEl.tagName === 'H3') return;

            if (titleEl.tagName === 'H1' && !titleEl.id && titleEl.closest('.page-cover-img, .page-cover-text, .page-cover-pura')) return;
            
            let textContent = (titleEl.textContent || '').trim();
            if (textContent.toLowerCase() === 'índice' || textContent.toLowerCase() === 'sumário') return;

            if (titleEl.tagName === 'H1' || titleEl.tagName === 'H2') {
                let nomeNormalizado = textContent.toLowerCase().replace(/capítulo \\d+:/, '').trim();
                if (titulosVistos.has(nomeNormalizado)) return; 
                titulosVistos.add(nomeNormalizado);
            }

            if (!titleEl.id) { titleEl.id = 'sec-auto-' + Math.random().toString(36).substr(2, 9); }

            const a = document.createElement('a');
            a.className = 'toc-item';
            
           if (titleEl.tagName === 'H2' || titleEl.tagName === 'H1') {
                a.classList.add('toc-main-chapter');
                a.style.fontWeight = ${indexShowSubtopics ? "'700'" : "'400'"};
                a.style.color = 'var(--color-primary)';
            } else if (titleEl.tagName === 'H3') {
                a.classList.add('toc-subtopic');
                a.style.paddingLeft = '20px';
                a.style.fontSize = '0.9em';
                a.style.opacity = '0.85';
                a.style.fontWeight = '400';
            }

            a.href = '#' + titleEl.id;
            
            const spanTitle = document.createElement('span');
            spanTitle.innerText = textContent;
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

                for(let j=1; j < childNodes.length; j++) {
                    let node = childNodes[j];
                    if (node.classList.contains('force-break-before')) {
                        overflowIndex = j;
                        node.classList.remove('force-break-before'); 
                        break;
                    }
                }

                if (overflowIndex === -1) {
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
                            if (nodeBottom > limitY) { 
                                overflowIndex = j;
                                break;
                            }
                        }
                    }
                }

                if (overflowIndex !== -1) {
                    let nodesToMove = [];
                    
                    if (childNodes[overflowIndex].classList.contains('toc-container') && tocOverflowIndex !== -1) {
                        let tocItems = Array.from(childNodes[overflowIndex].children);
                        let movedTocItems = tocItems.slice(tocOverflowIndex);
                        let nextContainer = childNodes[overflowIndex].cloneNode(false);
                        movedTocItems.forEach(item => nextContainer.appendChild(item));
                        
                        nodesToMove = childNodes.slice(overflowIndex + 1);
                        nodesToMove.unshift(nextContainer);
                    } else {
                        let safeBreak = overflowIndex;
                        
                        while (safeBreak > 0) {
                            let prevNode = childNodes[safeBreak - 1];
                            if (prevNode.tagName.match(/^H[1-6]$/i) || prevNode.classList.contains('subtopic-title')) {
                                safeBreak--;
                            } else {
                                break; 
                            }
                        }
                        
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
            if (contentNodes.length > 0) return;
            
            const isSpecial = page.classList.contains('page-cover-pura') || 
                              page.classList.contains('page-cover-img') || 
                              page.classList.contains('page-cover-text') || 
                              page.classList.contains('cap-img-overlay') || 
                              page.classList.contains('cap-box-rounded') || 
                              page.classList.contains('cap-img-pura') ||
                              page.querySelector('#conclusao, h2.chapter-title-inline:not(:empty)');
            if (isSpecial) return;
            
            page.remove();
        });

        let chIndex = 0;
        let currentChapterImg = '';
        
        document.querySelectorAll('.page-container').forEach((p) => {
            let imgEl = p.querySelector('.chapter-banner-img');
            
            if(p.querySelector('h2.chapter-title-inline') || p.classList.contains('page-cover-img') || p.classList.contains('cap-img-overlay') || p.classList.contains('cap-box-rounded') || p.classList.contains('cap-img-pura') || p.classList.contains('page-cover-pura')) {
                chIndex = 1; 
                if (imgEl) {
                    currentChapterImg = imgEl.src;
                } else if (p.style.backgroundImage && p.style.backgroundImage !== 'none') {
                    let bgMatch = p.style.backgroundImage.match(/url\\(['"]?(.*?)['"]?\\)/);
                    if (bgMatch) currentChapterImg = bgMatch[1];
                }
            } else {
                chIndex++; 
            }

            if (chIndex === 2 && ${ativarBgSegundaPagina} && !p.classList.contains('author-page') && !p.classList.contains('toc-container') && !p.hasAttribute('data-bg-removed')) {
                p.classList.add('chapter-page-2');
                let finalBgUrl = '${bgSegundaPaginaUrl}'.trim() !== '' ? '${bgSegundaPaginaUrl}' : currentChapterImg;
                if (finalBgUrl && finalBgUrl.trim() !== '') {
                    p.style.setProperty('background-image', \`linear-gradient(rgba(255,255,255, ${bgSegundaPaginaOpacidade}), rgba(255,255,255, ${bgSegundaPaginaOpacidade})), url('\${finalBgUrl}')\`, 'important');
                    p.style.setProperty('background-size', 'cover', 'important');
                    p.style.setProperty('background-position', 'center', 'important');
                }
            } else {
                p.classList.remove('chapter-page-2');
                if(!p.classList.contains('cap-img-overlay') && !p.classList.contains('cap-box-rounded') && !p.classList.contains('page-cover-img') && !p.classList.contains('page-cover-pura') && !p.classList.contains('cap-img-pura')) {
                    if (!p.hasAttribute('data-custom-bg')) {
                        p.style.removeProperty('background-image');
                        p.style.removeProperty('background-size');
                        p.style.removeProperty('background-position');
                    }
                }
            }
        });
    }

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
            fontWeight: compStyle.fontWeight === '700' || compStyle.fontWeight === 'bold' ? 'bold' : 'normal',
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
                if(event.data.forceBreak) { el.classList.add('force-break-before'); }
                if(event.data.text !== undefined && event.data.forceTextUpdate) { el.innerText = event.data.text; }
                if(event.data.src !== undefined) el.src = event.data.src;
                if(event.data.textColor !== undefined) el.style.setProperty('color', event.data.textColor, 'important');
                if(event.data.bgColor !== undefined) el.style.setProperty('background-color', event.data.bgColor, 'important');
                if(event.data.fontWeight !== undefined) { el.style.setProperty('font-weight', event.data.fontWeight, 'important'); }
                
                if(event.data.bgImage !== undefined) {
                    if(event.data.bgImage === 'none' || event.data.bgImage === '') { 
                        el.style.setProperty('background-image', 'none', 'important'); 
                        el.setAttribute('data-bg-removed', 'true');
                    } else { 
                        el.style.setProperty('background-image', \`url('\${event.data.bgImage}')\`, 'important'); 
                        el.style.setProperty('background-size', 'cover', 'important'); 
                        el.style.setProperty('background-position', 'center', 'important'); 
                        el.removeAttribute('data-bg-removed');
                        el.setAttribute('data-custom-bg', 'true');
                    }
                }
                if(event.data.rawBgImage !== undefined) {
                    if (event.data.rawBgImage === 'none') {
                        el.style.setProperty('background-image', 'none', 'important');
                        el.setAttribute('data-bg-removed', 'true');
                    } else {
                        el.style.setProperty('background-image', event.data.rawBgImage, 'important');
                        el.style.setProperty('background-size', 'cover', 'important'); 
                        el.style.setProperty('background-position', 'center', 'important');
                        el.removeAttribute('data-bg-removed');
                        el.setAttribute('data-custom-bg', 'true');
                    }
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
        if (event.data.type === 'REORGANIZE_PAGES') {
            triggerSmartReflow();
            sendCleanHtml();
        }
        if (event.data.type === 'INSERT_PAGE') {
            triggerSmartReflow();
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
  const [htmlAtual, setHtmlAtual] = useState<string>('');
  const [modoInspetor, setModoInspetor] = useState(false);
  const [elementoSelecionado, setElementoSelecionado] = useState<any>(null);
  const [statusApis, setStatusApis] = useState<{ texto: string; processing: boolean }>({ texto: 'Aguardando Operação', processing: false });
  
  const [fontFamily, setFontFamily] = useState('Lato');
  const [tamanhoFonteBase, setTamanhoFonteBase] = useState('14pt');
  const [espacamentoLinhas, setEspacamentoLinhas] = useState('1.5');
  const [espacamentoParagrafo, setEspacamentoParagrafo] = useState('0.8em'); 
  const [recuoParagrafo, setRecuoParagrafo] = useState('20px');
  
  const [tipoBorda, setTipoBorda] = useState<'none' | 'single' | 'medium' | 'double-thin'>('none');
  const [tipoCapa, setTipoCapa] = useState<'imagem-texto' | 'imagem-pura' | 'texto'>('imagem-texto');
  const [imagemCapaUrl, setImagemCapaUrl] = useState('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80');
  const [htmlInspiracao, setHtmlInspiracao] = useState('');

  const [paletaCores, setPaletaCores] = useState<'classico' | 'moderno' | 'sepia' | 'dark' | 'manual'>('classico');
  const [corManualPri, setCorManualPri] = useState('#2563eb');
  const [corManualSec, setCorManualSec] = useState('#3b82f6');
  const [corManualText, setCorManualText] = useState('#111827');
  const [corManualBg, setCorManualBg] = useState('#ffffff');

  const [estiloCapitulos, setEstiloCapitulos] = useState<'inline-imagem' | 'box-arredondado'>('inline-imagem');
  
  const [alinhamentoCapitulo, setAlinhamentoCapitulo] = useState<'center' | 'flex-start' | 'flex-end'>('center');
  const [corBoxCapitulo, setCorBoxCapitulo] = useState('rgba(255, 255, 255, 0.95)');
  const [estiloRodape, setEstiloRodape] = useState<'simples' | 'simples-circulo' | 'linha-superior' | 'centralizado' | 'centralizado-circulo'>('linha-superior');
  const [autorPosicao, setAutorPosicao] = useState<'esquerda' | 'topo'>('esquerda');
  const [autorFormato, setAutorFormato] = useState<'circulo' | 'retangulo'>('circulo');

  const [ativarBgSegundaPagina, setAtivarBgSegundaPagina] = useState(true);
  const [bgSegundaPaginaUrl, setBgSegundaPaginaUrl] = useState('');
  const [bgSegundaPaginaOpacidade, setBgSegundaPaginaOpacidade] = useState('0.85');

  const [livroTitulo, setLivroTitulo] = useState('');
  const [livroAutores, setLivroAutores] = useState('');
  const [productContent, setProductContent] = useState('');
  
  const [modoConteudo, setModoConteudo] = useState<'expandido' | 'rigoroso' | 'receitas' | 'historias' | 'academico'>('expandido');
  const [indexShowSubtopics, setIndexShowSubtopics] = useState(false);

  const [livrosSalvos, setLivrosSalvos] = useState<{id: string, titulo: string, data: string, html: string, prompt: string}[]>([]);
  const [modalBiblioteca, setModalBiblioteca] = useState(false);

  const [showModalPagina, setShowModalPagina] = useState(false);
  const [paginaTitulo, setPaginaTitulo] = useState('');
  const [paginaImagem, setPaginaImagem] = useState('');
  const [paginaPosicaoImagem, setPaginaPosicaoImagem] = useState<'esquerda' | 'centro' | 'topo'>('centro');
  const [paginaLocal, setPaginaLocal] = useState<'depois-capa' | 'depois-conclusao'>('depois-capa');

  const imageInputRef = useRef<HTMLInputElement>(null);
  const extraImageInputRef = useRef<HTMLInputElement>(null);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);

  // ==================== FUNÇÕES DE ESTILO E UTILITÁRIOS ====================

  function getPaletaObj() {
      if (paletaCores === 'manual') return { bg: corManualBg, text: corManualText, pri: corManualPri, sec: corManualSec, borda: corManualSec };
      switch(paletaCores) {
          case 'moderno': return { bg: '#ffffff', text: '#111827', pri: '#2563eb', sec: '#3b82f6', borda: '#3b82f6' };
          case 'sepia': return { bg: '#fdf6e3', text: '#4a4036', pri: '#8b6d4f', sec: '#c08770', borda: '#c08770' };
          case 'dark': return { bg: '#1f2937', text: '#f3f4f6', pri: '#a78bfa', sec: '#8b5cf6', borda: '#8b5cf6' };
          default: return { bg: '#ffffff', text: '#1e1914', pri: '#8b6d4f', sec: '#c08770', borda: '#c08770' };
      }
  }

  function isDarkColor(colorStr: string) {
      if(colorStr.startsWith('#')) {
          const hex = colorStr.replace('#', '');
          const r = parseInt(hex.substr(0, 2), 16) || 255;
          const g = parseInt(hex.substr(2, 2), 16) || 255;
          const b = parseInt(hex.substr(4, 2), 16) || 255;
          const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
          return yiq < 128;
      }
      if(colorStr.startsWith('rgb')) {
          const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if(match) {
              const yiq = ((parseInt(match[1]) * 299) + (parseInt(match[2]) * 587) + (parseInt(match[3]) * 114)) / 1000;
              return yiq < 128;
          }
      }
      return false; 
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

function getEstilosFormato() {
      return { width: '210mm', height: '297mm', padding: '22mm 20mm 25mm 20mm' }; 
  }

  function moldarApresentacaoHtml(rawHtml: string) {
      let clean = purificarHTML(rawHtml);
      const conf = getEstilosFormato();
      const paleta = getPaletaObj();
      
      let capBoxBackground = corBoxCapitulo;
      let capBoxBorder = '2px solid var(--color-primary)';
      if (estiloCapitulos === 'box-arredondado') {
          capBoxBackground = 'rgba(20, 20, 20, 0.45)';
          capBoxBorder = 'none';
      }
      
      const isBoxDark = isDarkColor(capBoxBackground);
      let capBoxTextColor = isBoxDark ? '#ffffff' : 'var(--color-primary)';
      if (estiloCapitulos === 'box-arredondado') capBoxTextColor = '#ffffff';

      const urlFundo2 = bgSegundaPaginaUrl.trim() !== '' ? bgSegundaPaginaUrl : 'https://images.unsplash.com/photo-1607513746994-6c36195fb27f?auto=format&fit=crop&w=1200&q=80';
      const bgSegundaPaginaCss = ativarBgSegundaPagina ? `
      .chapter-page-2 {
          background-image: linear-gradient(rgba(255,255,255, ${bgSegundaPaginaOpacidade}), rgba(255,255,255, ${bgSegundaPaginaOpacidade})), url('${urlFundo2}') !important;
          background-size: cover !important;
          background-position: center !important;
      }` : '';

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
${!indexShowSubtopics ? '.toc-subtopic { display: none !important; }' : ''}

img.chapter-banner-img { 
    width: 100% !important; 
    height: 370px !important; 
    min-height: 370px !important;
    max-height: 370px !important; 
    object-fit: cover !important; 
    border-radius: 8px !important; 
    margin-bottom: 1.5rem !important;
    display: block !important;
}

.page-container > h3.subtopic-title:first-of-type,
.page-container > .page-header + h3.subtopic-title {
    margin-top: 0 !important;
}
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

${bgSegundaPaginaCss}

.chapter-text-page {
    padding-top: 22mm !important;
}

.legal-page {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 40mm 25mm !important;
}
.legal-page h2 {
    font-size: 2rem;
    margin-bottom: 2rem;
}
.legal-page p {
    font-size: 1rem;
    line-height: 1.8;
    margin-bottom: 1.2rem;
    text-align: justify;
}

.page-container::after, .page-cover-img::after, .page-cover-pura::after, .page-cover-text::after,
.cap-img-overlay::after, .cap-box-rounded::after, .cap-img-pura::after {
    content: '';
    position: absolute;
    top: 6mm; left: 6mm; right: 6mm; bottom: 6mm;
    pointer-events: none; z-index: 50;
    border: ${tipoBorda === 'single' ? '1px solid var(--color-border)' : tipoBorda === 'medium' ? '2px solid var(--color-border)' : tipoBorda === 'double-thin' ? '3px double var(--color-border)' : 'none'};
}

.page-cover-img::after, .page-cover-pura::after, .cap-img-overlay::after, .cap-box-rounded::after, .cap-img-pura::after {
    display: none !important;
}

.page-extra {
    padding: 32mm 20mm 25mm 20mm;
}
.page-extra img {
    max-width: 100%;
    height: auto;
    margin: 1rem auto;
    display: block;
    border-radius: 8px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}
.page-extra .img-left {
    float: left;
    margin: 0 1.5rem 1rem 0;
    max-width: 45%;
}
.page-extra .img-center {
    display: block;
    margin: 0 auto 1.5rem auto;
    max-width: 70%;
}
.page-extra .img-top {
    display: block;
    margin: 0 auto 1rem auto;
    max-width: 80%;
}
.page-extra .img-horizontal {
    display: block;
    width: 100%;
    height: auto;
    max-height: 320px;
    object-fit: cover;
    border-radius: 8px;
    margin: 0 auto 1.5rem auto;
}
.page-extra .img-vertical {
    display: block;
    width: auto;
    height: 70%;
    max-height: 70vh;
    object-fit: contain;
    border-radius: 8px;
    margin: 0 auto 1.5rem auto;
}
.page-extra h2 {
    text-align: center;
    font-size: 2rem;
    margin-bottom: 1.5rem;
    color: var(--color-primary);
}
.page-extra p {
    text-align: justify;
    line-height: 1.6;
    margin-bottom: 0.8rem;
}

.receita-titulo {
    font-size: 1.8rem !important;
    font-weight: 900 !important;
    color: var(--color-primary) !important;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 2rem !important;
    margin-bottom: 1.5rem !important;
}

h1.chapter-title-exclusive { font-size: 2.8rem; margin-top: 15px; z-index: 10; position: relative; text-align: center; width: 100%; }
.cap-img-overlay h1.chapter-title-exclusive { color: #ffffff; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); }

.cap-img-overlay { display: flex; flex-direction: column; justify-content: ${alinhamentoCapitulo}; align-items: center; text-align: center; background-size: cover !important; background-position: center !important; background-repeat: no-repeat !important; color: #ffffff; }
.cap-icon { font-size: 40px; color: var(--color-secondary); margin-bottom: 10px; text-shadow: 1px 1px 3px rgba(0,0,0,0.8); z-index: 10; position: relative; }

.cap-box-rounded { display: flex; flex-direction: column; justify-content: ${alinhamentoCapitulo}; align-items: center; background-size: cover !important; background-position: center !important; background-repeat: no-repeat !important; }
.cap-box-inner { background: ${capBoxBackground}; padding: 35px 25px; border-radius: 20px; text-align: center; width: 85%; box-shadow: 0 10px 25px rgba(0,0,0,0.2); border: ${capBoxBorder}; z-index: 10; position: relative; color: ${capBoxTextColor}; }
.cap-box-inner h1.chapter-title-exclusive { margin:0; font-size: 2.2rem; color: ${capBoxTextColor}; text-shadow: none; }

.cap-img-pura { background-size: cover !important; background-position: center !important; background-repeat: no-repeat !important; display: block; }

.page-cover-img { display: flex; flex-direction: column; justify-content: ${alinhamentoCapitulo}; align-items: center; text-align: center; background: url('${imagemCapaUrl}') center/cover no-repeat !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; color: #ffffff; }
.page-cover-img h1 { color: #fff; font-size: 3.5rem; margin-bottom: 1rem; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); }
.page-cover-pura { background: url('${imagemCapaUrl}') center/cover no-repeat !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page-cover-text { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; color: var(--color-primary); }
.page-cover-text h1 { font-size: 3.5rem; margin-bottom: 1.5rem; }

.chapter-banner-img { 
    width: 100%; 
    height: 370px !important; 
    max-height: none !important;
    object-fit: cover; 
    border-radius: 8px; 
    margin-bottom: 1rem;
}

.page-container > h3.subtopic-title:first-of-type,
.page-container > .page-header + h3.subtopic-title {
    margin-top: 0.2rem !important;
}
.chapter-title-inline { text-align: center; font-size: 2.1rem; margin-top: 0; margin-bottom: 1.2rem; color: var(--color-primary); font-weight: 800; line-height: 1.15; }

h3.subtopic-title { font-weight: 800; font-size: 1.4rem; margin-top: 1.8rem; margin-bottom: 1.5rem; color: var(--color-primary); line-height: 1.2; text-align: left; }

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
    ${estiloRodape.includes('linha-superior') ? 'border-top: 1px solid var(--color-primary); padding-top: 8px;' : ''}
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

blockquote { page-break-inside: avoid; break-inside: avoid; font-style: italic; color: var(--color-text); border-left: 3px solid var(--color-secondary); background: rgba(0,0,0, 0.03); padding: 12px 18px; margin: 1rem 0; font-size: ${tamanhoFonteBase}; border-radius: 0 8px 8px 0; }
.highlight-box { background: rgba(139, 109, 79, 0.15); padding: 12px 18px; border-radius: 8px; margin: 1rem 0; font-weight: 500; font-size: ${tamanhoFonteBase}; display: flex; align-items: center; gap: 12px; }
.highlight-box i { font-size: 1.8rem; color: var(--color-primary); flex-shrink: 0; }

img { max-width: 100%; height: auto; max-height: 35vh; border-radius: 0.5rem; margin: 1rem auto; display: block; object-fit: cover; page-break-inside: avoid; break-inside: avoid; }
ul, ol { margin-top: 0; margin-bottom: 1em; padding-left: 2rem; font-size: ${tamanhoFonteBase}; line-height: var(--line-spacing); }
li { margin-bottom: 0.4rem; page-break-inside: avoid; }

.toc-container { display: flex; flex-direction: column; width: 100%; margin: 1rem 0; z-index: 60; position: relative; }
.toc-item { display: flex; align-items: baseline; justify-content: space-between; width: 100%; text-decoration: none; color: var(--color-text); font-family: var(--font-body) !important; font-size: ${tamanhoFonteBase} !important; line-height: var(--line-spacing) !important; padding: 6px 0; cursor: pointer; margin-bottom: 0.2rem; }
.toc-item:hover { color: var(--color-secondary); }
.toc-dots { flex-grow: 1; border-bottom: 2px dotted var(--color-primary); margin: 0 8px; opacity: 0.3; }
.toc-page-num { font-weight: bold; color: var(--color-primary); }

.page-container.author-page { display: block; }
.author-section { width: 100%; margin-top: 1.5rem; display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; page-break-inside: avoid; break-inside: avoid; }
.author-section.layout-topo { flex-direction: column; text-align: center; }
.author-section.layout-esquerda { flex-direction: row; text-align: justify; align-items: flex-start; }
.author-photo {
    flex-shrink: 0;
    object-fit: cover;
    box-shadow: 0 8px 20px rgba(0,0,0,0.12);
    border: 3px solid rgba(255,255,255,0.8);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.author-photo:hover {
    transform: scale(1.02);
    box-shadow: 0 12px 28px rgba(0,0,0,0.18);
}
.author-photo.circulo {
    border-radius: 50%;
    width: 150px;
    height: 150px;
}
.author-photo.retangulo {
    border-radius: 20px;
    width: 130px;
    height: 180px;
}
.author-bio { flex-grow: 1; min-width: 250px; }
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

  // ==================== FUNÇÕES DE AÇÃO ====================

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

  function handleExtraImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          const base64Img = event.target?.result as string;
          setPaginaImagem(base64Img);
          (window as any).showNotification("Imagem carregada para página extra!", "success");
      };
      reader.readAsDataURL(file);
      if (extraImageInputRef.current) extraImageInputRef.current.value = '';
  }

  function toggleInspetor() {
      const newMode = !modoInspetor;
      setModoInspetor(newMode);
      setElementoSelecionado(null);
      if (previewFrameRef.current && previewFrameRef.current.contentWindow) {
          previewFrameRef.current.contentWindow.postMessage({ type: 'TOGGLE_EDIT_MODE', value: newMode }, '*');
      }
  }

  function atualizarElemento(field: string, value: string | number | boolean, forceTextUpdate = false) {
      if(!elementoSelecionado) return;
      if (previewFrameRef.current && previewFrameRef.current.contentWindow) {
          previewFrameRef.current.contentWindow.postMessage({ type: 'UPDATE_ELEMENT', id: elementoSelecionado.id, [field]: value, forceTextUpdate }, '*');
      }
      setElementoSelecionado((prev: any) => ({...prev, [field]: value}));
  }

  function transformarEmNode(novoTag: string, classExtra: string = '') {
      if(!elementoSelecionado) return;
      const newHtml = `<${novoTag} id="${elementoSelecionado.id}" class="${classExtra}">${elementoSelecionado.text}</${novoTag}>`;
      if (previewFrameRef.current && previewFrameRef.current.contentWindow) {
          previewFrameRef.current.contentWindow.postMessage({ type: 'REPLACE_ELEMENT_HTML', id: elementoSelecionado.id, newHtml }, '*');
      }
      setElementoSelecionado(null);
      (window as any).showNotification("Elemento transformado!", "success");
  }

  function iniciarNovoLivro() {
      if (confirm("ATENÇÃO: Tem certeza que deseja iniciar um novo livro? Todo o progresso atual não salvo será perdido.")) {
          localStorage.removeItem('ebook_draft_html');
          localStorage.removeItem('ebook_draft_prompt');
          setHtmlAtual('');
          setLivroTitulo('');
          setProductContent('');
          setImagemCapaUrl('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80');
          if (previewFrameRef.current) {
              previewFrameRef.current.srcdoc = '';
          }
          (window as any).showNotification("Novo documento em branco criado com capa neutra.", "info");
      }
  }

  function salvarNaBiblioteca() {
      if (!livroTitulo || livroTitulo.trim() === '') {
          (window as any).showNotification("Dê um título ao E-book antes de salvar.", "error");
          return;
      }
      if (!htmlAtual || htmlAtual.trim() === '') {
          (window as any).showNotification("Não há conteúdo para salvar.", "error");
          return;
      }

      const id = Date.now().toString();
      const novoLivro = { id, titulo: livroTitulo, data: new Date().toLocaleDateString('pt-BR'), html: htmlAtual, prompt: productContent };
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
    if (estadoAnterior) {
        setHtmlAtual(estadoAnterior);
        localStorage.setItem('ebook_draft_html', estadoAnterior);
        if (previewFrameRef.current) {
            previewFrameRef.current.srcdoc = estadoAnterior + getScriptPreview(indexShowSubtopics, ativarBgSegundaPagina, bgSegundaPaginaUrl, bgSegundaPaginaOpacidade);
        }
    }
    setElementoSelecionado(null);
    (window as any).showNotification("Ação desfeita com sucesso.", "success");
  }

  async function buscarImagemUnsplash() {
      if (!elementoSelecionado) {
          (window as any).showNotification("Selecione um elemento (imagem ou fundo) primeiro.", "error");
          return;
      }
      (window as any).showNotification("Lendo contexto para buscar imagem perfeita no Unsplash...", "info");
      
      let keyword = "abstract"; 
      try {
          const instrucao = "Você é um fotógrafo. Retorne APENAS UMA palavra-chave em INGLÊS que represente o texto, focando em pessoas reais e fotografia realista. Nenhuma outra palavra.";
          const data = await chamarMotorIA(instrucao, [{ text: elementoSelecionado.text || elementoSelecionado.outerHTML }], true);
          
          if (data && data.html) {
              keyword = data.html.replace(/<[^>]*>?/gm, '').trim().replace(/[^a-zA-Z0-9]/g, '');
              if(!keyword) keyword = 'abstract';
          }
      } catch (e) {
          console.error("Falha ao ler palavras-chave via IA, usando padrão.");
      }

      const timestamp = new Date().getTime(); 
      const url = `https://source.unsplash.com/featured/1200x800/?${encodeURIComponent(keyword)},photography,realistic,human&sig=${timestamp}`;
      
      const isImg = elementoSelecionado.tagName === 'img';
      const field = isImg ? 'src' : 'bgImage';
      
      if (previewFrameRef.current && previewFrameRef.current.contentWindow) {
          previewFrameRef.current.contentWindow.postMessage({
              type: 'UPDATE_ELEMENT',
              id: elementoSelecionado.id,
              [field]: url,
              forceTextUpdate: false
          }, '*');
      }
      
      setElementoSelecionado((prev: any) => ({...prev, [field]: url}));
      (window as any).showNotification("Fotografia aplicada com sucesso!", "success");
  }

  async function aplicarModificacaoLocal() {
      const input = document.getElementById('ai_prompt_local') as HTMLInputElement;
      const comando = input?.value.trim();
      if(!comando) { (window as any).showNotification("Digite o que alterar neste elemento.", "error"); return; }
      if(!elementoSelecionado) return;

      setHistoricoCodigo((prev) => [...prev, htmlAtual]);

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

          if (previewFrameRef.current && previewFrameRef.current.contentWindow) {
              previewFrameRef.current.contentWindow.postMessage({ type: 'REPLACE_ELEMENT_HTML', id: elementoSelecionado.id, newHtml: novoHtml }, '*');
          }
          
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

  // Função central para aplicar novo HTML (seja sobrescrevendo ou injetando)
  function aplicarHtmlNovo(htmlCru: string, isInjetar: boolean) {
      console.log("aplicarHtmlNovo chamado, isInjetar:", isInjetar);
      let novoConteudo = purificarHTML(htmlCru);
      console.log("Conteúdo purificado (início):", novoConteudo.substring(0, 200));
      
      let htmlFinal = "";
      if (isInjetar) {
          htmlFinal = injetarHtmlNoFinal(htmlAtual || '', novoConteudo);
      } else {
          htmlFinal = moldarApresentacaoHtml(novoConteudo);
      }
      console.log("HTML final montado (início):", htmlFinal.substring(0, 200));

      // Salva o estado atual no histórico antes de substituir
      setHistoricoCodigo((prev) => [...prev, htmlAtual]);
      setHtmlAtual(htmlFinal);
      localStorage.setItem('ebook_draft_html', htmlFinal);
      
      // Atualiza o iframe com o script de edição
      if (previewFrameRef.current) {
          const script = getScriptPreview(indexShowSubtopics, ativarBgSegundaPagina, bgSegundaPaginaUrl, bgSegundaPaginaOpacidade);
          previewFrameRef.current.srcdoc = htmlFinal + script;
      } else {
          console.warn("previewFrameRef.current é nulo");
      }
  }

  function gerarPaginaAviso() {
      const ano = new Date().getFullYear();
      return `
      <div class="page-container legal-page">
          <div class="page-header"><span>${livroTitulo || 'E-book'}</span><span>AVISO LEGAL</span></div>
          <h2>Aviso e Direitos Autorais</h2>
          <p>© ${ano} ${livroAutores || 'Autor'}. Todos os direitos reservados.</p>
          <p>Este e-book está protegido por leis de direitos autorais. Nenhuma parte desta publicação pode ser reproduzida, distribuída ou transmitida de qualquer forma ou por qualquer meio, sem a devida autorização por escrito do autor, exceto em casos de breves citações em resenhas e artigos acadêmicos, desde que devidamente creditadas.</p>
          <p>As informações contidas neste material são fornecidas apenas para fins educacionais e informativos. O autor não se responsabiliza por quaisquer consequências decorrentes do uso inadequado das informações aqui contidas.</p>
          <p>Este e-book foi gerado com a plataforma E-bookPro e reflete o conteúdo original fornecido pelo autor.</p>
          <div class="page-footer"><span>${livroAutores}</span><span class="page-number"></span></div>
      </div>`;
  }

  function findClosingDiv(html: string, startIndex: number): number {
      let open = 0;
      let i = startIndex;
      while (i < html.length) {
          const openTag = html.indexOf('<div', i);
          const closeTag = html.indexOf('</div>', i);
          if (closeTag === -1) break;
          if (openTag !== -1 && openTag < closeTag) {
              open++;
              i = openTag + 4;
          } else {
              if (open === 0) {
                  return closeTag + 6;
              }
              open--;
              i = closeTag + 6;
          }
      }
      return -1;
  }

  function inserirPaginaExtra() {
      if (!paginaTitulo.trim() && !paginaImagem.trim()) {
          (window as any).showNotification("Preencha pelo menos o título ou uma imagem.", "error");
          return;
      }

      if (!htmlAtual || htmlAtual.trim() === '') {
          (window as any).showNotification("Nenhum E-book gerado para inserir página.", "error");
          return;
      }

      let classeImagem = '';
      if (paginaPosicaoImagem === 'esquerda') classeImagem = 'img-left';
      else if (paginaPosicaoImagem === 'centro') classeImagem = 'img-center';
      else if (paginaPosicaoImagem === 'topo') classeImagem = 'img-top';

      const tituloParaHeader = paginaTitulo.trim() || 'Página Extra';
      const tituloHtml = paginaTitulo.trim() ? `<h2 id="extra-${Date.now()}" class="chapter-title-inline">${paginaTitulo}</h2>` : '';

      let imagemClasse = 'img-horizontal';
      let imagemHtml = '';
      if (paginaImagem.trim()) {
          imagemHtml = `<img src="${paginaImagem}" class="${classeImagem || imagemClasse}" alt="Imagem da página" />`;
      }

      const paginaHtml = `
      <div class="page-container page-extra">
          <div class="page-header"><span>${livroTitulo || 'E-book'}</span><span>${tituloParaHeader}</span></div>
          ${tituloHtml}
          ${imagemHtml}
          <p>Digite aqui o conteúdo da página extra. Você pode editar este texto diretamente no editor.</p>
          <div class="page-footer"><span>${livroAutores}</span><span class="page-number"></span></div>
      </div>`;

      let htmlAtualStr = htmlAtual;
      let posicao = -1;

      if (paginaLocal === 'depois-capa') {
          const matchCapa = htmlAtualStr.match(/<div class="page-container (page-cover-[a-z-]+)[^>]*>/i);
          if (matchCapa && matchCapa.index !== undefined) {
              const startDiv = matchCapa.index;
              const endDiv = findClosingDiv(htmlAtualStr, startDiv + matchCapa[0].length);
              if (endDiv !== -1) {
                  posicao = endDiv;
              }
          }
      } else if (paginaLocal === 'depois-conclusao') {
          const matchConclusao = htmlAtualStr.match(/<div class="page-container[^>]*>[\s\S]*?id="conclusao"/i);
          if (matchConclusao && matchConclusao.index !== undefined) {
              const startDiv = htmlAtualStr.lastIndexOf('<div', matchConclusao.index);
              if (startDiv !== -1) {
                  const endDiv = findClosingDiv(htmlAtualStr, startDiv + 4);
                  if (endDiv !== -1) {
                      posicao = endDiv;
                  }
              }
          }
      }

      if (posicao === -1) {
          const containerEnd = htmlAtualStr.lastIndexOf('</div>');
          if (containerEnd !== -1) {
              posicao = containerEnd;
          }
      }

      let novoHtml = '';
      if (posicao !== -1) {
          novoHtml = htmlAtualStr.substring(0, posicao) + '\n' + paginaHtml + '\n' + htmlAtualStr.substring(posicao);
      } else {
          novoHtml = htmlAtualStr + '\n' + paginaHtml;
      }

      setHistoricoCodigo((prev) => [...prev, htmlAtual]);
      const htmlFinal = moldarApresentacaoHtml(novoHtml);
      setHtmlAtual(htmlFinal);
      localStorage.setItem('ebook_draft_html', htmlFinal);
      if (previewFrameRef.current) {
          previewFrameRef.current.srcdoc = htmlFinal + getScriptPreview(indexShowSubtopics, ativarBgSegundaPagina, bgSegundaPaginaUrl, bgSegundaPaginaOpacidade);
      }

      setShowModalPagina(false);
      setPaginaTitulo('');
      setPaginaImagem('');
      (window as any).showNotification("Página extra inserida com sucesso!", "success");
  }

  // ==================== INSTRUÇÕES PARA IA ====================

  function obterInstrucoesBase() {
      let numSpan = estiloRodape.includes('circulo') ? '<span class="page-number circulo"></span>' : '<span class="page-number"></span>';
      let regraRodape = "";
      if (estiloRodape.includes('simples') || estiloRodape.includes('linha-superior')) { regraRodape = `<span>${livroAutores}</span>${numSpan}`; } 
      else { regraRodape = `${numSpan}`; }

      let regraEstiloCapitulos = "";
      let regraTitulo = "";
      let regraEstrutura = "";

      if (modoConteudo === 'receitas') {
          regraTitulo = `NUNCA use a palavra "Capítulo". Use "Receita" ou apenas o nome da receita como título (H1 ou H2).`;
          regraEstrutura = `
          ESTRUTURA DE RECEITA (sem capítulos, sem tópicos fixos):
          - Cada receita terá: Título (H1 ou H2), uma breve descrição, lista de ingredientes, modo de preparo e dicas.
          - A página da receita deve conter a imagem (horizontal, proporção 16:9, mesma altura para todas) e os ingredientes (ul).
          - O modo de preparo deve ficar em uma página separada (próxima página).
          - Não há limite de páginas.
          `;
          regraEstiloCapitulos = `
          MOLDE DA RECEITA (página com imagem + ingredientes):
          <div class="page-container">
              <div class="page-header"><span>${livroTitulo}</span><span>RECEITA</span></div>
              <h2 id="ID_DA_RECEITA" class="chapter-title-inline">Nome da Receita</h2>
              <img src="URL_DA_IMAGEM_HORIZONTAL_UNSPLASH" class="chapter-banner-img" alt="Imagem da receita" style="height: 300px; object-fit: cover;" />
              <p>[Descrição breve da receita...]</p>
              <h3 class="receita-titulo">Ingredientes</h3>
              <ul>
                  <li>Ingrediente 1</li>
                  <li>Ingrediente 2</li>
                  <li>Ingrediente 3</li>
              </ul>
              <div class="page-footer">${regraRodape}</div>
          </div>
          <!-- PRÓXIMA PÁGINA: MODO DE PREPARO -->
          <div class="page-container">
              <div class="page-header"><span>${livroTitulo}</span><span>RECEITA - PREPARO</span></div>
              <h3 class="receita-titulo">Modo de Preparo</h3>
              <p>[Passo 1...]</p>
              <p>[Passo 2...]</p>
              <div class="highlight-box"><i class="fas fa-lightbulb"></i> Dica: [dica especial]</div>
              <div class="page-footer">${regraRodape}</div>
          </div>
          IMPORTANTE: A página de imagem + ingredientes deve vir primeiro, seguida da página de preparo. Todas as imagens devem ser horizontais (largura maior que altura) e com a mesma altura (300px). Use a classe "receita-titulo" nos H3.`;
      }
      else if (modoConteudo === 'rigoroso') {
          regraTitulo = `Mantenha exatamente os títulos e estrutura do texto original, apenas envelopando nas tags HTML (h2, h3, p).`;
          regraEstrutura = `
          Neste modo, você DEVE:
          1. Corrigir APENAS erros de ortografia, pontuação e concordância – sem reescrever ou resumir.
          2. Manter o conteúdo integralmente como foi fornecido.
          3. Formatar o texto usando as tags HTML adequadas (h2, h3, p) de acordo com a estrutura original.
          4. NÃO adicionar nem remover parágrafos, imagens ou qualquer elemento.
          `;
          regraEstiloCapitulos = `
          MOLDE RIGOROSO: Use as tags HTML conforme o texto original, mantendo a ordem e o conteúdo exato (após correções ortográficas). Não invente conteúdo.`;
      }
      else {
          if (modoConteudo === 'expandido') {
              regraTitulo = `OBRIGATORIAMENTE escrever a palavra "Capítulo 1:", "Capítulo 2:", etc., no título principal (H1 ou H2) de todo capítulo gerado!`;
              regraEstrutura = `
              ESTRUTURA PADRÃO (3 tópicos por capítulo, 3 páginas por capítulo):
              - O capítulo deve ter exatamente 3 subtópicos (H3).
              - Em cada tópico, 2 a 3 parágrafos.
              - A página de título do capítulo (com imagem) deve ter APENAS 2 parágrafos curtos.
              - As demais páginas devem ter 4 parágrafos mais longos.
              - O total por capítulo deve ser de exatamente 3 páginas de conteúdo.
              `;
          } else if (modoConteudo === 'historias') {
              regraTitulo = `Use "Capítulo" nos títulos (H2). O foco é a narrativa, mas mantenha a estrutura de 3 tópicos por capítulo.`;
              regraEstrutura = `
              ESTRUTURA DE HISTÓRIA (com 3 tópicos por capítulo):
              - Cada capítulo deve ter um título (H2) e 3 subtópicos (H3) com parágrafos narrativos.
              - A página de título do capítulo (com imagem) deve ter APENAS 2 parágrafos curtos.
              - As demais páginas devem ter 4 parágrafos mais longos.
              - O conteúdo deve ser extenso o suficiente para ocupar pelo menos 2 páginas por capítulo.
              `;
          } else if (modoConteudo === 'academico') {
              regraTitulo = `Use "Capítulo" nos títulos (H2). Estrutura formal com 3 subtópicos (H3) por capítulo.`;
              regraEstrutura = `
              ESTRUTURA ACADÊMICA (com 3 tópicos por capítulo, mínimo 2 páginas):
              - Cada capítulo deve ter um título (H2) e 3 subtópicos (H3).
              - A página de título (com imagem) deve ter APENAS 2 parágrafos curtos.
              - As demais páginas devem ter 4 parágrafos mais longos.
              - Incluir citações (blockquote) e dicas (highlight-box) em páginas alternadas (NUNCA ambos na mesma página).
              `;
          }

          if (estiloCapitulos === 'box-arredondado') {
              regraEstiloCapitulos = `
              MOLDE DO CAPÍTULO (Capa Exclusiva Box Branco):
              <!-- PÁGINA DE CAPA DO CAPÍTULO (com imagem de fundo real) -->
              <div class="page-container cap-box-rounded" style="background-image: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('https://source.unsplash.com/featured/1200x800/?nature,landscape,water,forest&sig=CAP1'); background-size: cover; background-position: center;">
                  <div class="cap-box-inner"><h1 id="ID_DO_CAPITULO" class="chapter-title-exclusive">Capítulo X: Nome Exclusivo do Capítulo</h1></div>
              </div>
              <!-- PÁGINAS DE TEXTO (NÃO REPETIR O TÍTULO) -->
              <div class="page-container chapter-text-page">
                  <div class="page-header"><span>${livroTitulo}</span><span>NOME DO CAPÍTULO</span></div>
                  <!-- 2 parágrafos curtos na primeira página de texto -->
                  <p>[Parágrafo curto de introdução ao capítulo, com 3 a 4 linhas...]</p>
                  <p>[Segundo parágrafo curto, também com 3 a 4 linhas...]</p>
                  <h3 class="subtopic-title">Primeiro Tópico</h3>
                  <p>[Parágrafo longo e denso com 6 a 8 linhas, preenchendo bem a página...]</p>
                  <p>[Mais 3 parágrafos longos para completar a página...]</p>
                  <h3 class="subtopic-title">Segundo Tópico</h3>
                  <p>[4 parágrafos longos...]</p>
                  <div class="highlight-box"><i class="fas fa-lightbulb"></i> Quadro Conceito</div>
                  <h3 class="subtopic-title">Terceiro Tópico</h3>
                  <p>[4 parágrafos longos...]</p>
                  <blockquote class="highlight-box"><i class="fas fa-quote-left"></i> Citação</blockquote>
                  <div class="page-footer">${regraRodape}</div>
              </div>
              ATENÇÃO: Distribua os parágrafos uniformemente para que cada página fique bem preenchida, evitando páginas vazias ou com pouco conteúdo. A primeira página de texto (com os 2 parágrafos curtos) deve ter conteúdo suficiente para ocupar pelo menos metade da página.`;
          } else {
              regraEstiloCapitulos = `
              MOLDE PADRÃO (inline-imagem):
              <div class="page-container">
                  <div class="page-header"><span>${livroTitulo}</span><span>NOME DO CAPÍTULO</span></div>
                  <h2 id="ID_DO_CAPITULO" class="chapter-title-inline">Capítulo X: Nome Exclusivo do Capítulo</h2>
                  <img src="URL_DA_IMAGEM_FOTOGRAFICA_REAL_UNSPLASH_AQUI" class="chapter-banner-img" alt="Fotografia do Capítulo" />
                  <h3 class="subtopic-title">Subtítulo do Capítulo</h3>
                  <p>[2 parágrafos curtos...]</p>
                  <h3 class="subtopic-title">Primeiro Tópico</h3>
                  <p>[4 parágrafos longos...]</p>
                  <h3 class="subtopic-title">Segundo Tópico</h3>
                  <p>[4 parágrafos longos...]</p>
                  <div class="highlight-box"><i class="fas fa-lightbulb"></i> Quadro Conceito</div>
                  <h3 class="subtopic-title">Terceiro Tópico</h3>
                  <p>[4 parágrafos longos...]</p>
                  <blockquote class="highlight-box"><i class="fas fa-quote-left"></i> Citação</blockquote>
                  <div class="page-footer">${regraRodape}</div>
              </div>
              ATENÇÃO: Distribua os parágrafos uniformemente para que cada página fique bem preenchida, evitando páginas vazias ou com pouco conteúdo.`;
          }
      }

      let regraCapaHtml = "";
      if (tipoCapa === 'imagem-texto') {
          regraCapaHtml = `<div class="page-container page-cover-img"><h1>${livroTitulo || 'Meu E-book'}</h1><p>Por ${livroAutores || 'Autor'}</p></div>`;
      } else if (tipoCapa === 'imagem-pura') {
          regraCapaHtml = `<div class="page-container page-cover-pura"></div>`;
      } else {
          regraCapaHtml = `<div class="page-container page-cover-text"><h1 style="font-size: 3rem; margin-bottom: 1.5rem; text-transform: uppercase;">${livroTitulo || 'Meu E-book'}</h1><div style="width: 80px; height: 2px; background: var(--color-primary); margin: 0 auto 1.5rem auto;"></div><p style="font-size: 1.3rem; font-style: italic;">Por ${livroAutores || 'Autor'}</p></div>`;
      }

      const paginaAviso = gerarPaginaAviso();

      let regrasComuns = `
      DIRETRIZES DE LAYOUT E CONTEÚDO (MOLDE ESTRITO):

      1. REGRA DE FOTOGRAFIA: Use APENAS FOTOGRAFIAS REAIS (humanos, objetos, ambientes). Proibido ilustrações ou 3D.
      
      2. ESTRUTURA DOS CAPÍTULOS (Siga OBRIGATORIAMENTE o HTML abaixo):
         Todo capítulo DEVE ter EXATAMENTE 3 páginas. Preencha os colchetes rigorosamente. Não adicione páginas extras.

         <!-- PÁGINA 1 -->
         <div class="page-container">
             <div class="page-header"><span>...</span><span>...</span></div>
             <h2 class="chapter-title-inline">Capítulo X: [Nome]</h2>
             <img class="chapter-banner-img" src="..." data-keyword="[FOTO_REAL_AQUI]" alt="Banner">
             <h3 class="subtopic-title">[Subtítulo 1]</h3>
             <p>[Parágrafo denso de 4-6 linhas]</p>
             <p>[Parágrafo denso de 4-6 linhas]</p>
             <div class="page-footer"><span></span><span class="page-number"></span></div>
         </div>

         <!-- PÁGINA 2 -->
         <div class="page-container">
             <div class="page-header"><span>...</span><span>...</span></div>
             <h3 class="subtopic-title">[Subtítulo 2]</h3>
             <p>[Parágrafo denso de 4-6 linhas]</p>
             <p>[Parágrafo denso de 4-6 linhas]</p>
             <div class="highlight-box"><i class="fas fa-lightbulb"></i> [Dica Importante]</div>
             <p>[Parágrafo denso de 4-6 linhas]</p>
             <p>[Parágrafo denso de 4-6 linhas]</p>
             <div class="page-footer"><span></span><span class="page-number"></span></div>
         </div>

         <!-- PÁGINA 3 -->
         <div class="page-container">
             <div class="page-header"><span>...</span><span>...</span></div>
             <h3 class="subtopic-title">[Subtítulo 3]</h3>
             <p>[Parágrafo denso de 4-6 linhas]</p>
             <p>[Parágrafo denso de 4-6 linhas]</p>
             <p>[Parágrafo denso de 4-6 linhas]</p>
             <p>[Parágrafo extra e denso de 4-6 linhas focado em preencher todo o buraco do rodapé da última página]</p>
             <div class="page-footer"><span></span><span class="page-number"></span></div>
         </div>
      `;

      return { regrasComuns, regraCapaHtml, regraRodape, regraEstiloCapitulos, paginaAviso };
  }

  // ==================== FUNÇÕES DE GERAÇÃO (ETAPAS) ====================

  async function iniciarEbookEtapas() {
      const content = productContent.trim();
      if (!content) { (window as any).showNotification('Insira o texto base.', 'error'); return; }

      const { regrasComuns, regraCapaHtml, regraRodape, paginaAviso } = obterInstrucoesBase();

      const instrucao = `Você vai INICIAR um e-book gerando APENAS a Capa, Aviso/Direitos, Índice e Introdução.
      ${regrasComuns}
      ESTRUTURA OBRIGATÓRIA DA RESPOSTA (PASSO 1):
      1. CAPA: ${regraCapaHtml}
      2. AVISO E DIREITOS AUTORAIS: ${paginaAviso}
      3. ÍNDICE: 
         <div class="page-container">
            <div class="page-header"><span>${livroTitulo}</span><span>ÍNDICE</span></div>
            <h2 class="chapter-title-inline">Índice</h2>
            <div class="toc-container"></div>
            <div class="page-footer">${regraRodape}</div>
         </div>
      4. INTRODUÇÃO: 
         <div class="page-container">
            <div class="page-header"><span>${livroTitulo}</span><span>INTRODUÇÃO</span></div>
            <h2 id="intro" class="chapter-title-inline">Introdução</h2>
            <h3 class="subtopic-title">Visão Geral</h3>
            <p>[Parágrafo...]</p>
            <p>[Parágrafo...]</p>
            <h3 class="subtopic-title">Propósito</h3>
            <p>[Parágrafo...]</p>
            <p>[Parágrafo...]</p>
            <div class="page-footer">${regraRodape}</div>
         </div>
      PARE AQUI! NÃO gere Capítulos ou Conclusão.
      `;

      const data = await chamarMotorIA(instrucao, [{ text: `TEXTO BASE PARA CRIAR O ÍNDICE E A INTRODUÇÃO:\n"""\n${content}\n"""` }], false);
      if (data && data.html) {
          aplicarHtmlNovo(data.html, false);
          (window as any).showNotification("Passo 1 Concluído! Capa, Aviso, Índice e Introdução gerados.", "success");
      } else {
          console.error("Dados retornados pela IA são inválidos:", data);
      }
  }

  async function continuarEbookEtapas() {
      const content = productContent.trim();
      const currentHtml = htmlAtual || '';

      if (!currentHtml.includes('page-container')) { (window as any).showNotification('Gere o Passo 1 primeiro!', 'error'); return; }

      const { regrasComuns, regraEstiloCapitulos } = obterInstrucoesBase();

      const instrucao = `Você vai CONTINUAR a escrita de um e-book já existente.
      ${regrasComuns}
      OBRIGAÇÕES CRÍTICAS (PASSO 2):
      1. PROIBIÇÃO ABSOLUTA: A sua resposta HTML DEVE ABRIR IMEDIATAMENTE com o bloco HTML iniciando o novo capítulo/conteúdo. É ESTRITAMENTE PROIBIDO gerar Capa, Aviso, Índice ou Introdução neste passo.
      2. ONDE CONTINUAR: Leia o código fornecido e comece no capítulo seguinte da numeração (se aplicável).
      3. ESTRUTURA DO CONTEÚDO: 
         ${regraEstiloCapitulos}
      4. QUANTIDADE: Gere EXATAMENTE 3 capítulos (se for no modo Padrão/Acadêmico) ou a quantidade de receitas/histórias que couber, respeitando o tipo de livro escolhido.
      `;

      const data = await chamarMotorIA(instrucao, [
          { text: `CÓDIGO HTML ATUAL DO LIVRO:\n"""\n${currentHtml}\n"""` },
          { text: `INSTRUÇÕES/TEXTO DOS PRÓXIMOS CAPÍTULOS (gerar 3 capítulos, se possível):\n"""\n${content || 'Gere os próximos capítulos garantindo OBRIGATORIAMENTE o molde exato fornecido nas regras.'}\n"""` }
      ], false);
      
      if (data && data.html) {
          aplicarHtmlNovo(data.html, true);
          (window as any).showNotification("Passo 2 Concluído! Conteúdo adicionado.", "success");
      } else {
          console.error("Dados retornados pela IA são inválidos:", data);
      }
  }

  async function finalizarEbookEtapas() {
      if (!htmlAtual || !htmlAtual.includes('page-container')) { (window as any).showNotification('Gere o livro antes de finalizar.', 'error'); return; }

      const { regrasComuns, regraRodape } = obterInstrucoesBase();

      const instrucao = `Você vai FINALIZAR a escrita do e-book.
      ${regrasComuns}

      MOLDE OBRIGATÓRIO (PASSO 3):
      1. PROIBIÇÃO ABSOLUTA: A sua resposta deve conter APENAS o bloco HTML da conclusão. Não crie novos capítulos, capas ou introduções.
      2. MOLDE DE CONCLUSÃO: 
      <div class="page-container">
          <div class="page-header"><span>${livroTitulo}</span><span>CONCLUSÃO</span></div>
          <h2 id="conclusao" class="chapter-title-inline">Conclusão</h2>
          <h3 class="subtopic-title">Fechamento</h3>
          <p>[Conclusão...]</p>
          <div class="page-footer">${regraRodape}</div>
      </div>

      O PROMPT ACABA AQUI. Termine apenas fechando a div de Conclusão. O sistema cuidará de adicionar o Autor nativamente.
      `;

      const data = await chamarMotorIA(instrucao, [{ text: `TEMA DO E-BOOK (Para basear a conclusão):\n"""\n${livroTitulo}\n"""` }], false);
      if (data && data.html) {
          let htmlFinal = data.html + '\n' + obterBlocoAutorHtml();
          aplicarHtmlNovo(htmlFinal, true);
          (window as any).showNotification("Passo 3 Concluído! Conclusão e Autor gerados.", "success");
      } else {
          console.error("Dados retornados pela IA são inválidos:", data);
      }
  }

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

  // ==================== CHAMADA À API COM LOGS ====================

  async function chamarMotorIA(systemInstructionText: string, promptParts: any[], isElementRefinement = false) {
    setStatusApis({ texto: isElementRefinement ? 'A IA processando...' : 'A IA está diagramando os capítulos...', processing: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      console.log("Token obtido:", token ? "presente" : "ausente");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

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
              useGroq: false 
          }),
          signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      console.log("Resposta da API (status:", response.status, "):", responseText.substring(0, 500));

      let data;
      try { data = JSON.parse(responseText); } catch (err) { throw new Error(`Erro no Servidor (${response.status}): ${responseText.substring(0, 80)}`); }
      if (!data.success) throw new Error(data.error || "Erro retornado pela API.");
      return data;
    } catch (err: any) {
      let errorMsg = err.message;
      if (errorMsg.includes('429') || errorMsg.toLowerCase().includes('quota')) { errorMsg = "Limite excedido (Quota). O sistema não gerou por falta de saldo/cota na API."; }
      if (errorMsg === 'The operation was aborted.') { errorMsg = "Tempo limite excedido. Tente novamente."; }
      console.error("Erro na chamada da IA:", errorMsg);
      if (isElementRefinement) throw new Error(errorMsg);
      (window as any).showNotification(errorMsg, 'error');
      return null;
    } finally { 
      setStatusApis({ texto: 'Aguardando', processing: false }); 
    }
  }

  // ==================== EFEITOS ====================

  useEffect(() => {
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
        if (previewFrameRef.current && previewFrameRef.current.contentWindow) {
            previewFrameRef.current.contentWindow.print();
        }
    };

    // Carregar HTML salvo no localStorage
    const savedHtml = localStorage.getItem('ebook_draft_html');
    if (savedHtml) {
        const htmlFinal = moldarApresentacaoHtml(savedHtml);
        setHtmlAtual(htmlFinal);
        if (previewFrameRef.current) {
            previewFrameRef.current.srcdoc = htmlFinal + getScriptPreview(indexShowSubtopics, ativarBgSegundaPagina, bgSegundaPaginaUrl, bgSegundaPaginaOpacidade);
        }
    }
  }, []);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
        if (e.data.type === 'ELEMENT_SELECTED') setElementoSelecionado(e.data);
        if (e.data.type === 'HTML_SYNC') {
            const htmlLimpo = moldarApresentacaoHtml(e.data.html);
            setHistoricoCodigo((prev: string[]) => {
                if (prev.length > 0 && prev[prev.length - 1] === htmlLimpo) return prev;
                return [...prev, htmlAtual]; 
            });
            setHtmlAtual(htmlLimpo);
            localStorage.setItem('ebook_draft_html', htmlLimpo);
        }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Atualiza o iframe sempre que htmlAtual ou as configs de edição mudarem
  useEffect(() => {
    if (htmlAtual && previewFrameRef.current) {
        previewFrameRef.current.srcdoc = htmlAtual + getScriptPreview(indexShowSubtopics, ativarBgSegundaPagina, bgSegundaPaginaUrl, bgSegundaPaginaOpacidade);
    }
  }, [htmlAtual, indexShowSubtopics, ativarBgSegundaPagina, bgSegundaPaginaUrl, bgSegundaPaginaOpacidade]);

  // Reaplica o HTML quando configurações visuais mudam (fontes, cores, etc.)
  useEffect(() => {
    if (htmlAtual) {
        const htmlFinal = moldarApresentacaoHtml(htmlAtual);
        setHtmlAtual(htmlFinal);
        localStorage.setItem('ebook_draft_html', htmlFinal);
        if (previewFrameRef.current) {
            previewFrameRef.current.srcdoc = htmlFinal + getScriptPreview(indexShowSubtopics, ativarBgSegundaPagina, bgSegundaPaginaUrl, bgSegundaPaginaOpacidade);
        }
    }
  }, [fontFamily, tamanhoFonteBase, tipoBorda, tipoCapa, imagemCapaUrl, espacamentoLinhas, espacamentoParagrafo, recuoParagrafo, paletaCores, corManualPri, corManualSec, corManualText, corManualBg, estiloRodape, alinhamentoCapitulo, corBoxCapitulo, autorPosicao, autorFormato, livroTitulo, livroAutores, estiloCapitulos]);

  const isTextElement = elementoSelecionado ? ['p', 'h1', 'h2', 'h3', 'h4', 'span', 'li', 'a', 'blockquote', 'strong', 'em', 'i', 'b'].includes(elementoSelecionado.tagName.toLowerCase()) : false;

  // ==================== RENDER ====================

  return (
    <>
      {/* AVISO MOBILE */}
      <div className="md:hidden fixed inset-0 z-[99999] bg-slate-900 text-white flex flex-col items-center justify-center p-8 text-center">
          <i className="fas fa-desktop text-6xl mb-6 text-indigo-400"></i>
          <h2 className="text-2xl font-black mb-3">Acesso Restrito ao Computador</h2>
          <p className="text-base text-slate-300">Para garantir uma experiência de nível profissional na edição e diagramação do seu E-book, o painel do E-bookPro deve ser acessado por uma tela maior.</p>
      </div>

      {/* APP DESKTOP */}
      <div className="hidden md:flex h-screen overflow-hidden relative bg-slate-100 text-slate-800 font-sans selection:bg-indigo-100">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <style dangerouslySetInnerHTML={{__html: `
          .input-standard { width: 100%; padding: 0.6rem 0.8rem; border-radius: 0.5rem; border: 1px solid #cbd5e1; background-color: #f8fafc; font-size: 0.75rem; outline: none; color: #334155; transition: all 0.2s; font-weight: 500;}
          .input-standard:focus { border-color: #6366f1; background-color: #ffffff; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
          .input-label { font-size: 0.65rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4rem; display: block; }
          .panel-section { padding: 1.2rem; border-bottom: 1px solid #f1f5f9; }
          ::-webkit-scrollbar { width: 6px; height: 6px;}
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
          .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; }
          .modal-content { background: white; border-radius: 1.5rem; padding: 2rem; max-width: 500px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
        `}} />

        <input type="file" ref={imageInputRef} onChange={handleImageUploadBtn} accept="image/*" className="hidden" />
        <input type="file" ref={extraImageInputRef} onChange={handleExtraImageUpload} accept="image/*" className="hidden" />

        {statusApis.processing && (
            <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center">
                <div className="w-14 h-14 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-5"></div>
                <p className="text-slate-800 font-black text-xl tracking-tight mb-2">{statusApis.texto}</p>
                <p className="text-slate-500 font-medium text-sm">Organizando estrutura e conteúdo editorial...</p>
            </div>
        )}

        {/* MODAL PARA INSERIR PÁGINA EXTRA */}
        {showModalPagina && (
          <div className="modal-overlay" onClick={() => setShowModalPagina(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2"><i className="fas fa-plus-circle text-indigo-600"></i> Inserir Página Extra</h2>
              <div className="space-y-4">
                <div>
                  <label className="input-label">Título (opcional)</label>
                  <input type="text" value={paginaTitulo} onChange={(e) => setPaginaTitulo(e.target.value)} className="input-standard" placeholder="Ex: Dedicatória, Agradecimentos..." />
                </div>
                <div>
                  <label className="input-label">URL da Imagem (opcional)</label>
                  <input type="text" value={paginaImagem} onChange={(e) => setPaginaImagem(e.target.value)} className="input-standard" placeholder="https://exemplo.com/imagem.jpg" />
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => extraImageInputRef.current?.click()} className="bg-slate-700 hover:bg-slate-800 text-white font-bold text-[9px] px-3 py-1.5 rounded-lg transition flex items-center gap-1.5">
                    <i className="fas fa-upload"></i> Upload Imagem
                  </button>
                  <span className="text-[9px] text-slate-400">(PC)</span>
                </div>
                <div>
                  <label className="input-label">Posição da Imagem</label>
                  <select value={paginaPosicaoImagem} onChange={(e) => setPaginaPosicaoImagem(e.target.value as any)} className="input-standard">
                    <option value="esquerda">Esquerda (flutuante)</option>
                    <option value="centro">Centralizada</option>
                    <option value="topo">Topo</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Local de Inserção</label>
                  <select value={paginaLocal} onChange={(e) => setPaginaLocal(e.target.value as any)} className="input-standard">
                    <option value="depois-capa">Depois da Capa</option>
                    <option value="depois-conclusao">Depois da Conclusão</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={inserirPaginaExtra} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg transition">Inserir</button>
                  <button onClick={() => setShowModalPagina(false)} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2.5 rounded-lg transition">Cancelar</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL BIBLIOTECA */}
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
                                            <button onClick={() => excluirDaBiblioteca(livro.id)} className="bg-red-50 text-red-500 hover:bg-red-50 hover:text-white font-bold px-3 py-2 rounded-lg text-xs transition"><i className="fas fa-trash"></i></button>
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
                                                if (previewFrameRef.current && previewFrameRef.current.contentWindow) {
                                                    previewFrameRef.current.contentWindow.postMessage({ type: 'DELETE_ELEMENT', id: elementoSelecionado.id }, '*');
                                                }
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
                                                <label className="input-label mb-2 text-indigo-800">🖼️ Controle Fotográfico (Unsplash)</label>
                                                <button onClick={buscarImagemUnsplash} className="w-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-[9px] uppercase py-2 rounded shadow-sm transition mb-3">
                                                    <i className="fas fa-search mr-1"></i> Buscar Unsplash
                                                </button>
                                                <input type="text" value={elementoSelecionado.src || elementoSelecionado.bgImage} onChange={(e) => atualizarElemento(elementoSelecionado.tagName === 'img' ? 'src' : 'bgImage', e.target.value)} className="input-standard text-[10px] mb-2 font-mono text-slate-500" placeholder="URL da imagem (cole aqui)..." />
                                            </div>

                                            {(elementoSelecionado.bgImage || elementoSelecionado.isBgTarget) && (
                                                <div className="mt-3 pt-3 border-t border-slate-100">
                                                    <label className="input-label mb-1">Clareamento de Fundo (Opacidade para Leitura)</label>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-slate-500 font-bold">0%</span>
                                                        <input 
                                                            type="range" min="0" max="1" step="0.05" defaultValue="0" 
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                const newBg = val === "0" ? `url('${elementoSelecionado.bgImage}')` : `linear-gradient(rgba(255,255,255,${val}), rgba(255,255,255,${val})), url('${elementoSelecionado.bgImage}')`;
                                                                if (previewFrameRef.current && previewFrameRef.current.contentWindow) {
                                                                    previewFrameRef.current.contentWindow.postMessage({ type: 'UPDATE_ELEMENT', id: elementoSelecionado.id, rawBgImage: newBg }, '*');
                                                                }
                                                            }} 
                                                            className="flex-1 accent-indigo-600 cursor-pointer" 
                                                        />
                                                        <span className="text-[10px] text-slate-500 font-bold">100%</span>
                                                    </div>
                                                    <button onClick={() => atualizarElemento('rawBgImage', 'none')} className="w-full mt-3 bg-orange-50 border border-orange-200 text-orange-700 font-bold text-[9px] uppercase py-2 rounded transition hover:bg-orange-100"><i className="fas fa-times-circle mr-1"></i> Remover Imagem de Fundo</button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {(!elementoSelecionado.isBgTarget && isTextElement) && (
                                        <div className="pt-3 border-t border-slate-100">
                                            <label className="input-label mb-2">Edição Manual de Texto</label>
                                            <textarea rows={5} value={elementoSelecionado.text} onChange={(e) => atualizarElemento('text', e.target.value, true)} className="input-standard resize-y shadow-inner text-sm leading-relaxed font-serif"></textarea>
                                            
                                            <div className="mt-3 flex gap-2">
                                                <button onClick={() => atualizarElemento('fontWeight', elementoSelecionado.fontWeight === 'bold' ? 'normal' : 'bold')} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-[9px] uppercase py-2 rounded transition shadow-sm border border-slate-700"><i className="fas fa-bold mr-1"></i> Negrito</button>
                                                
                                                <label className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[9px] uppercase py-2 rounded border border-slate-300 transition cursor-pointer flex items-center justify-center">
                                                    <i className="fas fa-palette mr-1"></i> Cor
                                                    <input type="color" value={elementoSelecionado.textColor || '#1e1914'} onChange={(e) => atualizarElemento('textColor', e.target.value)} className="w-0 h-0 opacity-0 absolute" />
                                                </label>
                                            </div>

                                            <div className="mt-2 flex gap-2">
                                                <button onClick={() => transformarEmNode('blockquote')} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[9px] uppercase py-2 rounded border border-slate-300 transition"><i className="fas fa-quote-right mr-1"></i> Virar Citação</button>
                                                <button onClick={() => transformarEmNode('div', 'highlight-box')} className="flex-1 bg-yellow-50 hover:bg-yellow-100 text-yellow-800 font-bold text-[9px] uppercase py-2 rounded border border-yellow-200 transition"><i className="fas fa-highlighter mr-1"></i> Fundo</button>
                                            </div>

                                            <button onClick={() => atualizarElemento('forceBreak', true)} className="w-full mt-3 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold text-[9px] uppercase py-2 rounded transition shadow-sm"><i className="fas fa-level-down-alt mr-1"></i> Mover p/ Próxima Página</button>
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
                                            <label className="input-label mb-2 text-[9px]">Cor Fundo (Box)</label>
                                            <input type="color" value={elementoSelecionado.bgColor || '#ffffff'} onChange={(e) => atualizarElemento('bgColor', e.target.value)} className="w-full h-8 rounded cursor-pointer border-none" />
                                        </div>
                                        <div>
                                            <label className="input-label mb-0 text-[9px] flex justify-between">Tamanho Fonte <span className="text-indigo-600 font-bold">{elementoSelecionado.fontSize || 16}px</span></label>
                                            <input type="range" min="10" max="60" value={elementoSelecionado.fontSize || 16} onChange={(e) => atualizarElemento('fontSize', parseInt(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-2" />
                                        </div>
                                    </div>
                                )}
                                
                                {elementoSelecionado.tagName !== 'img' && (
                                  <div className="panel-section border-t border-slate-100">
                                      <label className="input-label mb-2 text-[9px]">Alinhamento</label>
                                      <div className="flex bg-slate-100 rounded-lg border border-slate-200 p-1 gap-1">
                                          <button onClick={() => atualizarElemento('textAlign', 'text-left')} className="flex-1 py-1 rounded text-slate-600 hover:bg-white text-[10px] font-bold"><i className="fas fa-align-left"></i></button>
                                          <button onClick={() => atualizarElemento('textAlign', 'text-center')} className="flex-1 py-1 rounded text-slate-600 hover:bg-white text-[10px] font-bold"><i className="fas fa-align-center"></i></button>
                                          <button onClick={() => atualizarElemento('textAlign', 'text-right')} className="flex-1 py-1 rounded text-slate-600 hover:bg-white text-[10px] font-bold"><i className="fas fa-align-right"></i></button>
                                          <button onClick={() => atualizarElemento('textAlign', 'text-justify')} className="flex-1 py-1 rounded text-slate-600 hover:bg-white text-[10px] font-bold"><i className="fas fa-align-justify"></i></button>
                                      </div>
                                  </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {/* CONFIGURAÇÃO DE CONTEÚDO */}
                        <div className="panel-section">
                            <div className="flex justify-between items-center mb-3">
                                <label className="input-label mb-0 text-indigo-600">Conteúdo & Capítulos</label>
                                <div className="flex gap-2">
                                    <button onClick={() => setModalBiblioteca(true)} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 transition shadow-sm"><i className="fas fa-book mr-1"></i> Biblioteca ({livrosSalvos.length})</button>
                                    <button onClick={salvarNaBiblioteca} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 transition shadow-sm"><i className="fas fa-save mr-1"></i> Salvar Local</button>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <div>
                                    <label className="input-label">Título do Livro</label>
                                    <input type="text" value={livroTitulo} onChange={(e) => setLivroTitulo(e.target.value)} className="input-standard" placeholder="Ex: O Poder da Mente" />
                                </div>
                                <div>
                                    <label className="input-label">Nome do Autor</label>
                                    <input type="text" value={livroAutores} onChange={(e) => setLivroAutores(e.target.value)} className="input-standard" placeholder="Ex: João da Silva" />
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="input-label mb-0">Texto Base / Sumário / Ideia</label>
                                        <button onClick={iniciarNovoLivro} className="text-[9px] font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 transition shadow-sm flex items-center gap-1.5">
                                            <i className="fas fa-file-alt"></i> Novo Livro
                                        </button>
                                    </div>
                                    <textarea rows={4} value={productContent} onChange={(e) => setProductContent(e.target.value)} className="input-standard resize-y" placeholder="Descreva os capítulos ou cole seu texto aqui..."></textarea>
                                    <label className="flex items-center gap-2 mt-4 mb-2 text-xs font-bold text-slate-700 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={indexShowSubtopics} 
                                            onChange={(e) => setIndexShowSubtopics(e.target.checked)} 
                                            className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                                        />
                                        Mostrar Subtópicos no Índice
                                    </label>
                                </div>

                                <div className="grid grid-cols-3 gap-2 pt-1">
                                    <button onClick={iniciarEbookEtapas} className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-[9px] uppercase py-2 rounded-lg transition shadow-sm">1. Capa/Intro</button>
                                    <button onClick={continuarEbookEtapas} className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-[9px] uppercase py-2 rounded-lg transition shadow-sm">2. +3 Capítulos</button>
                                    <button onClick={finalizarEbookEtapas} className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-[9px] uppercase py-2 rounded-lg transition shadow-sm">3. Fim/Autor</button>
                                </div>
                            </div>
                        </div>

                        {/* ESTILOS E DESIGN */}
                        <div className="panel-section">
                            <label className="input-label text-indigo-600 mb-3">Estilo Visual do E-book</label>
                            
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label className="input-label text-[9px]">Fonte Títulos / Corpo</label>
                                    <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="input-standard text-[10px]">
                                        <option value="Lato">Lato & Playfair</option>
                                        <option value="Poppins">Poppins</option>
                                        <option value="Merriweather">Merriweather</option>
                                        <option value="Lora">Lora</option>
                                        <option value="EB Garamond">Garamond</option>
                                        <option value="Verdana">Verdana</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="input-label text-[9px]">Tamanho Base</label>
                                    <select value={tamanhoFonteBase} onChange={(e) => setTamanhoFonteBase(e.target.value)} className="input-standard text-[10px]">
                                        <option value="12pt">12pt (Compacto)</option>
                                        <option value="13pt">13pt (Padrão)</option>
                                        <option value="14pt">14pt (Confortável)</option>
                                        <option value="15pt">15pt (Grande)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label className="input-label text-[9px]">Paleta de Cores</label>
                                    <select value={paletaCores} onChange={(e: any) => setPaletaCores(e.target.value)} className="input-standard text-[10px]">
                                        <option value="classico">Clássico (Madeira/Café)</option>
                                        <option value="moderno">Moderno (Azul Executivo)</option>
                                        <option value="sepia">Sépia (Vintage)</option>
                                        <option value="dark">Dark (Noturno)</option>
                                        <option value="manual">Manual (Personalizado)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="input-label text-[9px]">Estilo da Capa</label>
                                    <select value={tipoCapa} onChange={(e: any) => setTipoCapa(e.target.value)} className="input-standard text-[10px]">
                                        <option value="imagem-texto">Capa Foto + Título</option>
                                        <option value="imagem-pura">Capa Imagem Pura</option>
                                        <option value="texto">Capa Minimalista Texto</option>
                                    </select>
                                </div>
                            </div>

                            {paletaCores === 'manual' && (
                                <div className="bg-slate-100 p-3 rounded-lg grid grid-cols-2 gap-2 mb-3">
                                    <div>
                                        <label className="input-label text-[9px]">Primária</label>
                                        <input type="color" value={corManualPri} onChange={(e) => setCorManualPri(e.target.value)} className="w-full h-7 rounded border cursor-pointer" />
                                    </div>
                                    <div>
                                        <label className="input-label text-[9px]">Secundária</label>
                                        <input type="color" value={corManualSec} onChange={(e) => setCorManualSec(e.target.value)} className="w-full h-7 rounded border cursor-pointer" />
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label className="input-label text-[9px]">Molde de Capítulos</label>
                                    <select value={estiloCapitulos} onChange={(e: any) => setEstiloCapitulos(e.target.value)} className="input-standard text-[10px]">
                                        <option value="inline-imagem">Padrão com Banner de Imagem</option>
                                        <option value="box-arredondado">Capa Exclusiva com Box Branco</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="input-label text-[9px]">Rodapé da Página</label>
                                    <select value={estiloRodape} onChange={(e: any) => setEstiloRodape(e.target.value)} className="input-standard text-[10px]">
                                        <option value="linha-superior">Linha Superior + Autor + Num</option>
                                        <option value="simples">Simples (Autor + Num)</option>
                                        <option value="centralizado-circulo">Centralizado com Círculo</option>
                                        <option value="centralizado">Apenas Número Centralizado</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label className="input-label text-[9px]">Tipo de Livro</label>
                                    <select value={modoConteudo} onChange={(e: any) => setModoConteudo(e.target.value)} className="input-standard text-[10px]">
                                        <option value="expandido">Padrão (Expandido)</option>
                                        <option value="rigoroso">Rigoroso (texto original)</option>
                                        <option value="receitas">Receitas</option>
                                        <option value="historias">Histórias</option>
                                        <option value="academico">Acadêmico</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="input-label text-[9px]">Recuo do Parágrafo</label>
                                    <select value={recuoParagrafo} onChange={(e) => setRecuoParagrafo(e.target.value)} className="input-standard text-[10px]">
                                        <option value="0px">0px (sem recuo)</option>
                                        <option value="10px">10px</option>
                                        <option value="20px">20px (padrão)</option>
                                        <option value="30px">30px</option>
                                        <option value="40px">40px</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mt-3 border-t border-slate-200 pt-3">
                                <button onClick={() => setShowModalPagina(true)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase py-2 rounded-lg transition shadow-sm flex items-center justify-center gap-2">
                                    <i className="fas fa-plus-circle"></i> Inserir Página Extra
                                </button>
                                <p className="text-[9px] text-slate-400 text-center mt-1.5">Adicione dedicatória, agradecimentos, etc.</p>
                            </div>

                        </div>

                        {/* CONFIGURAÇÃO DE FUNDO DA 2ª PÁGINA */}
                        <div className="panel-section">
                            <div className="flex items-center justify-between mb-2">
                                <label className="input-label mb-0 text-indigo-600">Fundo da 2ª Página de Capítulo</label>
                                <input type="checkbox" checked={ativarBgSegundaPagina} onChange={(e) => setAtivarBgSegundaPagina(e.target.checked)} className="rounded text-indigo-600 accent-indigo-600 cursor-pointer" />
                            </div>
                            {ativarBgSegundaPagina && (
                                <div className="space-y-2 mt-2">
                                    <input type="text" value={bgSegundaPaginaUrl} onChange={(e) => setBgSegundaPaginaUrl(e.target.value)} className="input-standard text-[10px]" placeholder="URL de fundo opcional (ou usa do cap)..." />
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-bold text-slate-500">Opacidade:</span>
                                        <input type="range" min="0.5" max="0.98" step="0.02" value={bgSegundaPaginaOpacidade} onChange={(e) => setBgSegundaPaginaOpacidade(e.target.value)} className="flex-1 accent-indigo-600 cursor-pointer" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Motor IA: Google Gemini</span>
                <span className="text-slate-300">v2.0</span>
            </div>
        </aside>

        {/* ÁREA DE PREVISUALIZAÇÃO (apenas iframe) */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-200 relative">
            <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-end z-20 shadow-sm flex-shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={desfazerCodigo} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs shadow-sm transition flex items-center gap-1.5"><i className="fas fa-undo"></i> Desfazer</button>
                    <button onClick={() => (window as any).baixarPdf()} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-lg text-xs shadow-md shadow-indigo-200 transition flex items-center gap-2"><i className="fas fa-print"></i> Imprimir / PDF</button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 flex justify-center relative">
                <iframe ref={previewFrameRef} id="previewFrame" className="w-full h-full border-none shadow-2xl bg-transparent rounded-lg" title="Preview E-book"></iframe>
            </div>
        </main>
      </div>
    </>
  );
}
