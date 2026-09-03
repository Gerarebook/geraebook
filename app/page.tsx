// @ts-nocheck
'use client';

import { supabase } from '@/lib/supabase';
import React, { useEffect, useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
// ============================================================
// FUNÇÕES AUXILIARES DE PAGINAÇÃO E ÍNDICE (UNIFICADAS)
// ============================================================

function executarRefluxoCompleto(
  containerId: string,
  alturaMaxima: number,
  indexShowSubtopics: boolean,
  bgSegundaPaginaUrl: string,
  bgSegundaPaginaOpacidade: string,
  bgEnabled: boolean
) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // --- 1. Limpar páginas existentes (exceto capas e páginas especiais) ---
  const paginasExistentes = container.querySelectorAll('.page-container:not(.page-cover-img):not(.page-cover-text):not(.page-cover-pura):not(.cap-img-overlay):not(.cap-box-rounded):not(.cap-img-pura)');
  paginasExistentes.forEach(p => p.remove());

  // --- 2. Recolher todos os elementos filhos diretos que não são containers de página ---
  const todosElementos = Array.from(container.children).filter(el =>
    !el.classList.contains('page-container') &&
    el.tagName !== 'STYLE' &&
    el.tagName !== 'SCRIPT'
  );

  // --- 3. Função para criar uma nova página ---
  function criarNovaPagina() {
        const novaPagina = document.createElement('div');
        novaPagina.className = 'page-container chapter-text-page';
        novaPagina.style.overflow = 'hidden';
        novaPagina.style.breakAfter = 'page';

        const header = document.createElement('div');
        header.className = 'page-header';
        header.innerHTML = '<span>' + textoEsquerdo + '</span><span>' + tituloDoLivro + '</span>';
        novaPagina.appendChild(header);

        const contentArea = document.createElement('div');
        contentArea.className = 'content-area';
        contentArea.style.display = 'flex';
        contentArea.style.flexDirection = 'column';
        contentArea.style.width = '100%'; 
        novaPagina.appendChild(contentArea);

        const footer = document.createElement('div');
        footer.className = 'page-footer';
        footer.innerHTML = modeloFooter; 
        novaPagina.appendChild(footer);

        // CORREÇÃO: Garante que a página do autor sempre fique no final!
        const authorPage = container.querySelector('.author-page');
        if (authorPage) {
            container.insertBefore(novaPagina, authorPage);
        } else {
            container.appendChild(novaPagina);
        }
        
        return { pagina: novaPagina, areaTexto: contentArea };
      }
      
  let paginaAtual = criarNovaPagina();

  // --- 4. Distribuir elementos pelas páginas ---
  todosElementos.forEach(elemento => {
    const footer = paginaAtual.querySelector('.page-footer');
    paginaAtual.insertBefore(elemento, footer);

    // Verifica se estourou a altura
    if (paginaAtual.scrollHeight > alturaMaxima) {
      // Move o elemento para a nova página
      const novaPagina = criarNovaPagina();
      const novoFooter = novaPagina.querySelector('.page-footer');
      novaPagina.insertBefore(elemento, novoFooter);

      // Anti-órfão: se o último elemento da página anterior era um título, move-o junto
      const paginaAnterior = paginaAtual.previousElementSibling;
      if (paginaAnterior && paginaAnterior.classList.contains('page-container')) {
        const footerAnterior = paginaAnterior.querySelector('.page-footer');
        const ultimoElemento = footerAnterior.previousElementSibling;
        if (ultimoElemento && (ultimoElemento.tagName === 'H2' || ultimoElemento.tagName === 'H3')) {
          novaPagina.insertBefore(ultimoElemento, elemento);
        }
      }

      paginaAtual = novaPagina;
    }
  });

  // --- 5. Remover páginas vazias ---
  container.querySelectorAll('.page-container').forEach(page => {
    const conteudo = page.querySelectorAll('p, h1, h2, h3, img, ul, blockquote, .toc-container');
    if (conteudo.length === 0) {
      page.remove();
    }
  });

  // --- 6. Sincronizar Índice ---
  function sincronizarIndice() {
    // Remover índices duplicados e deixar apenas o primeiro
    const tocs = container.querySelectorAll('.toc-container');
    if (tocs.length > 1) {
      for (let i = 1; i < tocs.length; i++) {
        tocs[i].closest('.page-container')?.remove();
      }
    }
    const mainToc = tocs[0];
    if (!mainToc) return;

    // Coletar títulos
    const selector = indexShowSubtopics
      ? 'h1.chapter-title-exclusive, h2.chapter-title-inline, h3.subtopic-title'
      : 'h1.chapter-title-exclusive, h2.chapter-title-inline';
    const titulos = container.querySelectorAll(selector);
    const titulosVistos = new Set();

    mainToc.innerHTML = '';

    titulos.forEach((titleEl) => {
      // Ignorar títulos de capa, índice, etc.
      if (titleEl.closest('.page-cover-img, .page-cover-text, .page-cover-pura')) return;
      let texto = titleEl.textContent?.trim() || '';
      if (/índice|sumário/i.test(texto)) return;

      // Normalizar para evitar duplicatas
      let chave = texto.toLowerCase().replace(/capítulo\s*\d+:/, '').trim();
      if (titulosVistos.has(chave)) return;
      titulosVistos.add(chave);

      if (!titleEl.id) {
        titleEl.id = 'sec-' + Math.random().toString(36).substr(2, 9);
      }

      const a = document.createElement('a');
      a.className = 'toc-item';
      if (titleEl.tagName === 'H1' || titleEl.tagName === 'H2') {
        a.classList.add('toc-main-chapter');
        a.style.fontWeight = indexShowSubtopics ? '700' : '400';
        a.style.color = 'var(--color-primary)';
      } else if (titleEl.tagName === 'H3') {
        a.classList.add('toc-subtopic');
        a.style.paddingLeft = '20px';
        a.style.fontSize = '0.9em';
        a.style.opacity = '0.85';
        a.style.fontWeight = '400';
        if (!indexShowSubtopics) {
          a.style.display = 'none';
        }
      }

      a.href = '#' + titleEl.id;
      const spanTitle = document.createElement('span');
      spanTitle.innerText = texto;
      const spanDots = document.createElement('span');
      spanDots.className = 'toc-dots';
      const spanPage = document.createElement('span');
      spanPage.className = 'toc-page-num';

      a.appendChild(spanTitle);
      a.appendChild(spanDots);
      a.appendChild(spanPage);
      mainToc.appendChild(a);
    });

    // Atualizar números das páginas
    const allPages = container.querySelectorAll('.page-container, .page-cover-img, .page-cover-text, .page-cover-pura, .cap-img-overlay, .cap-box-rounded, .cap-img-pura');
    const pageArray = Array.from(allPages);
    document.querySelectorAll('.toc-item').forEach(item => {
      const href = item.getAttribute('href');
      if (!href || !href.startsWith('#')) return;
      const target = document.getElementById(href.substring(1));
      if (target) {
        const page = target.closest('.page-container, .page-cover-img, .page-cover-text, .page-cover-pura, .cap-img-overlay, .cap-box-rounded, .cap-img-pura');
        if (page) {
          const idx = pageArray.indexOf(page) + 1;
          const numSpan = item.querySelector('.toc-page-num');
          if (numSpan) numSpan.innerText = String(idx);
        }
      }
    });
  }

  sincronizarIndice();

  // --- 7. Aplicar fundo da segunda página (opcional) ---
  let chIndex = 0;
  let currentChapterImg = '';
  container.querySelectorAll('.page-container').forEach((p) => {
    const imgEl = p.querySelector('.chapter-banner-img');

    // Detectar início de capítulo
    if (p.querySelector('h2.chapter-title-inline') || p.classList.contains('page-cover-img') || p.classList.contains('cap-img-overlay') || p.classList.contains('cap-box-rounded') || p.classList.contains('cap-img-pura')) {
      chIndex = 1;
      if (imgEl) {
        currentChapterImg = imgEl.src;
      } else if (p.style.backgroundImage && p.style.backgroundImage !== 'none') {
        const match = p.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
        if (match) currentChapterImg = match[1];
      }
    } else {
      chIndex++;
    }

    if (chIndex === 2 && !p.classList.contains('author-page') && !p.classList.contains('toc-container') && !p.hasAttribute('data-bg-removed')) {
      p.classList.add('chapter-page-2');
      let finalBgUrl = bgSegundaPaginaUrl.trim() !== '' ? bgSegundaPaginaUrl : currentChapterImg;
      if (finalBgUrl && finalBgUrl.trim() !== '') {
        p.dataset.bgUrl = finalBgUrl;
        if (bgEnabled) {
          p.style.setProperty('background-image', `linear-gradient(rgba(255,255,255, ${bgSegundaPaginaOpacidade}), rgba(255,255,255, ${bgSegundaPaginaOpacidade})), url('${finalBgUrl}')`, 'important');
          p.style.setProperty('background-size', 'cover', 'important');
          p.style.setProperty('background-position', 'center', 'important');
        } else {
          p.style.removeProperty('background-image');
          p.style.removeProperty('background-size');
          p.style.removeProperty('background-position');
        }
      }
    } else {
      p.classList.remove('chapter-page-2');
      if (!p.classList.contains('cap-img-overlay') && !p.classList.contains('cap-box-rounded') && !p.classList.contains('page-cover-img') && !p.classList.contains('page-cover-pura') && !p.classList.contains('cap-img-pura')) {
        if (!p.hasAttribute('data-custom-bg')) {
          p.style.removeProperty('background-image');
          p.style.removeProperty('background-size');
          p.style.removeProperty('background-position');
        }
      }
    }
  });

  // --- 8. Forçar reflow para ajustar numeração ---
  setTimeout(() => sincronizarIndice(), 50);
}

// ============================================================
// SCRIPT INJETADO NO IFRAME (Cabeçalho Dinâmico e Blindagem de Cores)
// ============================================================

function getScriptPreview(
  indexShowSubtopics: boolean,
  ativarBgSegundaPagina: boolean,
  bgSegundaPaginaUrl: string,
  bgSegundaPaginaOpacidade: string
) {
  return `
<script>
  (function() {
    let observer;
    let isEditMode = false;
    let selectedEl = null;

    function rgbToHex(rgb) {
      if (!rgb || rgb === 'rgba(0, 0, 0, 0)' || rgb === 'transparent') return '#ffffff';
      let m = rgb.match(/^rgb(?:a)?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
      if (!m) return '#000000';
      return "#" + (1 << 24 | m[1] << 16 | m[2] << 8 | m[3]).toString(16).slice(1);
    }

    function executarRefluxoCompleto() {
      if (observer) observer.disconnect();
      
      // SALVA A POSIÇÃO DA TELA PARA NÃO PULAR!
      const currentScrollY = window.scrollY;

      const container = document.getElementById('ebook-container');
      if (!container) return;

      // --- CORREÇÃO: Lê o título da meta tag (Passo 3) ---
      const metaTitle = document.getElementById('meta-book-title');
      let tituloDoLivro = metaTitle && metaTitle.getAttribute('content') ? metaTitle.getAttribute('content').toUpperCase().trim() : "";

      const metaHeader = document.getElementById('meta-header-text');
      let textoEsquerdo = metaHeader && metaHeader.getAttribute('content') ? metaHeader.getAttribute('content').toUpperCase().trim() : '';

      container.querySelectorAll('.page-header').forEach(h => {
         const spans = h.querySelectorAll('span');
         if (spans.length >= 1) {
             spans[0].textContent = textoEsquerdo; 
         }
         if (spans.length >= 2) {
             spans[1].textContent = tituloDoLivro;
         }
      });

      let modeloFooter = '<span class="page-number"></span>';
      const footerExistente = container.querySelector('.page-footer');
      if (footerExistente) {
        modeloFooter = footerExistente.innerHTML;
      }

      // A MÁGICA DA BLINDAGEM: Desempacota APENAS as páginas de texto comuns.
      // Capa, Avisos Legais, Conclusão e Autor ficam INTACTOS e PROTEGIDOS no DOM!
      const textPages = container.querySelectorAll('.chapter-text-page');
      textPages.forEach(p => {
        const area = p.querySelector('.content-area') || p;
        while (area.firstChild) {
          container.insertBefore(area.firstChild, p);
        }
        p.remove();
      });

      // Coleta os elementos soltos para repaginar com JS Puro
     // Coleta os elementos soltos para repaginar com JS Puro
      const elementosIA = Array.from(container.children).filter(el =>
        !el.classList.contains('page-container') &&
        !el.classList.contains('page-cover-img') &&
        !el.classList.contains('page-cover-pura') &&
        !el.classList.contains('page-cover-text') &&
        !el.classList.contains('legal-page') &&
        !el.classList.contains('author-page') &&
        !el.classList.contains('page-extra') &&
        el.tagName !== 'STYLE' &&
        el.tagName !== 'SCRIPT'
      );

      // BLINDAGEM ABSOLUTA DA CONCLUSÃO NO FINAL DA FILA (Anti-Crash)
      const indexConclusao = elementosIA.findIndex(el => el.id === 'conclusao' || (el.tagName === 'H1' && (el.textContent || '').toLowerCase().includes('conclusão')));
      
      if (indexConclusao !== -1) {
          const indexNovoCapitulo = elementosIA.findIndex((el, i) => i > indexConclusao && el.tagName === 'H2');
          if (indexNovoCapitulo !== -1) {
              const partesConclusao = elementosIA.splice(indexConclusao, indexNovoCapitulo - indexConclusao);
              elementosIA.push(...partesConclusao);
          }
      }

      const LIMITE_ALTURA_TEXTO = 830; // Ajuste fino milimétrico para folhas A4

      function criarNovaPagina() {
        const novaPagina = document.createElement('div');
        novaPagina.className = 'page-container chapter-text-page';
        novaPagina.style.overflow = 'hidden';
        novaPagina.style.breakAfter = 'page';

        const header = document.createElement('div');
        header.className = 'page-header';
        header.innerHTML = '<span>' + textoEsquerdo + '</span><span>' + tituloDoLivro + '</span>';
        novaPagina.appendChild(header);

        const contentArea = document.createElement('div');
        contentArea.className = 'content-area';
        contentArea.style.display = 'flex';
        contentArea.style.flexDirection = 'column';
        contentArea.style.width = '100%'; 
        novaPagina.appendChild(contentArea);

        const footer = document.createElement('div');
        footer.className = 'page-footer';
        footer.innerHTML = modeloFooter; 
        novaPagina.appendChild(footer);

        // Insere sempre ANTES da página do autor, garantindo que o autor seja sempre a última
        const endPage = container.querySelector('.author-page');
        if (endPage) {
            container.insertBefore(novaPagina, endPage);
        } else {
            container.appendChild(novaPagina);
        }
        return { pagina: novaPagina, areaTexto: contentArea };
      }

      if (elementosIA.length > 0) {
        let atual = criarNovaPagina();

        for (let i = 0; i < elementosIA.length; i++) {
          let el = elementosIA[i];
          let deveQuebrar = false;

          // 1. Regra Proativa: H1 e H2 exigem página nova imediata
          if (atual.areaTexto.children.length > 0) {
            if (el.tagName === 'H1' || el.tagName === 'H2') {
              deveQuebrar = true; 
            } 
            // A MÁGICA DOS SUBTÍTULOS: Se a página passou da metade, joga o subtítulo pra próxima!
            else if (el.tagName === 'H3' && atual.areaTexto.scrollHeight > (LIMITE_ALTURA_TEXTO - 280)) {
              deveQuebrar = true; 
            }
          }

          if (deveQuebrar) atual = criarNovaPagina();

          atual.areaTexto.appendChild(el);

          // 2. Regra Reativa: Se o parágrafo ou imagem estourar o limite da folha
          if (atual.areaTexto.scrollHeight > LIMITE_ALTURA_TEXTO) {
            atual.areaTexto.removeChild(el); 
            
            // Lógica Anti-Órfão Turbinada (Protege H2, H3 e QUOTES)
            let orfao = atual.areaTexto.lastElementChild;
            let moveOrfao = false;
            if (orfao && (orfao.tagName === 'H2' || orfao.tagName === 'H3' || orfao.tagName === 'BLOCKQUOTE')) {
                moveOrfao = true;
                atual.areaTexto.removeChild(orfao);
            }
            
            atual = criarNovaPagina();
            if (moveOrfao) atual.areaTexto.appendChild(orfao);
            atual.areaTexto.appendChild(el);
          }
        }
      }

      container.querySelectorAll('.chapter-text-page').forEach(page => {
        const area = page.querySelector('.content-area');
        if (!area || area.children.length === 0) page.remove();
      });

      function sincronizarIndice() {
        const tocs = container.querySelectorAll('.toc-container');
        if (tocs.length > 1) {
          for (let i = 1; i < tocs.length; i++) tocs[i].closest('.page-container')?.remove();
        }
        const mainToc = tocs[0];
        if (!mainToc) return;

        // BUSCA UNIVERSAL DE TÍTULOS (Captura qualquer H1, H2 ou H3 do livro sem falhar)
        const titulos = container.querySelectorAll('h1, h2, h3');
        const titulosVistos = new Set();
        mainToc.innerHTML = '';
        
        let currentPageArea = mainToc.closest('.content-area');
        let currentToc = mainToc;

        titulos.forEach((titleEl) => {
          if (titleEl.closest('.page-cover-img, .page-cover-text, .page-cover-pura, .legal-page')) return;
          
          let texto = titleEl.textContent?.trim() || '';
          if (/índice|sumário/i.test(texto)) return;

          let chave = texto.toLowerCase().replace(/capítulo\s*\d+:/, '').trim();
          if (titulosVistos.has(chave)) return;
          titulosVistos.add(chave);

          if (!titleEl.id) titleEl.id = 'sec-' + Math.random().toString(36).substr(2, 9);

          const a = document.createElement('a');
          a.className = 'toc-item';
          
          if (titleEl.tagName === 'H1' || titleEl.tagName === 'H2') {
            a.classList.add('toc-main-chapter');
            a.style.fontWeight = ${indexShowSubtopics} ? '700' : '400';
            a.style.color = 'var(--color-primary)';
          } else if (titleEl.tagName === 'H3') {
            if (!${indexShowSubtopics}) return; // Trava do subtópico apenas na criação
            a.classList.add('toc-subtopic');
          }

          a.href = '#' + titleEl.id;
          const spanTitle = document.createElement('span');
          spanTitle.innerText = texto;
          const spanDots = document.createElement('span');
          spanDots.className = 'toc-dots';
          const spanPage = document.createElement('span');
          spanPage.className = 'toc-page-num';

          a.appendChild(spanTitle);
          a.appendChild(spanDots);
          a.appendChild(spanPage);
          
          currentToc.appendChild(a);

          if (currentPageArea && currentPageArea.scrollHeight > 750) {
             let novaPag = criarNovaPagina();
             let novoToc = document.createElement('div');
             novoToc.className = 'toc-container';
             novaPag.areaTexto.appendChild(novoToc);
             
             currentPageArea.closest('.page-container').insertAdjacentElement('afterend', novaPag.pagina);
             
             currentToc = novoToc;
             currentPageArea = novaPag.areaTexto;
          }
          currentToc.appendChild(a);
          }
        });

        const allPages = container.querySelectorAll('.page-container, .page-cover-img, .page-cover-text, .page-cover-pura, .cap-img-overlay, .cap-box-rounded, .cap-img-pura');
        const pageArray = Array.from(allPages);
        document.querySelectorAll('.toc-item').forEach(item => {
          const href = item.getAttribute('href');
          if (!href || !href.startsWith('#')) return;
          const target = document.getElementById(href.substring(1));
          if (target) {
            const page = target.closest('.page-container, .page-cover-img, .page-cover-text, .page-cover-pura, .cap-img-overlay, .cap-box-rounded, .cap-img-pura');
            if (page) {
              const idx = pageArray.indexOf(page) + 1;
              const numSpan = item.querySelector('.toc-page-num');
              if (numSpan) numSpan.innerText = String(idx);
            }
          }
        });
      }

      sincronizarIndice();

      let chIndex = 0;
      let currentChapterImg = '';
      container.querySelectorAll('.page-container').forEach((p) => {
        const imgEl = p.querySelector('.chapter-banner-img');

        if (p.querySelector('h2.chapter-title-inline') || p.classList.contains('page-cover-img') || p.classList.contains('cap-img-overlay') || p.classList.contains('cap-box-rounded') || p.classList.contains('cap-img-pura')) {
          chIndex = 1;
          if (imgEl) {
            currentChapterImg = imgEl.src;
          } else if (p.style.backgroundImage && p.style.backgroundImage !== 'none') {
            const match = p.style.backgroundImage.match(/url\\(['"]?(.*?)['"]?\\)/);
            if (match) currentChapterImg = match[1];
          }
        } else {
          chIndex++;
        }

        if (chIndex === 2 && !p.classList.contains('author-page') && !p.classList.contains('toc-container') && !p.hasAttribute('data-bg-removed')) {
          p.classList.add('chapter-page-2');
          let finalBgUrl = '${bgSegundaPaginaUrl}'.trim() !== '' ? '${bgSegundaPaginaUrl}' : currentChapterImg;
          if (finalBgUrl && finalBgUrl.trim() !== '') {
            p.dataset.bgUrl = finalBgUrl;
            if (${ativarBgSegundaPagina}) {
              let opac = parseFloat('${bgSegundaPaginaOpacidade}') * 100;
              p.style.setProperty('background-image', \`linear-gradient(color-mix(in srgb, var(--color-bg) \${opac}%, transparent), color-mix(in srgb, var(--color-bg) \${opac}%, transparent)), url('\${finalBgUrl}')\`, 'important');
              p.style.setProperty('background-size', 'cover', 'important');
              p.style.setProperty('background-position', 'center', 'important');
            } else {
              p.style.removeProperty('background-image');
              p.style.removeProperty('background-size');
              p.style.removeProperty('background-position');
            }
          }
        } else {
          p.classList.remove('chapter-page-2');
          if (!p.classList.contains('cap-img-overlay') && !p.classList.contains('cap-box-rounded') && !p.classList.contains('page-cover-img') && !p.classList.contains('page-cover-pura') && !p.classList.contains('cap-img-pura')) {
            if (!p.hasAttribute('data-custom-bg')) {
              p.style.removeProperty('background-image');
              p.style.removeProperty('background-size');
              p.style.removeProperty('background-position');
            }
          }
        }
      });

      if (isEditMode && selectedEl) {
         selectedEl.style.outline = '3px solid #4f46e5';
      }

      // RESTAURA A POSIÇÃO IMEDIATAMENTE APÓS A RECONSTRUÇÃO
      window.scrollTo(0, currentScrollY);

      setTimeout(() => {
        if (observer) observer.observe(document.getElementById('ebook-container'), { childList: true, subtree: true });
      }, 300);
    }

    window.addEventListener('message', (e) => {
      if (e.data.type === 'TOGGLE_EDIT_MODE') {
         isEditMode = e.data.value;
         if (!isEditMode && selectedEl) {
            selectedEl.style.outline = '';
            selectedEl = null;
         }
      }
      
      // SISTEMA DE DESFAZER COM INJEÇÃO SUAVE
      if (e.data.type === 'UNDO_HTML') {
         const scrollY = window.scrollY;
         document.getElementById('ebook-container').innerHTML = e.data.html;
         setTimeout(() => {
            executarRefluxoCompleto();
            window.scrollTo(0, scrollY);
         }, 50);
      }

      if (e.data.type === 'UPDATE_ELEMENT') {
         const target = document.getElementById(e.data.id);
         if (target) {
            if (e.data.text !== undefined && e.data.forceTextUpdate) target.innerHTML = e.data.text;
            if (e.data.src !== undefined && target.tagName === 'IMG') target.src = e.data.src;
            if (e.data.bgImage !== undefined) target.style.setProperty('background-image', \`url(\${e.data.bgImage})\`, 'important');
            if (e.data.rawBgImage !== undefined) target.style.setProperty('background-image', e.data.rawBgImage, 'important');
            if (e.data.textColor !== undefined) target.style.setProperty('color', e.data.textColor, 'important');
            if (e.data.bgColor !== undefined) target.style.setProperty('background-color', e.data.bgColor, 'important');
            if (e.data.fontSize !== undefined) target.style.setProperty('font-size', e.data.fontSize + 'px', 'important');
            if (e.data.fontWeight !== undefined) target.style.setProperty('font-weight', e.data.fontWeight, 'important');
            if (e.data.textAlign !== undefined) target.className = target.className.replace(/text-(left|center|right|justify)/, '') + ' ' + e.data.textAlign;

            window.parent.postMessage({ type: 'HTML_SYNC', html: document.getElementById('ebook-container').innerHTML }, '*');
         }
      }
      if (e.data.type === 'REPLACE_ELEMENT_HTML') {
         const target = document.getElementById(e.data.id);
         if (target) {
            target.outerHTML = e.data.newHtml;
            window.parent.postMessage({ type: 'HTML_SYNC', html: document.getElementById('ebook-container').innerHTML }, '*');
            setTimeout(executarRefluxoCompleto, 100);
         }
      }
      if (e.data.type === 'DELETE_ELEMENT') {
         const target = document.getElementById(e.data.id);
         if (target) {
            target.remove();
            window.parent.postMessage({ type: 'HTML_SYNC', html: document.getElementById('ebook-container').innerHTML }, '*');
            setTimeout(executarRefluxoCompleto, 100);
         }
      }
    });  

    document.addEventListener('mouseover', (e) => {
      if (!isEditMode) return;
      const el = e.target.closest('p, h1, h2, h3, h4, blockquote, img, li, .page-container, .highlight-box');
      if (el && el !== selectedEl) el.style.outline = '2px dashed rgba(99,102,241,0.5)';
    });
    
    document.addEventListener('mouseout', (e) => {
      if (!isEditMode) return;
      const el = e.target.closest('p, h1, h2, h3, h4, blockquote, img, li, .page-container, .highlight-box');
      if (el && el !== selectedEl) el.style.outline = '';
    });
    
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link && link.getAttribute('href') && link.getAttribute('href').startsWith('#')) {
        e.preventDefault(); 
        e.stopPropagation();
        const targetId = link.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return; 
      }

      if (!isEditMode) return;
      
      e.preventDefault(); 
      e.stopPropagation();
      const el = e.target.closest('p, h1, h2, h3, h4, blockquote, img, li, .page-container, .highlight-box');
      
      if (el) {
         if (selectedEl) selectedEl.style.outline = '';
         selectedEl = el;
         el.style.outline = '3px solid #4f46e5';
         
         if (!el.id) el.id = 'el-' + Math.random().toString(36).substr(2, 9);
         
         const computed = window.getComputedStyle(el);
         
         window.parent.postMessage({
            type: 'ELEMENT_SELECTED',
            id: el.id,
            tagName: el.tagName.toLowerCase(),
            text: el.innerHTML,
            src: el.src,
            bgImage: computed.backgroundImage !== 'none' ? computed.backgroundImage : undefined,
            isBgTarget: el.classList.contains('page-container'),
            textColor: rgbToHex(computed.color),
            bgColor: rgbToHex(computed.backgroundColor),
            fontSize: parseInt(computed.fontSize),
            fontWeight: computed.fontWeight,
            textAlign: computed.textAlign
         }, '*');
      }
    }, true);

    if (document.readyState === 'complete') {
      executarRefluxoCompleto();
    } else {
      window.addEventListener('load', () => {
        executarRefluxoCompleto();
        setTimeout(executarRefluxoCompleto, 500);
      });
    }

    observer = new MutationObserver(() => {
      clearTimeout(window._reflowTimeout);
      window._reflowTimeout = setTimeout(executarRefluxoCompleto, 300);
    });
    
    const containerParaObservar = document.getElementById('ebook-container');
    if (containerParaObservar) observer.observe(containerParaObservar, { childList: true, subtree: true });

  })();
</script>
  `;
}
// ============================================================
// COMPONENTE PRINCIPAL (Home)
// ============================================================

export default function Home() {
  // Estados principais
  const [historicoCodigo, setHistoricoCodigo] = useState<string[]>([]);
  const [htmlAtual, setHtmlAtual] = useState<string>('');
  const [modoInspetor, setModoInspetor] = useState(false);
  const [elementoSelecionado, setElementoSelecionado] = useState<any>(null);
  const [statusApis, setStatusApis] = useState<{ texto: string; processing: boolean }>({
    texto: 'Aguardando Operação',
    processing: false,
  });
  const [recarregarIframe, setRecarregarIframe] = useState(true);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);

  // Configurações de estilo
  const [fontFamily, setFontFamily] = useState('Lato');
  const [tamanhoFonteBase, setTamanhoFonteBase] = useState('14pt');
  const [espacamentoLinhas, setEspacamentoLinhas] = useState('1.5');
  const [espacamentoParagrafo, setEspacamentoParagrafo] = useState('0.8em');
  const [recuoParagrafo, setRecuoParagrafo] = useState('20px');
  const [tipoBorda, setTipoBorda] = useState<'none' | 'single' | 'medium' | 'double-thin'>('none');
  const [paletaCores, setPaletaCores] = useState<'branco-preto' | 'branco-dourado' | 'branco-verde' | 'manual'>('branco-preto');
  const [corManualPri, setCorManualPri] = useState('#2563eb');
  const [corManualSec, setCorManualSec] = useState('#3b82f6');
  const [corManualText, setCorManualText] = useState('#111827');
  const [corManualBg, setCorManualBg] = useState('#ffffff');
  const [alinhamentoCapitulo, setAlinhamentoCapitulo] = useState<'center' | 'flex-start' | 'flex-end'>('center');
  const [corBoxCapitulo, setCorBoxCapitulo] = useState('rgba(255, 255, 255, 0.95)');
  const [estiloRodape, setEstiloRodape] = useState<'simples' | 'simples-circulo' | 'linha-superior' | 'centralizado' | 'centralizado-circulo'>('linha-superior');
  const [autorPosicao, setAutorPosicao] = useState<'esquerda' | 'topo'>('esquerda');
  const [autorFormato, setAutorFormato] = useState<'circulo' | 'retangulo'>('retangulo');

  // Fundo da 2ª página
  const [ativarBgSegundaPagina, setAtivarBgSegundaPagina] = useState(true);
  const [bgSegundaPaginaUrl, setBgSegundaPaginaUrl] = useState('');
  const [bgSegundaPaginaOpacidade, setBgSegundaPaginaOpacidade] = useState('0.85');

  // Conteúdo do livro
  const [livroTitulo, setLivroTitulo] = useState('');
  const [textoCabecalho, setTextoCabecalho] = useState('');
  const [livroAutores, setLivroAutores] = useState('');
  const [productContent, setProductContent] = useState('');
  const [modoConteudo, setModoConteudo] = useState<'expandido' | 'rigoroso'>('expandido');
  const [indexShowSubtopics, setIndexShowSubtopics] = useState(false);
  const [imagemCapaUrl, setImagemCapaUrl] = useState(
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="210" height="297" viewBox="0 0 210 297"%3E%3Cdefs%3E%3ClinearGradient id="g" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%231a1a2e;stop-opacity:1" /%3E%3Cstop offset="30%25" style="stop-color:%2316213e;stop-opacity:1" /%3E%3Cstop offset="70%25" style="stop-color:%230a2342;stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:%230f3460;stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="210" height="297" fill="url(%23g)" /%3E%3C/svg%3E'
  );

  // Etapas
  const [etapaAtual, setEtapaAtual] = useState<0 | 1 | 2 | 3>(0);

  // Biblioteca e modais
  const [livrosSalvos, setLivrosSalvos] = useState<{ id: string; titulo: string; data: string; html: string; prompt: string }[]>([]);
  const [modalBiblioteca, setModalBiblioteca] = useState(false);
  const [showModalPagina, setShowModalPagina] = useState(false);
  const [paginaTitulo, setPaginaTitulo] = useState('');
  const [paginaImagem, setPaginaImagem] = useState('');
  const [paginaPosicaoImagem, setPaginaPosicaoImagem] = useState<'esquerda' | 'centro' | 'topo'>('centro');
  const [paginaLocal, setPaginaLocal] = useState<'depois-capa' | 'depois-conclusao'>('depois-capa');

  // Refs para uploads
  const imageInputRef = useRef<HTMLInputElement>(null);
  const extraImageInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
async function gerarEbookPDF(textoBruto: string) {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const pageBottom = pageHeight - margin;
    
    let yPos = margin;
    doc.setFont("helvetica", "normal");
    const fontSize = 12;
    const lineHeight = fontSize * 0.352778 * 1.5;
    
    const lines = textoBruto.split('\n');

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim(); // <--- É esta linha que define a variável 'line'
      if (line === '') {
          yPos += lineHeight;
          if (yPos > pageBottom) { doc.addPage(); yPos = margin; }
          continue;
      }

      if (line.toUpperCase().includes('[CAP]')) {
        let tituloCapitulo = line.replace(/\[\/?CAP\]/gi, '').replace(/\*\*/g, '').trim();
        if (yPos > margin) { doc.addPage(); yPos = margin; }
        doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(37, 99, 235);
        const titleLines = doc.splitTextToSize(tituloCapitulo, pageWidth - margin * 2);
        doc.text(titleLines, pageWidth / 2, yPos, { align: 'center' });
        yPos += (titleLines.length * lineHeight) + 15;
        continue;
      }

      if (line.includes('[IMG]')) {
        const imgH = 60; 
        if (yPos + imgH > pageBottom) { doc.addPage(); yPos = margin; }
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, yPos, pageWidth - (margin * 2), imgH, 'F');
        doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(150, 150, 150);
        doc.text("Imagem do Capítulo (Banner)", pageWidth / 2, yPos + (imgH / 2), { align: 'center' });
        yPos += imgH + 15;
        continue;
      }

      let isBold = false;
      if (line.startsWith('**') && line.endsWith('**')) {
          isBold = true;
          line = line.replace(/\*\*/g, '');
          doc.setFont("helvetica", "bold").setFontSize(14).setTextColor(37, 99, 235);
      } else {
          doc.setFont("helvetica", "normal").setFontSize(fontSize).setTextColor(0, 0, 0);
      }

      const textLines = doc.splitTextToSize(line, pageWidth - margin * 2);
      for (let j = 0; j < textLines.length; j++) {
        if (yPos + lineHeight > pageBottom) { doc.addPage(); yPos = margin; }
        if (!isBold && j < textLines.length - 1) {
             doc.text(textLines[j], margin, yPos, { align: 'justify', maxWidth: pageWidth - margin * 2 });
        } else {
             doc.text(textLines[j], margin, yPos);
        }
        yPos += lineHeight;
      }
      yPos += 3;
    }

    const pdfBlobUrl = String(doc.output('bloburl'));
    const iframe = previewFrameRef.current;
    if (iframe) {
      iframe.removeAttribute('srcdoc'); 
      iframe.src = pdfBlobUrl; 
    }
  }
  // ============================================================
  // FUNÇÕES AUXILIARES
  // ============================================================

  function getPaletaObj() {
    // Modo Personalizado: Títulos (pri), subtítulos (sec) e bordas acompanham a cor exata do texto escolhido.
    if (paletaCores === 'manual') {
      return { bg: corManualBg, text: corManualText, pri: corManualText, sec: corManualText, borda: corManualText };
    }
    
    switch (paletaCores) {
      case 'branco-dourado': 
        return { bg: '#ffffff', text: '#333333', pri: '#b8860b', sec: '#d4af37', borda: '#b8860b' };
      case 'branco-verde': 
        return { bg: '#ffffff', text: '#333333', pri: '#059669', sec: '#10b981', borda: '#059669' };
      case 'branco-preto': 
      default: 
        return { bg: '#ffffff', text: '#111827', pri: '#111827', sec: '#374151', borda: '#111827' };
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
    clean = clean
      .replace(/cursor:\s*pointer;?/gi, '')
      .replace(/cursor:\s*text;?/gi, '')
      .replace(/outline:\s*3px dashed rgb\(79, 70, 229\);?/gi, '')
      .replace(/outline:\s*1px solid rgb\(203, 213, 225\);?/gi, '')
      .replace(/outline-offset:\s*-3px;?/gi, '')
      .replace(/data-old-outline="[^"]*"/gi, '')
      .replace(/\s*style="\s*"/gi, '');
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

    // Limpa estilos invasivos
    clean = clean.replace(/<p\s+[^>]*>/gi, '<p>');

    return clean.trim();
  }

  function getEstilosFormato() {
    return { width: '210mm', height: '297mm', padding: '22mm 20mm 25mm 20mm' };
  }

  function moldarApresentacaoHtml(rawHtml: string) {
    let clean = purificarHTML(rawHtml);
    // Remove o estilo antigo para forçar a atualização em tempo real (Bordas)
    clean = clean.replace(/<style id="ebook-dynamic-styles">[\s\S]*?<\/style>/gi, '');
    
    const conf = getEstilosFormato();
    const paleta = getPaletaObj();

    // A Mágica da cor inteligente: Usa a cor do texto para criar um fundo com 8% de transparência
    let capBoxBackground = 'color-mix(in srgb, var(--color-text) 8%, transparent)';
    let capBoxBorder = 'none';
    let capBoxTextColor = 'var(--color-primary)';

    const ebookStyles = `<style id="ebook-dynamic-styles">
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
${indexShowSubtopics ? '' : '.toc-subtopic { display: none !important; }'}

#ebook-container * {
  max-width: 100% !important;
  box-sizing: border-box !important;
  overflow-wrap: break-word !important;
  word-wrap: break-word !important;
  word-break: break-word !important;
}

/* ========== PASSO 2: ALTURA DA IMAGEM REDUZIDA E TÍTULO MENOR ========== */
img.chapter-banner-img {
  width: 100% !important;
  height: 200px !important;
  min-height: 200px !important;
  max-height: 200px !important;
  object-fit: cover !important;
  border-radius: 6px !important;
  margin: 10px 0 !important;
  display: block !important;
  flex-shrink: 0 !important;
}

h2.chapter-title-inline {
  margin-top: 25px !important; 
  margin-bottom: 15px !important;
  font-family: var(--font-heading) !important;
  font-size: 1.8rem !important;
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
  overflow: hidden !important; 
  page-break-after: always;
  break-after: page;
  page-break-inside: avoid;
  break-inside: avoid;
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
  counter-increment: ebook-page;
}

.chapter-text-page { padding-top: 15mm !important; }

.legal-page { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 40mm 25mm !important; }
.legal-page h2 { font-size: 2rem; margin-bottom: 2rem; }
.legal-page p { font-size: 1rem; line-height: 1.8; margin-bottom: 1.2rem; text-align: justify; }

.page-container::after, .page-cover-img::after, .page-cover-pura::after, .page-cover-text::after,
.cap-img-overlay::after, .cap-box-rounded::after, .cap-img-pura::after {
  content: '';
  position: absolute;
  top: 6mm; left: 6mm; right: 6mm; bottom: 6mm;
  pointer-events: none; z-index: 50;
  border: ${tipoBorda === 'single' ? '1px solid var(--color-border)' : tipoBorda === 'medium' ? '2px solid var(--color-border)' : tipoBorda === 'double-thin' ? '3px double var(--color-border)' : 'none'};
}
.page-cover-img::after, .page-cover-pura::after, .cap-img-overlay::after, .cap-box-rounded::after, .cap-img-pura::after { display: none !important; }
.page-cover-img::after, .page-cover-pura::after, .cap-img-overlay::after, .cap-box-rounded::after, .cap-img-pura::after { display: none !important; }

/* BLINDAGEM MÁXIMA: Garante que a capa e a primeira página NUNCA terão rodapé ou cabeçalho */
#ebook-container > .page-container:first-child .page-header,
#ebook-container > .page-container:first-child .page-footer,
.page-cover-img .page-header, .page-cover-img .page-footer,
.page-cover-pura .page-header, .page-cover-pura .page-footer,
.cap-box-rounded .page-header, .cap-box-rounded .page-footer {
  display: none !important;
  opacity: 0 !important;
  visibility: hidden !important;
}

.page-extra { padding: 32mm 20mm 25mm 20mm; }
.page-extra { padding: 32mm 20mm 25mm 20mm; }
.page-extra img { max-width: 100%; height: auto; margin: 1rem auto; display: block; border-radius: 8px; }

h1.chapter-title-exclusive { font-size: 2.8rem; margin-top: 15px; z-index: 10; position: relative; text-align: center; width: 100%; }
.cap-img-overlay h1.chapter-title-exclusive { color: #ffffff; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); }

.cap-img-overlay { position: relative !important; background-size: cover !important; background-position: center !important; display: flex !important; align-items: center !important; justify-content: center !important; padding: 40px !important; }
.cap-img-overlay .cap-overlay-box, .cap-box-rounded { background-color: rgba(255, 255, 255, 0.88) !important; backdrop-filter: blur(6px); padding: 40px 30px !important; border-radius: 12px !important; max-width: 85% !important; width: 100% !important; text-align: center !important; margin: auto !important; }
.cap-img-overlay .chapter-title-inline { margin: 0 !important; color: var(--color-primary) !important; font-size: 2.2rem !important; line-height: 1.3 !important; text-align: center !important; }
.cap-img-overlay { display: flex; flex-direction: column; justify-content: ${alinhamentoCapitulo}; align-items: center; text-align: center; color: #ffffff; }

.cap-box-rounded { display: flex; flex-direction: column; justify-content: ${alinhamentoCapitulo}; align-items: center; }
.cap-box-inner { background: ${capBoxBackground}; padding: 35px 25px; border-radius: 20px; text-align: center; width: 85%; border: ${capBoxBorder}; z-index: 10; position: relative; color: ${capBoxTextColor}; }
.cap-box-inner h1.chapter-title-exclusive { margin:0; font-size: 2.2rem; color: ${capBoxTextColor}; text-shadow: none; }
.cap-img-pura { background-size: cover !important; background-position: center !important; background-repeat: no-repeat !important; display: block; }

.page-cover-img { display: flex; flex-direction: column; justify-content: ${alinhamentoCapitulo}; align-items: center; text-align: center; background: url('${imagemCapaUrl}') center/cover no-repeat !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; color: #ffffff; }
.page-cover-img h1 { color: #fff; font-size: 3.5rem; margin-bottom: 1rem; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); }
.page-cover-pura { background: url('${imagemCapaUrl}') center/cover no-repeat !important; }
.page-cover-text { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; color: var(--color-primary); }
.page-cover-text h1 { font-size: 3.5rem; margin-bottom: 1.5rem; }

.chapter-title-inline { text-align: center; font-size: 2.1rem; margin-top: 0.5rem; margin-bottom: 1.2rem; color: var(--color-primary); font-weight: 800; line-height: 1.15; }
h3.subtopic-title { font-weight: 800; font-size: 1.4rem; margin-top: 1.8rem; margin-bottom: 1em !important; color: var(--color-primary); line-height: 1.2; text-align: left; }

.page-header { position: absolute; top: 12mm; left: 18mm; right: 18mm; display: flex; justify-content: space-between; align-items: flex-end; font-size: 8pt; color: var(--color-primary); opacity: 0.8; border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 5px; font-weight: 700; text-transform: uppercase; z-index: 20; letter-spacing: 0.5px; }
.page-header span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 48%; }

.page-footer { position: absolute; bottom: 10mm; left: 18mm; right: 18mm; font-size: 9pt; color: var(--color-primary); font-weight: 600; z-index: 20; opacity: 0.8; ${estiloRodape.includes('centralizado') ? 'display: flex; justify-content: center; align-items: center;' : 'display: flex; justify-content: space-between; align-items: center;'} ${estiloRodape.includes('linha-superior') ? 'border-top: 1px solid var(--color-primary); padding-top: 8px;' : ''} }
.page-number { margin-left: auto !important; }
.page-number::after { content: counter(ebook-page); }
.page-number.circulo { display: inline-flex; justify-content: center; align-items: center; width: 26px; height: 26px; border-radius: 50%; margin-left: auto !important; background-color: var(--color-primary); color: #ffffff !important; font-size: 10px; font-weight: 800; margin-bottom: -3px; }
.page-number.circulo::after { color: #ffffff !important; }

h1, h2, h3, h4 { font-family: var(--font-heading); color: var(--color-primary); }
h1 { font-weight: 800; font-size: 2.2rem; margin-top: 0; margin-bottom: 1em; line-height: 1.2; text-align: center; }
h2:not(.chapter-title-inline) { font-weight: 700; font-size: 1.8rem; margin-top: 1.5rem; margin-bottom: 1.5rem; }

p { font-size: ${tamanhoFonteBase} !important; line-height: var(--line-spacing) !important; margin-top: 0 !important; margin-bottom: var(--p-spacing) !important; text-align: justify !important; text-indent: var(--text-indent) !important; hyphens: auto; -webkit-hyphens: auto; max-width: 100% !important; box-sizing: border-box !important; word-wrap: break-word !important; overflow-wrap: break-word !important; word-break: break-word !important; }

/* CORES INTELIGENTES: Lê a cor do texto para formar os fundos e as bordas para a cor primária */
blockquote {
  page-break-inside: avoid; break-inside: avoid;
  font-style: italic; color: var(--color-text);
  border-left: 4px solid var(--color-primary);
  background: color-mix(in srgb, var(--color-text) 5%, transparent);
  padding: 12px 18px; margin: 1rem 0; font-size: ${tamanhoFonteBase}; border-radius: 0 8px 8px 0; max-width: 100%;
}
.highlight-box {
  background: color-mix(in srgb, var(--color-text) 8%, transparent);
  border-left: 4px solid var(--color-primary);
  padding: 12px 18px; border-radius: 8px; margin: 1rem 0; font-weight: 500; font-size: ${tamanhoFonteBase}; display: flex; align-items: center; gap: 12px; max-width: 100%;
}
.highlight-box i { font-size: 1.8rem; color: var(--color-primary); flex-shrink: 0; }

img { max-width: 100%; height: auto; max-height: 35vh; border-radius: 0.5rem; margin: 1rem auto; display: block; object-fit: cover; page-break-inside: avoid; break-inside: avoid; }
ul, ol { margin-top: 0; margin-bottom: 1em; padding-left: 2rem; font-size: ${tamanhoFonteBase}; line-height: var(--line-spacing); }
li { margin-bottom: 0.4rem; page-break-inside: avoid; }

.toc-container { display: flex; flex-direction: column; width: 100%; margin: 1rem 0; z-index: 60; position: relative; }
.toc-item { display: flex; align-items: baseline; justify-content: space-between; width: 100%; text-decoration: none; color: var(--color-text); font-family: var(--font-body) !important; font-size: ${tamanhoFonteBase} !important; line-height: var(--line-spacing) !important; padding: 6px 0; cursor: pointer; margin-bottom: 0.2rem; }
.toc-item:hover { color: var(--color-secondary); }
.toc-dots { flex-grow: 1; border-bottom: 2px dotted var(--color-primary); margin: 0 8px; opacity: 0.3; }
.toc-page-num { font-weight: bold; color: var(--color-primary); }

/* AJUSTE DO SUBTÓPICO NO ÍNDICE (Menor e mais juntinho) */
.toc-subtopic {
  font-size: 0.85em !important;
  line-height: 1.1 !important;
  padding-left: 20px !important;
  opacity: 0.75;
  margin-bottom: 2px !important;
}

/* Permite que o Índice flua naturalmente para as próximas páginas sem pular em bloco */
#toc, 
.toc-container {
  break-inside: auto !important;
  page-break-inside: auto !important;
  display: block !important; 
}

/* Garante que uma linha (um capítulo) não seja cortada no meio da palavra ao trocar de página */
#toc a, 
.toc-subtopic {
  break-inside: avoid !important;
  page-break-inside: avoid !important;
}

.page-container.author-page { display: block; }
.author-section { width: 100%; margin-top: 1.5rem; display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; page-break-inside: avoid; break-inside: avoid; }
.author-section.layout-topo { flex-direction: column; text-align: center; }
.author-section.layout-esquerda { flex-direction: row; text-align: justify; align-items: flex-start; }
.author-photo { flex-shrink: 0; object-fit: cover; box-shadow: 0 8px 20px rgba(0,0,0,0.12); border: 3px solid rgba(255,255,255,0.8); }
.author-photo.circulo { border-radius: 50%; width: 150px; height: 150px; }
.author-photo.retangulo { border-radius: 20px; width: 130px; height: 180px; }
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
      if (!clean.includes('@media print')) {
        clean = clean.replace('</head>', ebookStyles + '\n</head>');
      }
      return clean;
    }

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta id="meta-header-text" content="${textoCabecalho}">
<meta id="meta-book-title" content="${livroTitulo}"> <!-- NOVA LINHA AQUI -->
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
  }
  // ============================================================
  // FUNÇÕES DE ATUALIZAÇÃO DA CAPA
  // ============================================================
  function atualizarCapaNoHtml(html: string, novoTitulo: string, novoAutor: string): string {
    if (!html) return html;
    const regexCapa = /(<div class="page-cover-[a-z-]+"[^>]*>)([\s\S]*?)(<\/div>)/i;
    const match = html.match(regexCapa);
    if (!match || match.index === undefined) return html;

    let capaContent = match[2];
    capaContent = capaContent.replace(/<h1[^>]*>.*?<\/h1>/i, `<h1>${novoTitulo || 'Meu E-book'}</h1>`);
    if (!capaContent.includes('<p>')) {
      capaContent = capaContent.replace(/<\/h1>/i, `</h1><p>Por ${novoAutor || 'Autor'}</p>`);
    } else {
      capaContent = capaContent.replace(/<p[^>]*>.*?<\/p>/i, `<p>Por ${novoAutor || 'Autor'}</p>`);
    }
    return html.substring(0, match.index) + match[1] + capaContent + match[3] + html.substring(match.index + match[0].length);
  }

  // ============================================================
  // FUNÇÕES DE VALIDAÇÃO DE PARÁGRAFOS (PÓS-PROCESSAMENTO)
  // ============================================================
  function ajustarParagrafos(html: string): string {
    // Cria um parser simples para ajustar o comprimento dos parágrafos
    // sem quebrar a estrutura HTML.
    // Estratégia: se um parágrafo tiver menos de 300 caracteres, não faz nada;
    // se tiver mais de 600, tenta quebrar em dois parágrafos.
    // Isso garante uma consistência visual sem depender da IA.
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const paragrafos = tempDiv.querySelectorAll('p');
    paragrafos.forEach(p => {
      let texto = p.textContent || '';
      // Remove espaços extras
      texto = texto.replace(/\s+/g, ' ').trim();
      if (texto.length > 600) {
        // Tenta quebrar na última frase antes de 450 caracteres
        const mid = Math.min(450, texto.length);
        let breakPos = texto.lastIndexOf('. ', mid);
        if (breakPos === -1) breakPos = texto.lastIndexOf('? ', mid);
        if (breakPos === -1) breakPos = texto.lastIndexOf('! ', mid);
        if (breakPos !== -1) {
          const p1 = texto.substring(0, breakPos + 1);
          const p2 = texto.substring(breakPos + 2);
          // Substitui o conteúdo do parágrafo atual e insere um novo após ele
          p.textContent = p1;
          const novoP = document.createElement('p');
          novoP.textContent = p2;
          p.parentNode?.insertBefore(novoP, p.nextSibling);
        }
      }
    });
    return tempDiv.innerHTML;
  }

  // ============================================================
  // FUNÇÕES DE INJEÇÃO / APLICAÇÃO DE HTML
  // ============================================================
  function injetarHtmlNoFinal(htmlBase: string, htmlNovo: string) {
    if (!htmlBase.includes('id="ebook-container"')) return htmlBase + '\n' + htmlNovo;

    let cleanNovo = htmlNovo;
    const bodyMatch = cleanNovo.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) cleanNovo = bodyMatch[1];
    cleanNovo = cleanNovo.replace(/<!DOCTYPE[^>]*>/gi, '').replace(/<\/?html[^>]*>/gi, '').trim();
    const containerMatch = cleanNovo.match(/<div id="ebook-container">([\s\S]*?)<\/div>\s*$/i);
    if (containerMatch) cleanNovo = containerMatch[1];

    let lastBodyIndex = htmlBase.lastIndexOf('</body>');
    if (lastBodyIndex === -1) lastBodyIndex = htmlBase.lastIndexOf('</BODY>');

    if (lastBodyIndex !== -1) {
      let lastDivIndex = htmlBase.lastIndexOf('</div>', lastBodyIndex);
      if (lastDivIndex === -1) lastDivIndex = htmlBase.lastIndexOf('</DIV>', lastBodyIndex);
      if (lastDivIndex !== -1) {
        return htmlBase.substring(0, lastDivIndex) + '\n' + cleanNovo + '\n' + htmlBase.substring(lastDivIndex);
      }
    }
    return htmlBase.replace(/<\/div>\s*<\/body>\s*<\/html>/gi, '\n' + cleanNovo + '\n    </div>\n</body>\n</html>');
  }

  function aplicarHtmlNovo(htmlCru: string, isInjetar: boolean, recarregar: boolean = true) {
    let novoConteudo = purificarHTML(htmlCru);
    novoConteudo = ajustarParagrafos(novoConteudo); // <-- pós-processamento

    let htmlFinal = '';
    if (isInjetar) {
      htmlFinal = injetarHtmlNoFinal(htmlAtual || '', novoConteudo);
    } else {
      htmlFinal = moldarApresentacaoHtml(novoConteudo);
    }

    setHistoricoCodigo((prev) => [...prev, htmlAtual]);
    setHtmlAtual(htmlFinal);
    localStorage.setItem('ebook_draft_html', htmlFinal);

    if (recarregar && previewFrameRef.current) {
      setRecarregarIframe(true);
      const script = getScriptPreview(indexShowSubtopics, ativarBgSegundaPagina, bgSegundaPaginaUrl, bgSegundaPaginaOpacidade);
      previewFrameRef.current.srcdoc = htmlFinal + script;
    } else {
      setRecarregarIframe(false);
    }
  }

  // ============================================================
  // FUNÇÕES DE GERAÇÃO DE PÁGINAS (AVISO, AUTOR, EXTRA)
  // ============================================================
  function gerarPaginaAviso() {
    return `
    <div class="page-container legal-page">
  <div class="page-header"><span></span><span>AVISOS LEGAIS</span></div>
  <div class="content-area" style="display: flex; flex-direction: column; justify-content: center; height: 100%; text-align: justify; font-size: 11px; line-height: 1.5; padding: 0 10px;">
    
    <h2 class="chapter-title-inline" style="text-align: center; margin-bottom: 20px;">Avisos Legais & Direitos Autorais</h2>
    
    <p><strong>© Todos os direitos reservados.</strong></p>
    
    <p style="margin-top: 10px;">Nenhuma parte desta publicação pode ser reproduzida, distribuída ou transmitida sob qualquer forma ou por qualquer meio, incluindo fotocópia, gravação ou outros métodos eletrônicos ou mecânicos, sem a permissão prévia por escrito, exceto no caso de breves citações encartadas em resenhas críticas e outros usos não comerciais permitidos pela lei de direitos autorais.</p>
    
    <p style="margin-top: 10px;"><strong>Isenção de Responsabilidade (Disclaimer):</strong></p>
    
    <p>As informações contidas neste e-book são fornecidas estritamente para fins educacionais, informativos e de entretenimento. Não são oferecidas quaisquer garantias quanto à integridade, confiabilidade e exatidão dessas informações.</p>
    
    <p style="margin-top: 10px;">Qualquer ação que você tomar com base nas informações deste livro é de sua inteira responsabilidade. Não haverá responsabilização por quaisquer perdas, danos ou prejuízos, diretos ou indiretos, decorrentes do uso ou da aplicação do conteúdo aqui exposto. Se necessitar de aconselhamento especializado, consulte um profissional qualificado da área.</p>
    
  </div>
  <div class="page-footer"><span></span><span class="page-number"></span></div>
</div>`;
  }

  function obterBlocoAutorHtml() {
    let numSpan = estiloRodape.includes('circulo') ? '<span class="page-number circulo"></span>' : '<span class="page-number"></span>';
    let regraRodape = '';
    if (estiloRodape.includes('simples') || estiloRodape.includes('linha-superior')) {
      regraRodape = `<span>${livroAutores}</span>${numSpan}`;
    } else {
      regraRodape = `${numSpan}`;
    }

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
        if (open === 0) return closeTag + 6;
        open--;
        i = closeTag + 6;
      }
    }
    return -1;
  }

  function inserirPaginaExtra() {
    if (!paginaTitulo.trim() && !paginaImagem.trim()) {
      (window as any).showNotification('Preencha pelo menos o título ou uma imagem.', 'error');
      return;
    }
    if (!htmlAtual || htmlAtual.trim() === '') {
      (window as any).showNotification('Nenhum E-book gerado para inserir página.', 'error');
      return;
    }

    let classeImagem = '';
    if (paginaPosicaoImagem === 'esquerda') classeImagem = 'img-left';
    else if (paginaPosicaoImagem === 'centro') classeImagem = 'img-center';
    else if (paginaPosicaoImagem === 'topo') classeImagem = 'img-top';

    const tituloParaHeader = paginaTitulo.trim() || 'Página Extra';
    const tituloHtml = paginaTitulo.trim() ? `<h2 id="extra-${Date.now()}" class="chapter-title-inline">${paginaTitulo}</h2>` : '';

    let imagemHtml = '';
    if (paginaImagem.trim()) {
      imagemHtml = `<img src="${paginaImagem}" class="${classeImagem || 'img-horizontal'}" alt="Imagem da página" />`;
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
        if (endDiv !== -1) posicao = endDiv;
      }
    } else if (paginaLocal === 'depois-conclusao') {
      const matchConclusao = htmlAtualStr.match(/<div class="page-container[^>]*>[\s\S]*?id="conclusao"/i);
      if (matchConclusao && matchConclusao.index !== undefined) {
        const startDiv = htmlAtualStr.lastIndexOf('<div', matchConclusao.index);
        if (startDiv !== -1) {
          const endDiv = findClosingDiv(htmlAtualStr, startDiv + 4);
          if (endDiv !== -1) posicao = endDiv;
        }
      }
    }

    if (posicao === -1) {
      const containerEnd = htmlAtualStr.lastIndexOf('</div>');
      if (containerEnd !== -1) posicao = containerEnd;
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
    (window as any).showNotification('Página extra inserida com sucesso!', 'success');
  }

  // ============================================================
  // FUNÇÕES DE EDIÇÃO E INSPETOR
  // ============================================================
  function toggleInspetor() {
    const newMode = !modoInspetor;
    setModoInspetor(newMode);
    setElementoSelecionado(null);
    if (previewFrameRef.current && previewFrameRef.current.contentWindow) {
      previewFrameRef.current.contentWindow.postMessage({ type: 'TOGGLE_EDIT_MODE', value: newMode }, '*');
    }
  }

  function toggleBackground() {
    if (previewFrameRef.current && previewFrameRef.current.contentWindow) {
      previewFrameRef.current.contentWindow.postMessage({ type: 'TOGGLE_BG' }, '*');
    }
  }

  function atualizarElemento(field: string, value: string | number | boolean, forceTextUpdate = false) {
    if (!elementoSelecionado) return;
    if (previewFrameRef.current && previewFrameRef.current.contentWindow) {
      previewFrameRef.current.contentWindow.postMessage({
        type: 'UPDATE_ELEMENT',
        id: elementoSelecionado.id,
        [field]: value,
        forceTextUpdate,
      }, '*');
    }
    setElementoSelecionado((prev: any) => ({ ...prev, [field]: value }));
  }

  function transformarEmNode(novoTag: string, classExtra: string = '') {
    if (!elementoSelecionado) return;
    const newHtml = `<${novoTag} id="${elementoSelecionado.id}" class="${classExtra}">${elementoSelecionado.text}</${novoTag}>`;
    if (previewFrameRef.current && previewFrameRef.current.contentWindow) {
      previewFrameRef.current.contentWindow.postMessage({ type: 'REPLACE_ELEMENT_HTML', id: elementoSelecionado.id, newHtml }, '*');
    }
    setElementoSelecionado(null);
    (window as any).showNotification('Elemento transformado!', 'success');
  }

  function desfazerCodigo() {
    setHistoricoCodigo((prev) => {
      // Se não tem histórico ou só tem 1, volta o livro para o zero absoluto
      if (prev.length <= 1) {
        setHtmlAtual('');
        localStorage.removeItem('ebook_draft_html');
        setRecarregarIframe(p => !p); // OBRIGA o Iframe a reiniciar do zero
        return [];
      }

      const novoHistorico = [...prev];
      novoHistorico.pop(); // Joga fora o estado atual (bagunçado)
      const estadoAnterior = novoHistorico[novoHistorico.length - 1]; // Pega o estado anterior real

      if (estadoAnterior !== undefined) {
        setHtmlAtual(estadoAnterior);
        localStorage.setItem('ebook_draft_html', estadoAnterior);
        setRecarregarIframe(p => !p); // OBRIGA o Iframe a recarregar do zero com o texto antigo limpo
      }
      
      return novoHistorico;
    });
  }

  // ============================================================
  // BUSCA DE IMAGEM UNSPLASH
  // ============================================================
  async function buscarImagemUnsplash() {
    if (!elementoSelecionado) {
      (window as any).showNotification('Selecione um elemento (imagem ou fundo) primeiro.', 'error');
      return;
    }
    (window as any).showNotification('Lendo contexto para buscar imagem perfeita na API do Unsplash...', 'info');

    let keyword = 'abstract';
    try {
      const instrucao = 'Você é um fotógrafo. Retorne APENAS UMA palavra-chave em INGLÊS que represente o texto, focando em pessoas reais e fotografia realista. Nenhuma outra palavra. **PROIBIDO usar palavras relacionadas a animais (cat, dog, pet, animal), tecnologia, sci-fi, desenhos, ilustrações ou gráficos animados. USE APENAS FOTOS REAIS**.';
      const data = await chamarMotorIA(instrucao, [{ text: elementoSelecionado.text || elementoSelecionado.outerHTML }], true);
      if (data && data.html) {
        keyword = data.html.replace(/<[^>]*>?/gm, '').trim().replace(/[^a-zA-Z0-9]/g, '');
        if (!keyword) keyword = 'abstract';
      }
    } catch (e) {
      console.error('Falha ao ler palavras-chave via IA, usando padrão.');
    }

    try {
      const accessKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY || '';
      let url = '';

      if (accessKey) {
        const unsplashRes = await fetch(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(keyword)}&orientation=landscape`, {
          headers: {
            Authorization: `Client-ID ${accessKey}`
          }
        });

        if (!unsplashRes.ok) throw new Error('Erro ao autenticar na API do Unsplash. Verifique sua chave.');

        const unsplashData = await unsplashRes.json();
        url = unsplashData.urls.regular;
      } else {
        const termoDinamico = encodeURIComponent((elementoSelecionado?.innerText || "chapter portrait") + " real human photography");
        url = `https://images.unsplash.com/featured/?${termoDinamico}`;
        (window as any).showNotification('Imagem dinâmica aplicada por tema.', 'warning');
      }

      const isImg = elementoSelecionado.tagName === 'img';
      const field = isImg ? 'src' : 'bgImage';

      if (previewFrameRef.current && previewFrameRef.current.contentWindow) {
        previewFrameRef.current.contentWindow.postMessage(
          {
            type: 'UPDATE_ELEMENT',
            id: elementoSelecionado.id,
            [field]: url,
            forceTextUpdate: false,
          },
          '*'
        );
      }

      setElementoSelecionado((prev: any) => ({ ...prev, [field]: url }));
      (window as any).showNotification('Fotografia aplicada via Unsplash com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      (window as any).showNotification('Falha ao conectar com a API do Unsplash.', 'error');
    }
  }

  // ============================================================
  // EDIÇÃO LOCAL COM IA
  // ============================================================
  async function aplicarModificacaoLocal() {
    const input = document.getElementById('ai_prompt_local') as HTMLInputElement;
    const comando = input?.value.trim();
    if (!comando) {
      (window as any).showNotification('Digite o que alterar neste elemento.', 'error');
      return;
    }
    if (!elementoSelecionado) return;

    setHistoricoCodigo((prev) => [...prev, htmlAtual]);
    const paleta = getPaletaObj();

    const instrucao = `Você é um Assistente Editorial. O usuário selecionou um trecho específico de HTML de um e-book.
Sua tarefa é modificar APENAS este elemento HTML de acordo com o pedido: "${comando}".

REGRAS MÁXIMAS:
1. PRESERVAÇÃO DE ESTRUTURA: Se o elemento for uma <div class="page-container">, preserve OBRIGATORIAMENTE o cabeçalho (page-header) e o rodapé (page-footer) intactos. Não os apague.
2. Retorne APENAS o código HTML modificado DESSA CAIXA/ELEMENTO específico.
3. Mantenha as classes originais.
4. Use as cores do tema atual:
   - Cor primária: ${paleta.pri}
   - Cor secundária: ${paleta.sec}
   - Cor de texto: ${paleta.text}
   - Cor de fundo: ${paleta.bg}
   - Cor de borda: ${paleta.borda}
Mantenha a consistência visual com o resto do e-book.`;

    const data = await chamarMotorIA(instrucao, [{ text: `HTML DO ELEMENTO SELECIONADO:\n"""\n${elementoSelecionado.outerHTML}\n"""` }], true);

    if (data && data.html) {
      let novoHtml = data.html;
      const markdownMatch = novoHtml.match(/```html([\s\S]*?)```/i);
      if (markdownMatch) novoHtml = markdownMatch[1];
      novoHtml = novoHtml.replace(/```html/gi, '').replace(/```/gi, '').trim();

      if (previewFrameRef.current && previewFrameRef.current.contentWindow) {
        previewFrameRef.current.contentWindow.postMessage({ type: 'REPLACE_ELEMENT_HTML', id: elementoSelecionado.id, newHtml: novoHtml }, '*');
      }

      setElementoSelecionado(null);
      input.value = '';
      (window as any).showNotification('Trecho modificado com sucesso!', 'success');
    }
  }

  // ============================================================
  // FUNÇÕES DE GERENCIAMENTO DE BIBLIOTECA E ARQUIVOS
  // ============================================================
  function salvarNaBiblioteca() {
    if (!livroTitulo || livroTitulo.trim() === '') {
      (window as any).showNotification('Dê um título ao E-book antes de salvar.', 'error');
      return;
    }
    if (!htmlAtual || htmlAtual.trim() === '') {
      (window as any).showNotification('Não há conteúdo para salvar.', 'error');
      return;
    }

    const id = Date.now().toString();
    const novoLivro = { id, titulo: livroTitulo, data: new Date().toLocaleDateString('pt-BR'), html: htmlAtual, prompt: productContent };
    const novaBiblioteca = [...livrosSalvos, novoLivro];
    setLivrosSalvos(novaBiblioteca);
    localStorage.setItem('ebook_saved_books', JSON.stringify(novaBiblioteca));
    (window as any).showNotification('E-book salvo na sua Biblioteca Local!', 'success');
  }

  function carregarDaBiblioteca(livro: any) {
    setLivroTitulo(livro.titulo);
    setProductContent(livro.prompt || '');
    setEtapaAtual(0);
    aplicarHtmlNovo(livro.html, false, true);
    setModalBiblioteca(false);
    (window as any).showNotification(`Livro "${livro.titulo}" carregado.`, 'success');
  }

  function excluirDaBiblioteca(id: string) {
    if (confirm('Tem certeza que deseja excluir este e-book da biblioteca?')) {
      const novaBiblioteca = livrosSalvos.filter((l) => l.id !== id);
      setLivrosSalvos(novaBiblioteca);
      localStorage.setItem('ebook_saved_books', JSON.stringify(novaBiblioteca));
    }
  }

  function baixarArquivo(html: string, titulo: string) {
    // Garante que o arquivo baixado leve consigo todo o motor de estilo e scripts visuais atualizados
    const htmlCompleto = moldarApresentacaoHtml(html);
    const scriptInjetado = getScriptPreview(indexShowSubtopics, ativarBgSegundaPagina, bgSegundaPaginaUrl, bgSegundaPaginaOpacidade);
    
    // Injeta o motor rodando no arquivo final para manter o índice e paginação idênticos ao painel
    const htmlProntoParaImpressao = htmlCompleto.replace('</body>', `<script>${scriptInjetado.replace(/<script>|<\/script>/g, '')}</script>\n</body>`);

    const blob = new Blob([htmlProntoParaImpressao], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${titulo || 'ebook'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    (window as any).showNotification('E-book baixado com formatação perfeita!', 'success');
  }

  function handleUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content) {
        aplicarHtmlNovo(content, false, true);
        (window as any).showNotification('Arquivo importado com sucesso!', 'success');
      }
    };
    reader.readAsText(file);
    if (uploadInputRef.current) uploadInputRef.current.value = '';
  }

  function handleImageUploadBtn(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Img = event.target?.result as string;
      if (elementoSelecionado && elementoSelecionado.tagName === 'img') {
        atualizarElemento('src', base64Img);
        (window as any).showNotification('Imagem substituída com sucesso!', 'success');
      } else if (elementoSelecionado && (elementoSelecionado.bgImage !== undefined || elementoSelecionado.isBgTarget)) {
        atualizarElemento('bgImage', base64Img);
        (window as any).showNotification('Fundo substituído com sucesso!', 'success');
      } else {
        setImagemCapaUrl(base64Img);
        (window as any).showNotification('Capa atualizada com sucesso! (Formato A4 recomendado)', 'success');
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
      (window as any).showNotification('Imagem carregada para página extra!', 'success');
    };
    reader.readAsDataURL(file);
    if (extraImageInputRef.current) extraImageInputRef.current.value = '';
  }

  function iniciarNovoLivro() {
    if (confirm('ATENÇÃO: Tem certeza que deseja iniciar um novo livro? Todo o progresso atual não salvo será perdido.')) {
      localStorage.removeItem('ebook_draft_html');
      localStorage.removeItem('ebook_draft_prompt');
      setHtmlAtual('');
      setLivroTitulo('');
      setProductContent('');
      setEtapaAtual(0);
      if (previewFrameRef.current) {
        previewFrameRef.current.srcdoc = '';
      }
      (window as any).showNotification('Novo documento em branco criado.', 'info');
    }
  }

  // ============================================================
  // FUNÇÃO AUXILIAR: OBTER PRÓXIMO NÚMERO DE CAPÍTULO
  // ============================================================
  function getNextChapterNumber(html: string): number {
    if (!html) return 1;
    const regex = /Capítulo\s*(\d+)/gi;
    let match;
    let max = 0;
    while ((match = regex.exec(html)) !== null) {
      const num = parseInt(match[1], 10);
      if (num > max) max = num;
    }
    return max + 1;
  }

// ============================================================
  // FUNÇÃO DE INSTRUÇÕES BASE (BLINDADA CONTRA RASCUNHOS DA IA)
  // ============================================================
  function obterInstrucoesBase(opts?: { numeroCapitulo?: number, tema?: string }) {
    const numero = opts?.numeroCapitulo || 1;

    const regrasCompletas = `
  DIRETRIZES DE FORMATAÇÃO E SEGURANÇA:
  1. GERE APENAS HTML PURO. PROIBIDO gerar a tag <div class="page-container">, cabeçalhos ou rodapés.
  2. ESTRUTURA RIGOROSA DO CAPÍTULO (Siga EXATAMENTE esta ordem para formar 3 páginas completas e sem espaços vazios):
     - <h2 class="chapter-title-inline">Capítulo ${numero}: [Nome do Capítulo]</h2>
     - <img class="chapter-banner-img" src="https://loremflickr.com/1200/800/[PALAVRA_EM_INGLES_AQUI]" alt="Imagem do capítulo">
     - <h3 class="subtopic-title">[Subtítulo Inicial]</h3>
     - <p>[Parágrafo 1 - MÁXIMO 65 PALAVRAS (Curto, para caber na página da imagem)]</p>
     - <p>[Parágrafo 2 - MÁXIMO 65 PALAVRAS (Curto, para caber na página da imagem)]</p>
     - <h3 class="subtopic-title">[Subtítulo do Meio]</h3>
     - <p>[Parágrafo 3 - Aprox 80 PALAVRAS]</p>
     - <p>[Parágrafo 4 - Aprox 80 PALAVRAS]</p>
     - <p>[Parágrafo 5 - Aprox 80 PALAVRAS]</p>
     - <div class="highlight-box"><i class="fas fa-lightbulb"></i> [Insira aqui um TEXTO RELEVANTE ou DICA para fechar a segunda página]</div>
     - <h3 class="subtopic-title">[Subtítulo Final]</h3>
     - <p>[Parágrafo 6 - Aprox 85 PALAVRAS]</p>
     - <p>[Parágrafo 7 - Aprox 85 PALAVRAS]</p>
     - <p>[Parágrafo 8 - Aprox 85 PALAVRAS]</p>
     - <blockquote>[Insira aqui uma REFLEXÃO PROFUNDA ou CONSELHO FINAL para fechar a terceira página]</blockquote>
  3. REGRA DE SEGURANÇA E TOM DE VOZ (LEIA COM ATENÇÃO): 
     - PROIBIÇÃO ABSOLUTA: Você está ESTRITAMENTE PROIBIDO de mostrar o seu processo de pensamento, rascunhos, contagem de palavras (como "Word count check" ou "Goal: 85 words").
     - DEVOLVA APENAS AS TAGS HTML E O CONTEÚDO FINAL. NÃO escreva NENHUM texto fora das tags HTML.
  4. IMAGENS EXCLUSIVAS: Substitua [PALAVRA_EM_INGLES_AQUI] por UMA palavra em inglês relacionada ao tema para puxar a foto.
  `;

    return { regrasCompletas, numero };
  }
  // ============================================================
  // FUNÇÕES DE GERAÇÃO DE CONTEÚDO (ETAPAS)
  // ============================================================

  // ---- ETAPA 1: Capa, Aviso, Índice, Introdução ----
  async function iniciarEbookEtapas() {
    const content = productContent.trim();
    if (!content) {
      (window as any).showNotification('Insira o texto base.', 'error');
      return;
    }

    const { regrasCompletas } = obterInstrucoesBase({ numeroCapitulo: 1, tema: livroTitulo || 'geral' });
    const regraCapaHtml = `<div class="page-container page-cover-img"><h1>${livroTitulo || 'Meu E-book'}</h1><p>Por ${livroAutores || 'Autor'}</p></div>`;
    const paginaAviso = gerarPaginaAviso();

    const instrucao = `Você vai INICIAR um e-book gerando APENAS a Capa, Aviso/Direitos, Índice e Introdução.
    ${regrasCompletas}

    ESTRUTURA OBRIGATÓRIA DA RESPOSTA (PASSO 1):
    ${regraCapaHtml}
    ${paginaAviso}
    <div class="page-container">
        <div class="page-header"><span>${livroTitulo}</span><span>ÍNDICE</span></div>
        <h2 class="chapter-title-inline">Índice</h2>
        <div class="toc-container"></div>
        <div class="page-footer"><span>${livroAutores}</span><span class="page-number"></span></div>
    </div>
    <div class="page-container">
        <div class="page-header"><span>${livroTitulo}</span><span>INTRODUÇÃO</span></div>
        <h2 id="intro" class="chapter-title-inline">Introdução</h2>
        <h3 class="subtopic-title">O Início da Jornada</h3>
        <p>[Parágrafo 1 - aprox 60 palavras]</p>
        <p>[Parágrafo 2 - aprox 60 palavras]</p>
        <p>[Parágrafo 3 - aprox 60 palavras]</p>
        <p>[Parágrafo 4 - aprox 50 palavras]</p>
        <div class="page-footer"><span>${livroAutores}</span><span class="page-number"></span></div>
    </div>

    REGRAS CRÍTICAS:
    1. A INTRODUÇÃO DEVE TER EXATAMENTE 4 PARÁGRAFOS.
    2. O ÍNDICE DEVE SER ENTREGUE VAZIO: Devolva exatamente <div class="toc-container"></div> sem NENHUM texto.
    3. PARE AQUI! NÃO gere Capítulos!
    `;

    const data = await chamarMotorIA(instrucao, [{ text: `TEXTO BASE PARA CRIAR O ÍNDICE E A INTRODUÇÃO:\n"""\n${content}\n"""` }], false);
    if (data && data.html) {
      aplicarHtmlNovo(data.html, false, true);
      setEtapaAtual(1);
      (window as any).showNotification('Passo 1 Concluído! Capa, Aviso, Índice e Introdução gerados.', 'success');
    } else {
      console.error('Dados retornados pela IA são inválidos:', data);
    }
  }

  // ---- ETAPA 2: Adicionar 3 capítulos (com numeração sequencial e imagens diferentes) ----
  async function continuarEbookEtapas() {
    const content = productContent.trim();
    const currentHtml = htmlAtual;
    if (!currentHtml || !currentHtml.includes('page-container')) {
      (window as any).showNotification('Gere o Passo 1 primeiro!', 'error');
      return;
    }

    const proximoNumero = getNextChapterNumber(currentHtml);
    const temaBase = livroTitulo || 'geral';

    const cap1 = obterInstrucoesBase({ numeroCapitulo: proximoNumero, tema: temaBase });
    const cap2 = obterInstrucoesBase({ numeroCapitulo: proximoNumero + 1, tema: temaBase });
    const cap3 = obterInstrucoesBase({ numeroCapitulo: proximoNumero + 2, tema: temaBase });

    const instrucao = `Você vai CONTINUAR a escrita de um e-book, gerando EXATAMENTE 3 CAPÍTULOS completos.
    Cada capítulo deve seguir o molde de 3 páginas fornecido abaixo.
    Use os números de capítulo: ${proximoNumero}, ${proximoNumero + 1}, ${proximoNumero + 2}.
    ATENÇÃO: Não pule números. Respeite rigorosamente a ordem (imagem primeiro, depois título).

    MOLDE PARA CADA CAPÍTULO:
    ${cap1.regrasCompletas}
    ${cap2.regrasCompletas}
    ${cap3.regrasCompletas}

    A sua resposta deve conter APENAS os blocos HTML dos 3 capítulos acima preenchidos, sem repetir cabeçalhos ou rodapés. Não escreva "Conclusão".`;

    const data = await chamarMotorIA(instrucao, [
      { text: `CÓDIGO HTML ATUAL DO LIVRO:\n"""\n${currentHtml}\n"""` },
      { text: `INSTRUÇÕES/TEXTO DOS PRÓXIMOS CAPÍTULOS:\n"""\n${content || 'Gere os próximos conteúdos seguindo o molde.'}\n"""` },
    ], false);

    if (data && data.html) {
      aplicarHtmlNovo(data.html, true, true);
      setEtapaAtual(2);
      (window as any).showNotification('Passo 2 Concluído! 3 capítulos adicionados.', 'success');
    } else {
      console.error('Dados retornados pela IA são inválidos:', data);
    }
  }

  // ---- ETAPA 3: Finalizar com Conclusão e Autor ----
async function finalizarEbookEtapas() {
  if (!htmlAtual || !htmlAtual.includes('page-container')) {
    (window as any).showNotification('Gere o livro antes de finalizar.', 'error');
    return;
  }

  // Trava de Segurança: Impede de gerar a conclusão duas vezes
  if (htmlAtual.includes('id="conclusao"')) {
      (window as any).showNotification('O e-book já está finalizado! Use os botões normais para adicionar capítulos.', 'error');
      return; 
  }

  const instrucao = `Você vai FINALIZAR a escrita do e-book.
  DIRETRIZES:
    1. PROIBIÇÃO ABSOLUTA: A sua resposta deve conter APENAS tags HTML soltas (H1, H3, P). NÃO crie <div class="page-container">, NÃO crie cabeçalhos e NÃO crie rodapés.
    2. MOLDE DE CONCLUSÃO:
    <h1 id="conclusao" class="chapter-title-exclusive">Conclusão</h1>
    <h3 class="subtopic-title">Considerações Finais</h3>
    <p>[Escreva aqui a conclusão detalhada do e-book em cerca de 3 parágrafos...]</p>
    
    O PROMPT ACABA AQUI. Devolva apenas essas tags HTML soltas e preenchidas. O sistema cuidará de adicionar o Autor nativamente.
    `;

    const data = await chamarMotorIA(instrucao, [{ text: `TEMA DO E-BOOK (Para basear a conclusão):\n"""\n${livroTitulo}\n"""` }], false);
    if (data && data.html) {
      let htmlFinal = data.html + '\n' + obterBlocoAutorHtml();
      aplicarHtmlNovo(htmlFinal, true, true);
      setEtapaAtual(3);
      (window as any).showNotification('Passo 3 Concluído! Conclusão e Autor gerados.', 'success');
    } else {
      console.error('Dados retornados pela IA são inválidos:', data);
    }
  }

  // ============================================================
  // CHAMADA À API
  // ============================================================
  async function chamarMotorIA(systemInstructionText: string, promptParts: any[], isElementRefinement = false) {
    setStatusApis({ texto: isElementRefinement ? 'A IA processando...' : 'A IA está diagramando os capítulos...', processing: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const response = await fetch('/api/gerar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          systemInstruction: systemInstructionText,
          promptParts,
          isElementRefinement,
          useGroq: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (err) {
        throw new Error(`Erro no Servidor (${response.status}): ${responseText.substring(0, 80)}`);
      }
      if (!data.success) throw new Error(data.error || 'Erro retornado pela API.');
      return data;
    } catch (err: any) {
      let errorMsg = err.message;
      if (errorMsg.includes('429') || errorMsg.toLowerCase().includes('quota')) {
        errorMsg = 'Limite excedido (Quota).';
      }
      if (errorMsg.includes('aborted') || err.name === 'AbortError') {
        errorMsg = 'Tempo limite excedido. Tente gerar um capítulo por vez.';
      }
      console.error('Erro na chamada da IA:', errorMsg);
      if (isElementRefinement) throw new Error(errorMsg);
      (window as any).showNotification(errorMsg, 'error');
      return null;
    } finally {
      setStatusApis({ texto: 'Aguardando', processing: false });
    }
  }
  
  useEffect(() => {
    (window as any).showNotification = (msg: string, type: string) => {
      const exist = document.getElementById('custom-toast');
      if (exist) exist.remove();
      const div = document.createElement('div');
      div.id = 'custom-toast';
      div.className =
        type === 'error'
          ? `fixed top-6 left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-xl shadow-xl z-[9999] flex items-start gap-3 text-sm font-semibold max-w-lg w-full break-words`
          : `fixed bottom-6 right-6 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-xl z-[9999] flex items-center gap-3 text-sm font-semibold`;
      div.innerHTML =
        type === 'error'
          ? `<i class="fas fa-exclamation-circle text-red-500 mt-0.5 text-lg shrink-0"></i> <span class="flex-1">${msg}</span>`
          : `<i class="fas fa-check-circle text-emerald-400 text-lg shrink-0"></i> <span>${msg}</span>`;
      document.body.appendChild(div);
      setTimeout(() => {
        div.style.opacity = '0';
        div.style.transition = 'opacity 0.4s';
        setTimeout(() => div.remove(), 4000);
      }, 4000);
    };

    (window as any).baixarPdf = () => {
      if (previewFrameRef.current && previewFrameRef.current.contentWindow) {
        previewFrameRef.current.contentWindow.print();
      }
    };

    const savedHtml = localStorage.getItem('ebook_draft_html');
    if (savedHtml) {
      const htmlFinal = moldarApresentacaoHtml(savedHtml);
      setHtmlAtual(htmlFinal);
      if (previewFrameRef.current) {
        previewFrameRef.current.srcdoc = htmlFinal + getScriptPreview(indexShowSubtopics, ativarBgSegundaPagina, bgSegundaPaginaUrl, bgSegundaPaginaOpacidade);
      }
    }

    const savedBooks = localStorage.getItem('ebook_saved_books');
    if (savedBooks) {
      try {
        setLivrosSalvos(JSON.parse(savedBooks));
      } catch (e) {}
    }
  }, []);

  // Atualiza a capa quando título/autor mudam
  useEffect(() => {
    if (htmlAtual && (livroTitulo || livroAutores)) {
      const htmlAtualizado = atualizarCapaNoHtml(htmlAtual, livroTitulo, livroAutores);
      if (htmlAtualizado !== htmlAtual) {
        setHtmlAtual(htmlAtualizado);
        localStorage.setItem('ebook_draft_html', htmlAtualizado);
        setRecarregarIframe(true);
        if (previewFrameRef.current) {
          previewFrameRef.current.srcdoc = htmlAtualizado + getScriptPreview(indexShowSubtopics, ativarBgSegundaPagina, bgSegundaPaginaUrl, bgSegundaPaginaOpacidade);
        }
      }
    }
  }, [livroTitulo, livroAutores]);

  // Sincroniza mensagens do iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'ELEMENT_SELECTED') setElementoSelecionado(e.data);
      if (e.data.type === 'HTML_SYNC') {
        const htmlLimpo = moldarApresentacaoHtml(e.data.html);
        if (modoInspetor) {
          setHistoricoCodigo((prev) => {
            if (prev.length > 0 && prev[prev.length - 1] === htmlLimpo) return prev;
            return [...prev, htmlAtual];
          });
          setHtmlAtual(htmlLimpo);
          localStorage.setItem('ebook_draft_html', htmlLimpo);
          setRecarregarIframe(false);
        } else {
          setHistoricoCodigo((prev) => [...prev, htmlAtual]);
          setHtmlAtual(htmlLimpo);
          localStorage.setItem('ebook_draft_html', htmlLimpo);
          setRecarregarIframe(true);
          if (previewFrameRef.current) {
            previewFrameRef.current.srcdoc = htmlLimpo + getScriptPreview(indexShowSubtopics, ativarBgSegundaPagina, bgSegundaPaginaUrl, bgSegundaPaginaOpacidade);
          }
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [modoInspetor, htmlAtual]);

  // Recarregar iframe travado APENAS para nova geração ou botão desfazer
  useEffect(() => {
    if (recarregarIframe && htmlAtual && previewFrameRef.current) {
      previewFrameRef.current.srcdoc = htmlAtual + getScriptPreview(indexShowSubtopics, ativarBgSegundaPagina, bgSegundaPaginaUrl, bgSegundaPaginaOpacidade);
    }
  }, [htmlAtual, recarregarIframe]); // TRAVADO: Removemos o gatilho de recuo e botões de fundo daqui!
  // Reaplicar estilos ao mudar configurações visuais
  useEffect(() => {
    if (htmlAtual) {
      const htmlFinal = moldarApresentacaoHtml(htmlAtual);
      setHtmlAtual(htmlFinal);
      localStorage.setItem('ebook_draft_html', htmlFinal);
      setRecarregarIframe(true);
    }
  }, [tipoBorda, paletaCores, corManualPri, corManualSec, corManualText, corManualBg]); // TRAVADO: Apenas Borda e Cores reagem em tempo real!
  const isTextElement = elementoSelecionado
    ? ['p', 'h1', 'h2', 'h3', 'h4', 'span', 'li', 'a', 'blockquote', 'strong', 'em', 'i', 'b'].includes(
        elementoSelecionado.tagName.toLowerCase()
      )
    : false;

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <>
      <div className="md:hidden fixed inset-0 z-[99999] bg-slate-900 text-white flex flex-col items-center justify-center p-8 text-center">
        <i className="fas fa-desktop text-6xl mb-6 text-indigo-400"></i>
        <h2 className="text-2xl font-black mb-3">Acesso Restrito ao Computador</h2>
        <p className="text-base text-slate-300">Para garantir uma experiência de nível profissional na edição e diagramação do seu E-book, o painel do E-bookPro deve ser acessado por uma tela maior.</p>
      </div>

      <div className="hidden md:flex h-screen overflow-hidden relative bg-slate-100 text-slate-800 font-sans selection:bg-indigo-100">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <style dangerouslySetInnerHTML={{ __html: `
          .input-standard { width: 100%; padding: 0.6rem 0.8rem; border-radius: 0.5rem; border: 1px solid #cbd5e1; background-color: #f8fafc; font-size: 0.75rem; outline: none; color: #334155; transition: all 0.2s; font-weight: 500; }
          .input-standard:focus { border-color: #6366f1; background-color: #ffffff; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
          .input-label { font-size: 0.65rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4rem; display: block; }
          .panel-section { padding: 1.2rem; border-bottom: 1px solid #f1f5f9; }
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
          .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; }
          .modal-content { background: white; border-radius: 1.5rem; padding: 2rem; max-width: 500px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
        ` }} />

        <input type="file" ref={imageInputRef} onChange={handleImageUploadBtn} accept="image/*" className="hidden" />
        <input type="file" ref={extraImageInputRef} onChange={handleExtraImageUpload} accept="image/*" className="hidden" />
        <input type="file" ref={uploadInputRef} onChange={handleUploadFile} accept=".html,.htm" className="hidden" />

        {statusApis.processing && (
          <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center">
            <div className="w-14 h-14 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-5"></div>
            <p className="text-slate-800 font-black text-xl tracking-tight mb-2">{statusApis.texto}</p>
            <p className="text-slate-500 font-medium text-sm">Organizando estrutura e conteúdo editorial...</p>
          </div>
        )}

        {showModalPagina && (
          <div className="modal-overlay" onClick={() => setShowModalPagina(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
                <i className="fas fa-plus-circle text-indigo-600"></i> Inserir Página Extra
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="input-label">Título (opcional)</label>
                  <input
                    type="text"
                    value={paginaTitulo}
                    onChange={(e) => setPaginaTitulo(e.target.value)}
                    className="input-standard"
                    placeholder="Ex: Dedicatória, Agradecimentos..."
                  />
                </div>
                <div>
                  <label className="input-label">URL da Imagem (opcional)</label>
                  <input
                    type="text"
                    value={paginaImagem}
                    onChange={(e) => setPaginaImagem(e.target.value)}
                    className="input-standard"
                    placeholder="https://exemplo.com/imagem.jpg"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => extraImageInputRef.current?.click()}
                    className="bg-slate-700 hover:bg-slate-800 text-white font-bold text-[9px] px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
                  >
                    <i className="fas fa-upload"></i> Upload Imagem
                  </button>
                  <span className="text-[9px] text-slate-400">(PC)</span>
                </div>
                <div>
                  <label className="input-label">Posição da Imagem</label>
                  <select
                    value={paginaPosicaoImagem}
                    onChange={(e) => setPaginaPosicaoImagem(e.target.value as any)}
                    className="input-standard"
                  >
                    <option value="esquerda">Esquerda (flutuante)</option>
                    <option value="centro">Centralizada</option>
                    <option value="topo">Topo</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Local de Inserção</label>
                  <select
                    value={paginaLocal}
                    onChange={(e) => setPaginaLocal(e.target.value as any)}
                    className="input-standard"
                  >
                    <option value="depois-capa">Depois da Capa</option>
                    <option value="depois-conclusao">Depois da Conclusão</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={inserirPaginaExtra}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg transition"
                  >
                    Inserir
                  </button>
                  <button
                    onClick={() => setShowModalPagina(false)}
                    className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2.5 rounded-lg transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {modalBiblioteca && (
          <div className="fixed inset-0 z-[99998] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <i className="fas fa-book text-indigo-600"></i> Seus E-books Salvos
                </h2>
                <button onClick={() => setModalBiblioteca(false)} className="text-slate-400 hover:text-slate-600">
                  <i className="fas fa-times text-xl"></i>
                </button>
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
                    {livrosSalvos.map((livro) => (
                      <div
                        key={livro.id}
                        className="border border-slate-200 rounded-xl p-4 flex justify-between items-center hover:border-indigo-300 hover:shadow-md transition bg-white"
                      >
                        <div>
                          <h3 className="font-bold text-slate-800 text-base">{livro.titulo}</h3>
                          <p className="text-xs text-slate-400 font-medium mt-1">
                            <i className="far fa-calendar-alt"></i> Salvo em: {livro.data}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => carregarDaBiblioteca(livro)}
                            className="bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white font-bold px-4 py-2 rounded-lg text-xs transition"
                          >
                            Carregar
                          </button>
                          <button
                            onClick={() => baixarArquivo(livro.html, livro.titulo)}
                            className="bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white font-bold px-3 py-2 rounded-lg text-xs transition"
                          >
                            <i className="fas fa-download"></i> Salvar arquivo
                          </button>
                          <button
                            onClick={() => excluirDaBiblioteca(livro.id)}
                            className="bg-red-50 text-red-500 hover:bg-red-50 hover:text-white font-bold px-3 py-2 rounded-lg text-xs transition"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <aside className="w-[380px] bg-white border-r border-slate-200 flex flex-col h-full z-10 flex-shrink-0 shadow-sm">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h1 className="text-xl font-black tracking-tight text-slate-800 flex items-center">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center mr-2.5 text-white shadow-md shadow-indigo-200">
                <i className="fas fa-book-open text-xs"></i>
              </div>
              E-book<span className="text-indigo-600">Pro</span>
            </h1>
            <button
              onClick={toggleInspetor}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
                modoInspetor
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                  : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <i className={`fas fa-pen-nib ${modoInspetor ? 'animate-pulse text-yellow-300' : ''}`}></i>{' '}
              {modoInspetor ? 'Editor Inteligente' : 'Modo Editor'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
            {!modoInspetor && (
              <div className="divide-y divide-slate-100">
                <div className="panel-section">
                  <div className="flex justify-between items-center mb-3">
                    <label className="input-label mb-0 text-indigo-600">Conteúdo & Capítulos</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setModalBiblioteca(true)}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 transition shadow-sm"
                      >
                        <i className="fas fa-book mr-1"></i> Biblioteca ({livrosSalvos.length})
                      </button>
                      <button
                        onClick={salvarNaBiblioteca}
                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 transition shadow-sm"
                      >
                        <i className="fas fa-save mr-1"></i> Salvar Local
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="input-label">Título do Livro</label>
                      <input
                        type="text"
                        value={livroTitulo}
                        onChange={(e) => setLivroTitulo(e.target.value)}
                        className="input-standard mb-3"
                        placeholder="Ex: O Poder da Mente"
                      />
                    </div>
                    <div>
                      <label className="input-label">Texto do Cabeçalho (Esquerda)</label>
                      <input
                        type="text"
                        value={textoCabecalho}
                        onChange={(e) => setTextoCabecalho(e.target.value)}
                        className="input-standard"
                        placeholder="Deixe vazio para esconder"
                      />
                    </div>
                    <div>
                      <label className="input-label">Nome do Autor</label>
                      <input
                        type="text"
                        value={livroAutores}
                        onChange={(e) => setLivroAutores(e.target.value)}
                        className="input-standard"
                        placeholder="Ex: João da Silva"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="input-label mb-0">Texto Base / Sumário / Ideia</label>
                        <button
                          onClick={iniciarNovoLivro}
                          className="text-[9px] font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 transition shadow-sm flex items-center gap-1.5"
                        >
                          <i className="fas fa-file-alt"></i> Novo Livro
                        </button>
                      </div>
                      <textarea
                        rows={4}
                        value={productContent}
                        onChange={(e) => setProductContent(e.target.value)}
                        className="input-standard resize-y"
                        placeholder="Descreva os capítulos ou cole seu texto aqui..."
                      ></textarea>
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
                      <button
                        onClick={iniciarEbookEtapas}
                        className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-[9px] uppercase py-2 rounded-lg transition shadow-sm"
                      >
                        1. Capa/Intro
                      </button>
                      <button
                        onClick={continuarEbookEtapas}
                        className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-[9px] uppercase py-2 rounded-lg transition shadow-sm"
                      >
                        2. +3 Capítulos
                      </button>
                      <button
                        onClick={finalizarEbookEtapas}
                        className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-[9px] uppercase py-2 rounded-lg transition shadow-sm"
                      >
                        3. Fim/Autor
                      </button>
                    </div>
                  </div>
                </div>

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
                        <option value="Arial">Arial</option>
                      </select>
                    </div>
                    <div>
                      <label className="input-label text-[9px]">Tamanho Base</label>
                      <select
                        value={tamanhoFonteBase}
                        onChange={(e) => setTamanhoFonteBase(e.target.value)}
                        className="input-standard text-[10px]"
                      >
                        <option value="12pt">12pt (Compacto)</option>
                        <option value="13pt">13pt (Padrão)</option>
                        <option value="14pt">14pt (Confortável)</option>
                        <option value="15pt">15pt (Grande)</option>
                      </select>
                    </div>
                  </div>

                 <div className="mb-4">
                    <label className="input-label text-[9px] mb-2">🎨 Cores do E-book</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPaletaCores('branco-preto')}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-[9px] font-bold transition-all ${paletaCores === 'branco-preto' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                      >
                        <div className="flex gap-1.5 mb-1.5">
                          <span className="w-4 h-4 rounded-full border border-slate-300 bg-white"></span>
                          <span className="w-4 h-4 rounded-full bg-slate-900"></span>
                        </div>
                        Branco + Preto
                      </button>

                      <button
                        onClick={() => setPaletaCores('branco-dourado')}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-[9px] font-bold transition-all ${paletaCores === 'branco-dourado' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                      >
                        <div className="flex gap-1.5 mb-1.5">
                          <span className="w-4 h-4 rounded-full border border-slate-300 bg-white"></span>
                          <span className="w-4 h-4 rounded-full bg-yellow-600"></span>
                        </div>
                        Branco + Dourado
                      </button>

                      <button
                        onClick={() => setPaletaCores('branco-verde')}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-[9px] font-bold transition-all ${paletaCores === 'branco-verde' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                      >
                        <div className="flex gap-1.5 mb-1.5">
                          <span className="w-4 h-4 rounded-full border border-slate-300 bg-white"></span>
                          <span className="w-4 h-4 rounded-full bg-emerald-600"></span>
                        </div>
                        Branco + Verde
                      </button>

                      <button
                        onClick={() => setPaletaCores('manual')}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-[9px] font-bold transition-all ${paletaCores === 'manual' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                      >
                        <i className={`fas fa-palette text-lg mb-1 ${paletaCores === 'manual' ? 'text-indigo-600' : 'text-slate-400'}`}></i>
                        Personalizar
                      </button>
                    </div>
                  </div>

                  {paletaCores === 'manual' && (
                    <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 mb-4 animate-[fadeIn_0.3s_ease]">
                      <p className="text-[9px] font-bold text-indigo-700 mb-3 leading-relaxed flex gap-1.5">
                        <i className="fas fa-info-circle mt-0.5 text-indigo-500"></i>
                        Dica: Defina as duas cores abaixo. A numeração, os títulos e as bordas seguirão automaticamente a "Cor do Texto" que você escolher!
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="input-label text-[9px] text-indigo-900">Fundo da Página</label>
                          <input
                            type="color"
                            value={corManualBg}
                            onChange={(e) => setCorManualBg(e.target.value)}
                            className="w-full h-8 rounded cursor-pointer border-none p-0 bg-transparent"
                          />
                        </div>
                        <div>
                          <label className="input-label text-[9px] text-indigo-900">Cor do Texto</label>
                          <input
                            type="color"
                            value={corManualText}
                            onChange={(e) => setCorManualText(e.target.value)}
                            className="w-full h-8 rounded cursor-pointer border-none p-0 bg-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="input-label text-[9px]">Rodapé da Página</label>
                      <select
                        value={estiloRodape}
                        onChange={(e: any) => setEstiloRodape(e.target.value)}
                        className="input-standard text-[10px]"
                      >
                        <option value="linha-superior">Linha Superior + Autor + Num</option>
                        <option value="simples">Simples (Autor + Num)</option>
                        <option value="centralizado-circulo">Centralizado com Círculo</option>
                        <option value="centralizado">Apenas Número Centralizado</option>
                      </select>
                    </div>
                    <div>
                      <label className="input-label text-[9px]">Recuo do Parágrafo</label>
                      <select
                        value={recuoParagrafo}
                        onChange={(e) => setRecuoParagrafo(e.target.value)}
                        className="input-standard text-[10px]"
                      >
                        <option value="0px">0px (sem recuo)</option>
                        <option value="10px">10px</option>
                        <option value="20px">20px (padrão)</option>
                        <option value="30px">30px</option>
                        <option value="40px">40px</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="input-label text-[9px]">Tipo de Livro</label>
                      <select
                        value={modoConteudo}
                        onChange={(e: any) => setModoConteudo(e.target.value)}
                        className="input-standard text-[10px]"
                      >
                        <option value="expandido">Padrão (Expandido)</option>
                        <option value="rigoroso">Rigoroso (texto original)</option>
                      </select>
                    </div>
                    <div>
                      <label className="input-label text-[9px]">Espaçamento entre Parágrafos</label>
                      <select
                        value={espacamentoParagrafo}
                        onChange={(e) => setEspacamentoParagrafo(e.target.value)}
                        className="input-standard text-[10px]"
                      >
                        <option value="0.5em">0.5em</option>
                        <option value="0.8em">0.8em (padrão)</option>
                        <option value="1em">1em</option>
                        <option value="1.2em">1.2em</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="input-label text-[9px]">Borda das Páginas</label>
                      <select
                        value={tipoBorda}
                        onChange={(e: any) => setTipoBorda(e.target.value)}
                        className="input-standard text-[10px]"
                      >
                        <option value="none">Sem borda</option>
                        <option value="single">Linha fina</option>
                        <option value="medium">Linha média</option>
                        <option value="double-thin">Linha dupla fina</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-slate-200 pt-3">
                    <button
                      onClick={() => setShowModalPagina(true)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase py-2 rounded-lg transition shadow-sm flex items-center justify-center gap-2"
                    >
                      <i className="fas fa-plus-circle"></i> Inserir Página Extra
                    </button>
                    <p className="text-[9px] text-slate-400 text-center mt-1.5">Adicione dedicatória, agradecimentos, etc.</p>
                  </div>
                </div>

                <div className="panel-section">
                  <div className="flex items-center justify-between mb-2">
                    <label className="input-label mb-0 text-indigo-600">Fundo da 2ª Página de Capítulo</label>
                    <input
                      type="checkbox"
                      checked={ativarBgSegundaPagina}
                      onChange={(e) => setAtivarBgSegundaPagina(e.target.checked)}
                      className="rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                    />
                  </div>
                  {ativarBgSegundaPagina && (
                    <div className="space-y-2 mt-2">
                      <input
                        type="text"
                        value={bgSegundaPaginaUrl}
                        onChange={(e) => setBgSegundaPaginaUrl(e.target.value)}
                        className="input-standard text-[10px]"
                        placeholder="URL de fundo opcional (ou usa do cap)..."
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-slate-500">Opacidade:</span>
                        <input
                          type="range"
                          min="0.5"
                          max="0.98"
                          step="0.02"
                          value={bgSegundaPaginaOpacidade}
                          onChange={(e) => setBgSegundaPaginaOpacidade(e.target.value)}
                          className="flex-1 accent-indigo-600 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                  <p className="text-[9px] text-slate-400 mt-2">Esta opção define a imagem de fundo padrão. Use o botão "Fundo 2ª Pág" no topo para ligar/desligar globalmente após gerar.</p>
                </div>
              </div>
            )}

            {modoInspetor && (
              <div className="animate-[fadeIn_0.2s_ease] mt-4 border-t border-slate-200 pt-4">
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
                          {(elementoSelecionado.tagName === 'img' ||
                            elementoSelecionado.bgImage ||
                            elementoSelecionado.isBgTarget) && (
                            <button
                              onClick={() => imageInputRef.current?.click()}
                              className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 transition flex items-center bg-indigo-50 border border-indigo-200 px-2 py-1 rounded shadow-sm"
                            >
                              <i className="fas fa-upload mr-1"></i> Upload PC
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (previewFrameRef.current && previewFrameRef.current.contentWindow) {
                                previewFrameRef.current.contentWindow.postMessage(
                                  { type: 'DELETE_ELEMENT', id: elementoSelecionado.id },
                                  '*'
                                );
                              }
                            }}
                            className="text-[9px] font-bold text-red-500 hover:text-red-700 transition flex items-center bg-red-50 border border-red-200 hover:border-red-400 px-2 py-1 rounded shadow-sm"
                          >
                            <i className="fas fa-trash-alt mr-1"></i> Apagar
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 mb-4">
                        <label className="input-label mb-2 text-indigo-700 flex items-center gap-1">
                          <i className="fas fa-magic text-yellow-500"></i> Editar este trecho com IA
                        </label>
                        <textarea
                          id="ai_prompt_local"
                          rows={2}
                          className="input-standard text-xs mb-2 border-indigo-200 shadow-inner"
                          placeholder="Ex: Reescreva este parágrafo em um tom mais persuasivo..."
                        ></textarea>
                        <button
                          onClick={aplicarModificacaoLocal}
                          className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-[10px] uppercase tracking-wide py-2 rounded-lg transition shadow-sm"
                        >
                          Aplicar IA no Selecionado
                        </button>
                      </div>

                      {(elementoSelecionado.tagName === 'img' ||
                        elementoSelecionado.bgImage ||
                        elementoSelecionado.isBgTarget) && (
                        <div className="space-y-3 pt-3 border-t border-slate-100">
                          <div>
                            <label className="input-label mb-2 text-indigo-800">🖼️ Controle Fotográfico (Unsplash)</label>
                            <button
                              onClick={buscarImagemUnsplash}
                              className="w-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-[9px] uppercase py-2 rounded shadow-sm transition mb-3"
                            >
                              <i className="fas fa-search mr-1"></i> Buscar Unsplash
                            </button>
                            <input
                              type="text"
                              value={elementoSelecionado.src || elementoSelecionado.bgImage}
                              onChange={(e) =>
                                atualizarElemento(
                                  elementoSelecionado.tagName === 'img' ? 'src' : 'bgImage',
                                  e.target.value
                                )
                              }
                              className="input-standard text-[10px] mb-2 font-mono text-slate-500"
                              placeholder="URL da imagem (cole aqui)..."
                            />
                          </div>

                          {(elementoSelecionado.bgImage || elementoSelecionado.isBgTarget) && (
                            <div className="mt-3 pt-3 border-t border-slate-100">
                              <label className="input-label mb-1">Clareamento de Fundo (Opacidade para Leitura)</label>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 font-bold">0%</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="1"
                                  step="0.05"
                                  defaultValue="0"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const newBg =
                                      val === '0'
                                        ? `url('${elementoSelecionado.bgImage}')`
                                        : `linear-gradient(rgba(255,255,255,${val}), rgba(255,255,255,${val})), url('${elementoSelecionado.bgImage}')`;
                                    if (previewFrameRef.current && previewFrameRef.current.contentWindow) {
                                      previewFrameRef.current.contentWindow.postMessage(
                                        {
                                          type: 'UPDATE_ELEMENT',
                                          id: elementoSelecionado.id,
                                          rawBgImage: newBg,
                                        },
                                        '*'
                                      );
                                    }
                                  }}
                                  className="flex-1 accent-indigo-600 cursor-pointer"
                                />
                                <span className="text-[10px] text-slate-500 font-bold">100%</span>
                              </div>
                              <button
                                onClick={() => atualizarElemento('rawBgImage', 'none')}
                                className="w-full mt-3 bg-orange-50 border border-orange-200 text-orange-700 font-bold text-[9px] uppercase py-2 rounded transition hover:bg-orange-100"
                              >
                                <i className="fas fa-times-circle mr-1"></i> Remover Imagem de Fundo
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {!elementoSelecionado.isBgTarget && isTextElement && (
                        <div className="pt-3 border-t border-slate-100">
                          <label className="input-label mb-2">Edição Manual de Texto</label>
                          <textarea
                            rows={5}
                            value={(elementoSelecionado.text || '').replace(/<br\s*\/?>/gi, '\n')}
                            onChange={(e) => atualizarElemento('text', e.target.value.replace(/\n/g, '<br>'), true)}
                            className="input-standard resize-y shadow-inner text-sm leading-relaxed font-serif"
                          ></textarea>

                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() =>
                                atualizarElemento(
                                  'fontWeight',
                                  elementoSelecionado.fontWeight === 'bold' ? 'normal' : 'bold'
                                )
                              }
                              className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-[9px] uppercase py-2 rounded transition shadow-sm border border-slate-700"
                            >
                              <i className="fas fa-bold mr-1"></i> Negrito
                            </button>

                            <label className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[9px] uppercase py-2 rounded border border-slate-300 transition cursor-pointer flex items-center justify-center">
                              <i className="fas fa-palette mr-1"></i> Cor
                              <input
                                type="color"
                                value={elementoSelecionado.textColor || '#1e1914'}
                                onChange={(e) => atualizarElemento('textColor', e.target.value)}
                                className="w-0 h-0 opacity-0 absolute"
                              />
                            </label>
                          </div>

                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => transformarEmNode('blockquote')}
                              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[9px] uppercase py-2 rounded border border-slate-300 transition"
                            >
                              <i className="fas fa-quote-right mr-1"></i> Virar Citação
                            </button>
                            <button
                              onClick={() => transformarEmNode('div', 'highlight-box')}
                              className="flex-1 bg-yellow-50 hover:bg-yellow-100 text-yellow-800 font-bold text-[9px] uppercase py-2 rounded border border-yellow-200 transition"
                            >
                              <i className="fas fa-highlighter mr-1"></i> Fundo
                            </button>
                          </div>

                          <button
                            onClick={() => atualizarElemento('forceBreak', true)}
                            className="w-full mt-3 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold text-[9px] uppercase py-2 rounded transition shadow-sm"
                          >
                            <i className="fas fa-level-down-alt mr-1"></i> Mover p/ Próxima Página
                          </button>
                        </div>
                      )}

                      {!elementoSelecionado.isBgTarget && !isTextElement && elementoSelecionado.tagName !== 'img' && (
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
                          <input
                            type="color"
                            value={elementoSelecionado.bgColor || '#ffffff'}
                            onChange={(e) => atualizarElemento('bgColor', e.target.value)}
                            className="w-full h-8 rounded cursor-pointer border-none"
                          />
                        </div>
                        <div>
                          <label className="input-label mb-0 text-[9px] flex justify-between">Tamanho Fonte <span className="text-indigo-600 font-bold">{elementoSelecionado.fontSize || 16}px</span></label>
                          <input
                            type="range"
                            min="10"
                            max="60"
                            value={elementoSelecionado.fontSize || 16}
                            onChange={(e) => atualizarElemento('fontSize', parseInt(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-2"
                          />
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
            )}
          </div>

          <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Motor IA: Google Gemini</span>
            <span className="text-slate-300">v2.0</span>
          </div>
        </aside>

        <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-200 relative">
          <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-20 shadow-sm flex-shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => uploadInputRef.current?.click()}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs shadow-sm transition flex items-center gap-1.5"
              >
                <i className="fas fa-file-upload"></i> Importar Ebook
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={desfazerCodigo}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs shadow-sm transition flex items-center gap-1.5"
              >
                <i className="fas fa-undo"></i> Desfazer
              </button>
              <button
                onClick={() => (window as any).baixarPdf()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-lg text-xs shadow-md shadow-indigo-200 transition flex items-center gap-2"
              >
                <i className="fas fa-print"></i> Imprimir / PDF
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8 flex justify-center relative">
            <iframe
              ref={previewFrameRef}
              id="previewFrame"
              className="w-full h-full border-none shadow-2xl bg-transparent rounded-lg"
              title="Preview E-book"
            ></iframe>
          </div>
        </main>
      </div>
    </>
  );
}