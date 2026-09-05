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
  // CORREÇÃO: Removidos parâmetros do fundo da 2ª página
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

  // --- 6. Sincronizar Índice (com paginação inteligente e hard limit) ---
  function sincronizarIndice() {
        // Encontrar todos os .toc-container existentes
        let tocs = container.querySelectorAll('.toc-container');
        // Se não houver nenhum, não faz nada
        if (tocs.length === 0) return;
        
        // CORREÇÃO: Não remover páginas extras, apenas selecionar a primeira página de índice
        // e garantir que os .toc-container extras sejam removidos apenas se forem além do necessário
        // e com cuidado para não apagar elementos irmãos.
        
        // Vamos pegar a página que contém o primeiro .toc-container
        const mainPage = tocs[0].closest('.page-container');
        if (!mainPage) return;

        // Limpar o conteúdo do .toc-container principal, mas sem remover a página
        const mainToc = tocs[0];
        mainToc.innerHTML = '';

        // Coletar todos os títulos para o índice
        const titulos = container.querySelectorAll('h1, h2, h3');
        const titulosVistos = new Set();
        const itens = [];

        titulos.forEach((titleEl) => {
          if (titleEl.closest('.page-cover-img, .page-cover-text, .page-cover-pura, .legal-page')) return;
          
          let texto = titleEl.textContent?.trim() || '';
          if (!texto || /índice|sumário/i.test(texto)) return;

          let chave = texto.toLowerCase().replace(/capítulo\s*\d+:/, '').trim();
          if (titulosVistos.has(chave)) return;
          titulosVistos.add(chave);

          if (!titleEl.id) {
            titleEl.id = 'sec-' + Math.random().toString(36).substr(2, 9);
          }

          const a = document.createElement('a');
          a.className = 'toc-item';
          
          const isMain = titleEl.tagName === 'H1' || titleEl.tagName === 'H2';
          if (isMain) {
            a.classList.add('toc-main-chapter');
            a.style.fontWeight = indexShowSubtopics ? '700' : '400';
            a.style.color = 'var(--color-primary)';
          } else if (titleEl.tagName === 'H3') {
            if (!indexShowSubtopics) return;
            a.classList.add('toc-subtopic');
            a.style.paddingLeft = '20px';
            a.style.fontSize = '0.75em';
            a.style.lineHeight = '1';
            a.style.opacity = '0.85';
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
          
          itens.push(a);
        });

        // Se não há itens, remove a página do índice?
        if (itens.length === 0) {
          mainPage.remove();
          return;
        }

        // Função para criar uma nova página de índice (com .toc-container vazio)
        function criarPaginaIndice(afterPage) {
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

          const newToc = document.createElement('div');
          newToc.className = 'toc-container';
          contentArea.appendChild(newToc);

          // Inserir imediatamente após a página anterior (afterPage)
          if (afterPage && afterPage.parentNode) {
            afterPage.parentNode.insertBefore(novaPagina, afterPage.nextSibling);
          } else {
            // Fallback: inserir antes da página do autor
            const authorPage = container.querySelector('.author-page');
            if (authorPage) {
              container.insertBefore(novaPagina, authorPage);
            } else {
              container.appendChild(novaPagina);
            }
          }
          return { pagina: novaPagina, toc: newToc };
        }

        // Começar com a página principal
        let currentPage = mainPage;
        let currentToc = mainToc;
        const LIMITE_ALTURA_INDICE = 850;
        let pageCount = 1;
        const MAX_PAGES = 6; // Hard limit

        for (let i = 0; i < itens.length; i++) {
          const item = itens[i];
          currentToc.appendChild(item);

          // Verificar se a página atual estourou a altura
          const contentArea = currentPage.querySelector('.content-area');
          if (contentArea && contentArea.scrollHeight > LIMITE_ALTURA_INDICE) {
            // Remove o item que acabou de ser adicionado
            currentToc.removeChild(item);
            // Criar nova página de índice, inserindo após a página atual
            if (pageCount >= MAX_PAGES) {
              // Se atingiu o limite máximo, interrompe o loop (não adiciona mais itens)
              break;
            }
            const nova = criarPaginaIndice(currentPage);
            currentPage = nova.pagina;
            currentToc = nova.toc;
            pageCount++;
            // Adicionar o item na nova página
            currentToc.appendChild(item);
          }
        }

        // Remover páginas de índice extras que possam ter sido criadas além do necessário
        // mas cuidado: só remover se não forem a principal e se estiverem vazias ou além do limite
        const allTocPages = container.querySelectorAll('.page-container .toc-container');
        // Se houver mais páginas de índice do que o pageCount, remova as extras (apenas as que estão depois)
        // Mas não remova a principal (a primeira)
        // Vamos remover as páginas de índice que estão após a última página que contém itens
        // Mas como não sabemos exatamente qual é a última, vamos simplesmente garantir que não haja
        // páginas de índice vazias no final
        container.querySelectorAll('.page-container').forEach(page => {
          const toc = page.querySelector('.toc-container');
          if (toc && !page.querySelector('.toc-item')) {
            page.remove();
          }
        });
      }

  sincronizarIndice();

  // --- 7. Aplicar fundo da segunda página (removido) ---
  // CORREÇÃO: Removida toda a lógica de .chapter-page-2

  // --- 8. Forçar reflow para ajustar numeração ---
  setTimeout(() => sincronizarIndice(), 50);
}

// ============================================================
// SCRIPT INJETADO NO IFRAME (Cabeçalho Dinâmico e Blindagem de Cores)
// ============================================================

function getScriptPreview(
  indexShowSubtopics: boolean
  // CORREÇÃO: Removidos parâmetros do fundo da 2ª página
) {
  return `
<script>
  (function() {
    let observer;
    let isEditMode = false;
    let selectedEl = null;
    // CORREÇÃO: Removido bg2Hidden

    function rgbToHex(rgb) {
      if (!rgb || rgb === 'rgba(0, 0, 0, 0)' || rgb === 'transparent') return '#ffffff';
      let m = rgb.match(/^rgb(?:a)?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
      if (!m) return '#000000';
      return "#" + (1 << 24 | m[1] << 16 | m[2] << 8 | m[3]).toString(16).slice(1);
    }

    function executarRefluxoCompleto() {
      if (observer) observer.disconnect();
      
      const currentScrollY = window.scrollY;
      const container = document.getElementById('ebook-container');
      if (!container) return;

      // CORREÇÃO DO UNSPLASH: Burlar o cache usando sintaxe aceita pela API
      container.querySelectorAll('.cap-img-overlay').forEach(overlay => {
         let bg = overlay.style.backgroundImage || '';
         if (overlay.dataset.unsplash && (bg === '' || bg === 'none' || bg.includes('initial') || bg === '')) {
            const keyword = encodeURIComponent(overlay.dataset.unsplash.trim());
            const cacheBuster = Math.random().toString(36).substring(7);
            overlay.style.setProperty('background-image', \`url('https://images.unsplash.com/featured/1200x800/?\${keyword},abstract,texture,sig\${cacheBuster}')\`, 'important');
         }
      });

      const metaTitle = document.getElementById('meta-book-title');
      let tituloDoLivro = metaTitle && metaTitle.getAttribute('content') ? metaTitle.getAttribute('content').toUpperCase().trim() : "";

      const metaHeader = document.getElementById('meta-header-text');
      let textoEsquerdo = metaHeader && metaHeader.getAttribute('content') ? metaHeader.getAttribute('content').toUpperCase().trim() : '';

      container.querySelectorAll('.page-header').forEach(h => {
         const spans = h.querySelectorAll('span');
         if (spans.length >= 1) spans[0].textContent = textoEsquerdo; 
         if (spans.length >= 2) spans[1].textContent = tituloDoLivro;
      });

      let modeloFooter = '<span class="page-number"></span>';
      const footerExistente = container.querySelector('.page-footer');
      if (footerExistente) {
        modeloFooter = footerExistente.innerHTML;
      }

      const todasPaginas = container.querySelectorAll('.page-container');
      todasPaginas.forEach(p => {
        if (p.classList.contains('page-cover-img') || 
            p.classList.contains('page-cover-pura') || 
            p.classList.contains('page-cover-text') || 
            p.classList.contains('legal-page') || 
            p.querySelector('.toc-container') || 
            p.classList.contains('author-page')) {
            return; 
        }
        
        const area = p.querySelector('.content-area') || p;
        p.querySelectorAll('.page-header, .page-footer').forEach(l => l.remove());

        while (area.firstChild) {
            container.insertBefore(area.firstChild, p);
        }
        p.remove();
      });

      container.querySelectorAll('hr').forEach(hr => hr.remove());
      container.querySelectorAll('p').forEach(p => {
          if (p.innerHTML) {
            p.innerHTML = p.innerHTML.replace(/^(&nbsp;|\\s)+/g, '');
          }
          if (!p.textContent.trim() && !p.querySelector('img')) p.remove();
      });

      Array.from(container.childNodes).forEach(node => {
          if (node.nodeType === 3 && node.textContent.trim() !== '') {
              const p = document.createElement('p');
              p.textContent = node.textContent;
              container.insertBefore(p, node);
              node.remove();
          }
      });

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

      const indexConclusao = elementosIA.findIndex(el => el.id === 'conclusao' || (el.tagName === 'H1' && (el.textContent || '').toLowerCase().includes('conclusão')));
      
      if (indexConclusao !== -1) {
          const indexNovoCapitulo = elementosIA.findIndex((el, i) => i > indexConclusao && (el.tagName === 'H2' || el.classList.contains('cap-img-overlay')));
          if (indexNovoCapitulo !== -1) {
              const partesConclusao = elementosIA.splice(indexConclusao, indexNovoCapitulo - indexConclusao);
              elementosIA.push(...partesConclusao);
          }
      }

      const LIMITE_ALTURA_TEXTO = 940; 

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

          if (atual.areaTexto.children.length > 0) {
            if (el.tagName === 'H1' || el.tagName === 'H2' || el.classList.contains('cap-img-overlay')) {
              deveQuebrar = true; 
            } 
            else if (atual.areaTexto.querySelector('.cap-img-overlay') || atual.areaTexto.classList.contains('cap-img-overlay')) {
              deveQuebrar = true;
            }
            else if (el.tagName === 'H3' && atual.areaTexto.querySelectorAll('p, blockquote, ul, .highlight-box, .concept-box, img').length > 0) {
              deveQuebrar = true; 
            }
          }

          if (deveQuebrar) atual = criarNovaPagina();

          atual.areaTexto.appendChild(el);

          if (atual.areaTexto.scrollHeight > LIMITE_ALTURA_TEXTO) {
            if (!el.classList.contains('cap-img-overlay')) {
              if (atual.areaTexto.children.length > 1) {
                  atual.areaTexto.removeChild(el); 
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
        }
      }

      container.querySelectorAll('.chapter-text-page').forEach(page => {
        const area = page.querySelector('.content-area');
        if (!area || area.children.length === 0) page.remove();
      });

      // --- Sincronizar Índice com paginação (cópia da função externa) ---
      function sincronizarIndice() {
        let tocs = container.querySelectorAll('.toc-container');
        if (tocs.length === 0) return;
        
        // CORREÇÃO: Selecionar a página principal e não remover as outras de forma agressiva
        const mainToc = tocs[0];
        const mainPage = mainToc.closest('.page-container');
        if (!mainPage) return;

        // Limpar o conteúdo do .toc-container principal
        mainToc.innerHTML = '';

        const titulos = container.querySelectorAll('h1, h2, h3');
        const titulosVistos = new Set();
        const itens = [];

        titulos.forEach((titleEl) => {
          if (titleEl.closest('.page-cover-img, .page-cover-text, .page-cover-pura, .legal-page')) return;
          
          let texto = titleEl.textContent?.trim() || '';
          if (!texto || /índice|sumário/i.test(texto)) return;

          let chave = texto.toLowerCase().replace(/capítulo\\s*\\d+:/, '').trim();
          if (titulosVistos.has(chave)) return;
          titulosVistos.add(chave);

          if (!titleEl.id) {
            titleEl.id = 'sec-' + Math.random().toString(36).substr(2, 9);
          }

          const a = document.createElement('a');
          a.className = 'toc-item';
          
          const isMain = titleEl.tagName === 'H1' || titleEl.tagName === 'H2';
          if (isMain) {
            a.classList.add('toc-main-chapter');
            a.style.fontWeight = ${indexShowSubtopics} ? '700' : '400';
            a.style.color = 'var(--color-primary)';
          } else if (titleEl.tagName === 'H3') {
            if (!${indexShowSubtopics}) return;
            a.classList.add('toc-subtopic');
            a.style.paddingLeft = '20px';
            a.style.fontSize = '0.75em';
            a.style.lineHeight = '1';
            a.style.opacity = '0.85';
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
          
          itens.push(a);
        });

        if (itens.length === 0) {
          mainPage.remove();
          return;
        }

        function criarPaginaIndice(afterPage) {
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

          const newToc = document.createElement('div');
          newToc.className = 'toc-container';
          contentArea.appendChild(newToc);

          if (afterPage && afterPage.parentNode) {
            afterPage.parentNode.insertBefore(novaPagina, afterPage.nextSibling);
          } else {
            const authorPage = container.querySelector('.author-page');
            if (authorPage) {
              container.insertBefore(novaPagina, authorPage);
            } else {
              container.appendChild(novaPagina);
            }
          }
          return { pagina: novaPagina, toc: newToc };
        }

        let currentPage = mainPage;
        let currentToc = mainToc;
        const LIMITE_ALTURA_INDICE = 850;
        let pageCount = 1;
        const MAX_PAGES = 6;

        for (let i = 0; i < itens.length; i++) {
          const item = itens[i];
          currentToc.appendChild(item);
          const contentArea = currentPage.querySelector('.content-area');
          if (contentArea && contentArea.scrollHeight > LIMITE_ALTURA_INDICE) {
            currentToc.removeChild(item);
            if (pageCount >= MAX_PAGES) break;
            const nova = criarPaginaIndice(currentPage);
            currentPage = nova.pagina;
            currentToc = nova.toc;
            pageCount++;
            currentToc.appendChild(item);
          }
        }

        // Remover páginas de índice vazias que possam ter ficado
        container.querySelectorAll('.page-container').forEach(page => {
          const toc = page.querySelector('.toc-container');
          if (toc && !page.querySelector('.toc-item')) {
            page.remove();
          }
        });
      }

      setTimeout(() => sincronizarIndice(), 100);

      // CORREÇÃO: Removida lógica de .chapter-page-2

      if (isEditMode && selectedEl) {
         selectedEl.style.outline = '3px solid #4f46e5';
      }

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
      
      if (e.data.type === 'UNDO_HTML' || e.data.type === 'REDO_HTML') {
         const scrollY = window.scrollY;
         const selectedId = selectedEl ? selectedEl.id : null;
         document.getElementById('ebook-container').innerHTML = e.data.html;
         setTimeout(() => {
            executarRefluxoCompleto();
            requestAnimationFrame(() => {
               window.scrollTo(0, scrollY);
               if (selectedId) {
                  const el = document.getElementById(selectedId);
                  if (el) {
                     selectedEl = el;
                     el.style.outline = '3px solid #4f46e5';
                     const computed = window.getComputedStyle(el);
                     window.parent.postMessage({
                        type: 'ELEMENT_SELECTED',
                        id: el.id,
                        tagName: el.tagName.toLowerCase(),
                        text: el.innerHTML,
                        src: el.src,
                        bgImage: computed.backgroundImage !== 'none' ? computed.backgroundImage : undefined,
                        isBgTarget: el.classList.contains('page-container') || el.classList.contains('cap-img-overlay'),
                        textColor: rgbToHex(computed.color),
                        bgColor: rgbToHex(computed.backgroundColor),
                        fontSize: parseInt(computed.fontSize),
                        fontWeight: computed.fontWeight,
                        textAlign: computed.textAlign
                     }, '*');
                  }
               }
            });
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
            
            if (e.data.bgColor !== undefined) {
                target.dataset.rawHex = e.data.bgColor;
                let op = target.dataset.bgOp || (target.classList.contains('cap-overlay-box') ? '0.92' : '1');
                let hex = e.data.bgColor.replace('#','');
                if(hex.length === 3) hex = hex.split('').map(x => x+x).join('');
                let r = parseInt(hex.substring(0,2), 16) || 255;
                let g = parseInt(hex.substring(2,4), 16) || 255;
                let b = parseInt(hex.substring(4,6), 16) || 255;
                target.style.setProperty('background-color', \`rgba(\${r},\${g},\${b},\${op})\`, 'important');
            }
            if (e.data.bgOpacity !== undefined) {
                target.dataset.bgOp = e.data.bgOpacity;
                let hex = target.dataset.rawHex || rgbToHex(window.getComputedStyle(target).backgroundColor) || '#f5f5f5';
                hex = hex.replace('#','');
                if(hex.length === 3) hex = hex.split('').map(x => x+x).join('');
                let r = parseInt(hex.substring(0,2), 16) || 245;
                let g = parseInt(hex.substring(2,4), 16) || 245;
                let b = parseInt(hex.substring(4,6), 16) || 245;
                target.style.setProperty('background-color', \`rgba(\${r},\${g},\${b},\${e.data.bgOpacity})\`, 'important');
            }
            
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
      if (e.data.type === 'APPLY_GLOBAL_BG') {
         const color = e.data.color;
         const pages = document.querySelectorAll('.page-container');
         pages.forEach(page => {
            page.style.setProperty('background-color', color, 'important');
         });
         window.parent.postMessage({ type: 'HTML_SYNC', html: document.getElementById('ebook-container').innerHTML }, '*');
      }
      // CORREÇÃO: Removido TOGGLE_BG_2
    });  

    document.addEventListener('mouseover', (e) => {
      if (!isEditMode) return;
      const el = e.target.closest('p, h1, h2, h3, h4, blockquote, img, li, .page-container, .highlight-box, .concept-box, .cap-img-overlay, .cap-overlay-box, i');
      if (el && el !== selectedEl) el.style.outline = '2px dashed rgba(99,102,241,0.5)';
    });
    
    document.addEventListener('mouseout', (e) => {
      if (!isEditMode) return;
      const el = e.target.closest('p, h1, h2, h3, h4, blockquote, img, li, .page-container, .highlight-box, .concept-box, .cap-img-overlay, .cap-overlay-box, i');
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
      const el = e.target.closest('p, h1, h2, h3, h4, blockquote, img, li, .page-container, .highlight-box, .concept-box, .cap-img-overlay, .cap-overlay-box, i');
      
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
            isBgTarget: el.classList.contains('page-container') || el.classList.contains('cap-img-overlay'),
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
  const [historico, setHistorico] = useState<string[]>([]);
  const [futuro, setFuturo] = useState<string[]>([]);
  const [htmlAtual, setHtmlAtual] = useState<string>('');
  const [modoInspetor, setModoInspetor] = useState(false);
  const [elementoSelecionado, setElementoSelecionado] = useState<any>(null);
  const [statusApis, setStatusApis] = useState<{ texto: string; processing: boolean }>({
    texto: 'Aguardando Operação',
    processing: false,
  });
  const [recarregarIframe, setRecarregarIframe] = useState(true);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  // CORREÇÃO: Removido bg2Oculto

  // Configurações de estilo
  const [fontFamily, setFontFamily] = useState('Lato');
  const [tamanhoFonteBase, setTamanhoFonteBase] = useState('14pt');
  const [espacamentoLinhas, setEspacamentoLinhas] = useState('1.5');
  const [espacamentoParagrafo, setEspacamentoParagrafo] = useState('0.8em');
  const [recuoParagrafo, setRecuoParagrafo] = useState('0px');
  const [tipoBorda, setTipoBorda] = useState<'none' | 'single' | 'medium' | 'double-thin'>('none');
  
  const [corFundoPagina, setCorFundoPagina] = useState('#ffffff');
  const [corTextoDetalhes, setCorTextoDetalhes] = useState('#111827');
  
  const [alinhamentoCapitulo, setAlinhamentoCapitulo] = useState<'center' | 'flex-start' | 'flex-end'>('center');
  const [boxColorHex, setBoxColorHex] = useState('#1e3a8a');
  // CORREÇÃO: Removido boxOpacity duplicado (mantido apenas o que está com a capa)
  const [boxOpacity, setBoxOpacity] = useState('0.70');
  
  // CORREÇÃO: Novas cores padrão
  const [corFundoCapitulo, setCorFundoCapitulo] = useState('#0f172a'); // azul marinho escuro
  const [corRetanguloCapitulo, setCorRetanguloCapitulo] = useState('#15803d'); // verde elegante
  // CORREÇÃO: Removido usarImagemFundoCap

  // CORREÇÃO: Remover opção "simples" do estiloRodape
  const [estiloRodape, setEstiloRodape] = useState<'linha-superior' | 'centralizado-circulo' | 'centralizado'>('linha-superior');
  const [autorPosicao, setAutorPosicao] = useState<'esquerda' | 'topo'>('esquerda');
  const [autorFormato, setAutorFormato] = useState<'circulo' | 'retangulo'>('retangulo');

  // CORREÇÃO: Removidas variáveis do fundo da 2ª página
  // const [ativarBgSegundaPagina, ...] removido

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

  // CORREÇÃO: Array de ícones para troca
  const iconList = [
    'fa-leaf', 'fa-star', 'fa-lightbulb', 'fa-seedling', 'fa-anchor',
    'fa-crown', 'fa-feather', 'fa-gem', 'fa-tree', 'fa-mountain',
    'fa-compass', 'fa-sun', 'fa-moon', 'fa-cloud', 'fa-bolt',
    'fa-fire', 'fa-water', 'fa-wind', 'fa-earth', 'fa-rocket'
  ];
  const [iconIndex, setIconIndex] = useState(0);

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
      let line = lines[i].trim();
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
    return {
      bg: corFundoPagina,
      text: corTextoDetalhes,
      pri: corTextoDetalhes,
      sec: corTextoDetalhes,
      borda: corTextoDetalhes
    };
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

    clean = clean.replace(/<p\s+[^>]*>/gi, (match) => {
      if (/style\s*=|data-|class\s*=/i.test(match)) return match;
      return '<p>';
    });

    return clean.trim();
  }

  function getEstilosFormato() {
    return { width: '210mm', height: '297mm', padding: '22mm 20mm 25mm 20mm' };
  }

  function moldarApresentacaoHtml(rawHtml: string) {
    let clean = purificarHTML(rawHtml);
    clean = clean.replace(/<style id="ebook-dynamic-styles">[\s\S]*?<\/style>/gi, '');
    clean = clean.replace(/<p>(\s|&nbsp;)+/gi, '<p>');
    
    const conf = getEstilosFormato();
    const paleta = getPaletaObj();
    const opacidadeSegura = Math.round(parseFloat(boxOpacity || '0.70') * 100);

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
  --p-spacing: 0.8em;
  --text-indent: ${recuoParagrafo === '0px' ? '0' : recuoParagrafo};
  --cap-box-bg: color-mix(in srgb, ${corRetanguloCapitulo || '#15803d'} ${opacidadeSegura}%, transparent);
}

body {
  background-color: #e2e8f0; margin: 0; padding: 2rem 0; display: flex; flex-direction: column; align-items: center;
  font-family: var(--font-body); color: var(--color-text);
  counter-reset: ebook-page;
}

#ebook-container { display: flex; flex-direction: column; align-items: center; width: 100%; }
${indexShowSubtopics ? '' : '.toc-subtopic { display: none !important; }'}

#ebook-container * {
  max-width: 100% !important; box-sizing: border-box !important; overflow-wrap: break-word !important; word-break: break-word !important;
}

img.chapter-banner-img { width: 100% !important; height: 300px !important; object-fit: cover !important; border-radius: 8px !important; margin: 15px 0 !important; display: block !important; }
h2.chapter-title-inline { margin-top: 25px !important; margin-bottom: 15px !important; font-family: var(--font-heading) !important; font-size: 1.8rem !important; }
.page-container > h3.subtopic-title:first-of-type, .page-container > .page-header + h3.subtopic-title { margin-top: 0 !important; }

.page-container, .page-cover-img, .page-cover-pura, .page-cover-text, .legal-page, .author-page, .page-extra,
.cap-img-overlay, .cap-box-rounded, .cap-img-pura {
  background-color: var(--color-bg) !important;
  width: ${conf.width} !important; height: ${conf.height} !important;
  min-width: ${conf.width} !important; min-height: ${conf.height} !important; max-width: ${conf.width} !important; max-height: ${conf.height} !important;
  flex-shrink: 0 !important; padding: ${conf.padding}; margin: 0 auto 20px auto; box-sizing: border-box;
  position: relative; overflow: hidden !important; page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid;
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); counter-increment: ebook-page;
}

.chapter-text-page { padding-top: 25mm !important; }

.legal-page { display: flex; flex-direction: column; justify-content: flex-start; align-items: center; text-align: center; padding: 35mm 25mm !important; }
.legal-page h2 { font-size: 2rem; margin-bottom: 2rem; }
.legal-page p { font-size: 1rem; line-height: 1.8; margin-bottom: 1.2rem; text-align: justify; }

.page-container::after, .cap-img-overlay::after {
  content: ''; position: absolute; top: 6mm; left: 6mm; right: 6mm; bottom: 6mm; pointer-events: none; z-index: 50;
  border: ${tipoBorda === 'single' ? '1px solid var(--color-border)' : tipoBorda === 'medium' ? '2px solid var(--color-border)' : tipoBorda === 'double-thin' ? '3px double var(--color-border)' : 'none'};
}
.page-cover-img::after, .cap-img-overlay::after { display: none !important; }

#ebook-container > .page-container:first-child .page-header, #ebook-container > .page-container:first-child .page-footer,
.page-cover-img .page-header, .page-cover-img .page-footer, .cap-box-rounded .page-header, .cap-box-rounded .page-footer {
  display: none !important; opacity: 0 !important; visibility: hidden !important;
}

.page-cover-img {
  display: flex !important;
  flex-direction: column;
  justify-content: center !important;
  align-items: center !important;
  text-align: center;
  background: url('${imagemCapaUrl}') center/cover no-repeat !important;
  color: #ffffff !important;
}
.page-cover-img h1 {
  font-size: 3.5rem;
  font-weight: 800;
  margin: 0 0 0.5rem 0;
  color: #ffffff !important;
  text-shadow: 0 0 20px rgba(0,0,0,0.9), 0 2px 10px rgba(0,0,0,0.8);
}
.page-cover-img p {
  font-size: 1.2rem;
  opacity: 0.9;
  color: #ffffff !important;
  text-shadow: 0 0 15px rgba(0,0,0,0.9);
}

.cap-img-overlay { 
  position: absolute !important; top: 0; left: 0; right: 0; bottom: 0;
  background-size: cover !important;
  background-position: center !important;
  background-color: ${corFundoCapitulo || '#0f172a'} !important;
  display: flex !important; flex-direction: column !important; justify-content: ${alinhamentoCapitulo} !important; align-items: center !important; 
  padding: 15% 10% !important; z-index: 30; page-break-inside: avoid; break-inside: avoid;
}
.cap-img-overlay::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.45)); z-index: 31; }
.cap-img-overlay .cap-overlay-box { 
  background: var(--cap-box-bg) !important; backdrop-filter: blur(10px); padding: 50px 40px !important; border-radius: 12px !important; 
  box-shadow: 0 20px 40px rgba(0,0,0,0.4); width: 100% !important; max-width: 85% !important; text-align: center !important; z-index: 32; position: relative;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
}
.cap-img-overlay h1.chapter-title-exclusive {
  margin: 0 !important;
  color: #ffffff !important;
  font-size: 2.2rem !important;
  line-height: 1.2 !important;
  font-weight: 700;
  font-family: var(--font-heading);
  text-transform: none !important;
  text-shadow: 0 0 20px rgba(0,0,0,0.7);
}
.cap-overlay-box i {
  display: block;
  font-size: 3rem !important;
  margin-bottom: 1rem !important;
  color: #ffffff;
  text-shadow: 0 0 15px rgba(0,0,0,0.5);
}

.page-header { position: absolute; top: 12mm; left: 18mm; right: 18mm; display: flex; justify-content: space-between; align-items: flex-end; font-size: 8pt; color: var(--color-primary); opacity: 0.8; border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 5px; font-weight: 700; text-transform: uppercase; z-index: 20; letter-spacing: 0.5px; }
.page-footer { position: absolute; bottom: 10mm; left: 18mm; right: 18mm; font-size: 9pt; color: var(--color-primary); font-weight: 600; z-index: 20; opacity: 0.8; ${estiloRodape.includes('centralizado') ? 'display: flex; justify-content: center; align-items: center;' : 'display: flex; justify-content: space-between; align-items: center;'} ${estiloRodape === 'linha-superior' ? 'border-top: 1px solid var(--color-primary); padding-top: 8px;' : ''} }
.page-number { margin-left: auto !important; }
.page-number::after { content: counter(ebook-page); }

h1, h2, h3, h4 { font-family: var(--font-heading); color: var(--color-primary); }
h1 { font-weight: 800; font-size: 2.2rem; margin-top: 0; margin-bottom: 1em; text-align: center; }
h2:not(.chapter-title-inline) { font-weight: 700; font-size: 1.8rem; margin-top: 1.5rem; margin-bottom: 1.5rem; }

h3 {
  font-size: 1.4rem !important;
  font-weight: 800 !important;
  margin-top: 1.2rem;
  margin-bottom: 1.5rem !important;
  border-bottom: none !important;
}

p { font-size: ${tamanhoFonteBase} !important; line-height: var(--line-spacing) !important; margin-top: 0 !important; margin-bottom: var(--p-spacing) !important; text-align: justify !important; text-indent: var(--text-indent) !important; hyphens: auto; -webkit-hyphens: auto; max-width: 100% !important; box-sizing: border-box !important; }

blockquote { font-style: italic; color: var(--color-text); border-left: 4px solid var(--color-primary); background: color-mix(in srgb, var(--color-text) 5%, transparent); padding: 12px 18px; margin: 1rem 0; font-size: ${tamanhoFonteBase}; border-radius: 0 8px 8px 0; }
.highlight-box { background: color-mix(in srgb, var(--color-text) 8%, transparent); border-left: 4px solid var(--color-primary); padding: 12px 18px; border-radius: 8px; margin: 1rem 0; font-weight: 500; font-size: ${tamanhoFonteBase}; display: flex; align-items: center; gap: 12px; }

.concept-box {
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
  border: 2px solid var(--color-primary);
  border-radius: 12px;
  padding: 1rem 1.5rem;
  margin: 1.5rem 0 1rem 0;
  text-align: center;
  font-weight: 500;
  font-size: ${tamanhoFonteBase};
  color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.concept-box i {
  display: block;
  font-size: 2rem !important;
  margin-bottom: 0.5rem;
  color: var(--color-primary);
}

img { max-width: 100%; height: auto; max-height: 35vh; border-radius: 0.5rem; margin: 1rem auto; display: block; object-fit: cover; }
.toc-container { display: flex; flex-direction: column; width: 100%; margin: 1rem 0; z-index: 60; position: relative; }
.toc-item { display: flex; align-items: baseline; justify-content: space-between; width: 100%; text-decoration: none; color: var(--color-text); font-family: var(--font-body) !important; font-size: ${tamanhoFonteBase} !important; padding: 6px 0; }
.toc-dots { flex-grow: 1; border-bottom: 2px dotted var(--color-primary); margin: 0 8px; opacity: 0.3; }
.toc-page-num { font-weight: bold; color: var(--color-primary); }

.toc-subtopic {
  font-size: 0.75em !important;
  line-height: 1 !important;
  padding: 2px 0 !important;
  margin-bottom: 2px !important;
}

.author-page { display: block; }
.author-section { width: 100%; margin-top: 1.5rem; display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; }
.author-photo { flex-shrink: 0; object-fit: cover; border: 3px solid rgba(255,255,255,0.8); }

@page { size: A4 portrait; margin: 0; }
@media print {
  html, body { background: #ffffff !important; padding: 0 !important; margin: 0 !important; display: block !important; width: ${conf.width} !important; height: auto !important; }
  .page-container, .cap-img-overlay { width: ${conf.width} !important; height: ${conf.height} !important; margin: 0 !important; padding: ${conf.padding} !important; page-break-after: always !important; box-shadow: none !important; border: none !important; }
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
<meta id="meta-book-title" content="${livroTitulo}">
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
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const paragrafos = tempDiv.querySelectorAll('p');
    paragrafos.forEach(p => {
      let texto = p.textContent || '';
      texto = texto.replace(/\s+/g, ' ').trim();
      if (texto.length > 600) {
        const mid = Math.min(450, texto.length);
        let breakPos = texto.lastIndexOf('. ', mid);
        if (breakPos === -1) breakPos = texto.lastIndexOf('? ', mid);
        if (breakPos === -1) breakPos = texto.lastIndexOf('! ', mid);
        if (breakPos !== -1) {
          const p1 = texto.substring(0, breakPos + 1);
          const p2 = texto.substring(breakPos + 2);
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
    if (!htmlBase || !htmlBase.includes('id="ebook-container"')) return htmlBase + '\n' + htmlNovo;

    let cleanNovo = htmlNovo;
    const bodyMatch = cleanNovo.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) cleanNovo = bodyMatch[1];
    cleanNovo = cleanNovo.replace(/<!DOCTYPE[^>]*>/gi, '').replace(/<\/?html[^>]*>/gi, '').trim();

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlBase, 'text/html');
        const container = doc.getElementById('ebook-container');
        if (container) {
            container.insertAdjacentHTML('beforeend', cleanNovo);
            return '<!DOCTYPE html>\n<html lang="pt-BR">\n' + doc.documentElement.innerHTML + '\n</html>';
        }
    } catch (e) {
        console.error('Erro na injeção segura, usando fallback');
    }

    const lastDivIndex = htmlBase.lastIndexOf('</div>');
    if (lastDivIndex !== -1) {
      return htmlBase.substring(0, lastDivIndex) + '\n' + cleanNovo + '\n' + htmlBase.substring(lastDivIndex);
    }
    return htmlBase + '\n' + cleanNovo;
  }

  function aplicarHtmlNovo(htmlCru: string, isInjetar: boolean, recarregar: boolean = true) {
    let novoConteudo = purificarHTML(htmlCru);
    novoConteudo = ajustarParagrafos(novoConteudo);

    let htmlFinal = '';
    if (isInjetar) {
      htmlFinal = injetarHtmlNoFinal(htmlAtual || '', novoConteudo);
    } else {
      htmlFinal = moldarApresentacaoHtml(novoConteudo);
    }

    setHistorico((prev) => [...prev, htmlAtual]);
    setFuturo([]);
    setHtmlAtual(htmlFinal);
    localStorage.setItem('ebook_draft_html', htmlFinal);

    if (recarregar && previewFrameRef.current) {
      setRecarregarIframe(true);
      const script = getScriptPreview(indexShowSubtopics);
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
  <div class="content-area" style="display: flex; flex-direction: column; justify-content: flex-start; height: 100%; text-align: justify; font-size: 11px; line-height: 1.5; padding: 0 10px;">
    
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
    if (estiloRodape === 'linha-superior') {
      regraRodape = `<span>${livroAutores}</span>${numSpan}`;
    } else {
      regraRodape = `${numSpan}`;
    }

    return `
    <div class="page-container author-page">
      <div class="page-header"><span>${livroTitulo || 'Título do Livro'}</span><span>SOBRE O AUTOR</span></div>
      <h2 id="sobre-o-autor" class="chapter-title-inline" style="opacity:0; position:absolute; z-index:-1;">Sobre o Autor</h2>
      <div class="author-section layout-${autorPosicao}">
        <img src="https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png" class="author-photo ${autorFormato}" alt="${livroAutores || 'Autor'}">
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

    setHistorico((prev) => [...prev, htmlAtual]);
    setFuturo([]);
    const htmlFinal = moldarApresentacaoHtml(novoHtml);
    setHtmlAtual(htmlFinal);
    localStorage.setItem('ebook_draft_html', htmlFinal);
    if (previewFrameRef.current) {
      previewFrameRef.current.srcdoc = htmlFinal + getScriptPreview(indexShowSubtopics);
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

  function desfazer() {
    if (historico.length === 0) return;
    const novoHistorico = [...historico];
    const estadoAtual = htmlAtual;
    const estadoAnterior = novoHistorico.pop();
    if (estadoAnterior) {
      setFuturo((prev) => [estadoAtual, ...prev]);
      setHistorico(novoHistorico);
      setHtmlAtual(estadoAnterior);
      localStorage.setItem('ebook_draft_html', estadoAnterior);
      if (previewFrameRef.current) {
        previewFrameRef.current.contentWindow.postMessage({ type: 'UNDO_HTML', html: estadoAnterior }, '*');
      }
    }
  }

  function refazer() {
    if (futuro.length === 0) return;
    const novoFuturo = [...futuro];
    const estadoAtual = htmlAtual;
    const estadoProximo = novoFuturo.shift();
    if (estadoProximo) {
      setHistorico((prev) => [...prev, estadoAtual]);
      setFuturo(novoFuturo);
      setHtmlAtual(estadoProximo);
      localStorage.setItem('ebook_draft_html', estadoProximo);
      if (previewFrameRef.current) {
        previewFrameRef.current.contentWindow.postMessage({ type: 'REDO_HTML', html: estadoProximo }, '*');
      }
    }
  }

  function aplicarCorGlobal() {
    if (!elementoSelecionado || !elementoSelecionado.bgColor) return;
    if (previewFrameRef.current && previewFrameRef.current.contentWindow) {
      previewFrameRef.current.contentWindow.postMessage({
        type: 'APPLY_GLOBAL_BG',
        color: elementoSelecionado.bgColor,
      }, '*');
    }
    (window as any).showNotification('Cor aplicada a todas as páginas!', 'success');
  }

  // CORREÇÃO: Função para trocar ícone ciclicamente
  function trocarIcone() {
    if (!elementoSelecionado || elementoSelecionado.tagName !== 'i') return;
    const currentIndex = iconIndex % iconList.length;
    const newClass = iconList[currentIndex];
    // Atualiza o elemento no iframe
    if (previewFrameRef.current && previewFrameRef.current.contentWindow) {
      previewFrameRef.current.contentWindow.postMessage({
        type: 'UPDATE_ELEMENT',
        id: elementoSelecionado.id,
        text: `<i class="fas ${newClass}"></i>`,
        forceTextUpdate: true,
      }, '*');
    }
    setElementoSelecionado((prev: any) => ({ ...prev, text: newClass }));
    setIconIndex((prev) => (prev + 1) % iconList.length);
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

    setHistorico((prev) => [...prev, htmlAtual]);
    setFuturo([]);
    const paleta = getPaletaObj();

    const instrucao = `Você é um parser estrito de HTML. Receberá a tag HTML exata selecionada pelo usuário.
Sua tarefa é modificar APENAS o conteúdo interno desta tag, mantendo a tag e seus atributos exatos, a menos que o pedido explicitamente solicite mudança de classe ou estilo.

REGRAS ESTRITAS:
1. Você deve retornar UNICAMENTE a mesma tag com o texto interno alterado.
2. NÃO adicione containers, NÃO altere elementos adjacentes, NÃO mude a hierarquia.
3. NÃO remova ou adicione atributos, a menos que o pedido especifique (ex: "mude a cor para azul").
4. NÃO envolva a resposta em markdown ou comentários.
5. Se o elemento for uma <div class="page-container">, preserve OBRIGATORIAMENTE o cabeçalho (page-header) e o rodapé (page-footer) intactos. Não os apague.

Use as cores do tema atual:
- Cor primária: ${paleta.pri}
- Cor secundária: ${paleta.sec}
- Cor de texto: ${paleta.text}
- Cor de fundo: ${paleta.bg}
- Cor de borda: ${paleta.borda}

Pedido do usuário: "${comando}"

HTML do elemento selecionado:
"""${elementoSelecionado.outerHTML}"""

Retorne APENAS o HTML puro do elemento modificado, sem texto adicional.`;

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
    const htmlCompleto = moldarApresentacaoHtml(html);
    const scriptInjetado = getScriptPreview(indexShowSubtopics);
    
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
      setHistorico([]);
      setFuturo([]);
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
  // FUNÇÃO DE INSTRUÇÕES BASE (ESTRUTURA DE 4 PÁGINAS PREMIUM)
  // ============================================================
  function obterInstrucoesBase(opts?: { numeroCapitulo?: number, tema?: string }) {
    const numero = opts?.numeroCapitulo || 1;
    const iconeSugerido = opts?.tema ? `fa-${opts.tema.toLowerCase()}` : 'fa-book';

    const regrasCompletas = `
  DIRETRIZES DE FORMATAÇÃO E SEGURANÇA:
  1. GERE APENAS HTML PURO. 
  2. VOCÊ ESTÁ ESTRITAMENTE PROIBIDO de gerar qualquer tag <div class="page-container">, <div class="page-header"> ou <div class="page-footer">. O nosso sistema injeta isso automaticamente. Envie apenas o conteúdo.
  
  3. ESTRUTURA RIGOROSA DO CAPÍTULO (Siga EXATAMENTE esta ordem para formar 4 páginas completas):
  
     <!-- PÁGINA 1: A Capa do Capítulo (Imagem 100% de fundo com o Título no Box) -->
     <div class="cap-img-overlay" data-unsplash="[PALAVRA_EM_INGLES_AQUI]">
        <div class="cap-overlay-box">
           <i class="fas fa-${iconeSugerido} text-4xl mb-4"></i>
           <h1 class="chapter-title-exclusive">Capítulo ${numero}: [Nome do Capítulo]</h1>
        </div>
     </div>

     <!-- PÁGINA 2: O Despertar (Conteúdo Inicial) -->
     <h3 class="subtopic-title">[Subtítulo Inicial]</h3>
     <p>[Parágrafo 1 - Aprox 50 palavras]</p>
     <p>[Parágrafo 2 - Aprox 50 palavras]</p>
     <p>[Parágrafo 3 - Aprox 50 palavras]</p>
     <p>[Parágrafo 4 - Aprox 50 palavras]</p>
     <div class="concept-box"><i class="fas fa-lightbulb"></i> [Insira aqui uma IDEIA CENTRAL ou CONCEITO-CHAVE para concluir a página]</div>

     <!-- PÁGINA 3: O Aprofundamento (Meio) -->
     <h3 class="subtopic-title">[Subtítulo do Meio]</h3>
     <p>[Parágrafo 5 - Aprox 60 palavras]</p>
     <p>[Parágrafo 6 - Aprox 60 palavras]</p>
     <p>[Parágrafo 7 - Aprox 60 palavras]</p>
     <p>[Parágrafo 8 - Aprox 60 palavras]</p>
     <div class="highlight-box"><i class="fas fa-highlighter"></i> [Insira aqui um TEXTO RELEVANTE ou DICA PRÁTICA para fechar a página]</div>

     <!-- PÁGINA 4: A Concretização (Fim do Capítulo) -->
     <h3 class="subtopic-title">[Subtítulo Final]</h3>
     <p>[Parágrafo 9 - Aprox 70 palavras]</p>
     <p>[Parágrafo 10 - Aprox 70 palavras]</p>
     <p>[Parágrafo 11 - Aprox 70 palavras]</p>
     <p>[Parágrafo 12 - Aprox 70 palavras]</p>
     <blockquote>[Insira aqui uma REFLEXÃO PROFUNDA ou CONSELHO FINAL impactante para fechar a última página]</blockquote>

  4. REGRA DE SEGURANÇA (LEIA COM ATENÇÃO): 
     - PROIBIÇÃO ABSOLUTA: NÃO mostre o seu processo de pensamento, rascunhos, ou contagem de palavras (como "Word count check").
     - DEVOLVA APENAS AS TAGS HTML. NÃO escreva NENHUM texto solto fora das tags.
  5. IMAGENS DINÂMICAS: Na tag <div class="cap-img-overlay">, substitua [PALAVRA_EM_INGLES_AQUI] por UMA palavra em inglês relacionada ao tema para o sistema buscar a foto depois. Exemplo: data-unsplash="business".
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

    // CORREÇÃO: Extrair último trecho para continuidade
    let ultimoTrecho = '';
    if (currentHtml) {
      // Extrair os últimos 2 parágrafos do conteúdo (ignorando tags)
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = currentHtml;
      const paragrafos = tempDiv.querySelectorAll('p');
      if (paragrafos.length >= 2) {
        const ultimos = Array.from(paragrafos).slice(-2);
        ultimoTrecho = ultimos.map(p => p.textContent?.trim() || '').join(' ');
      } else if (paragrafos.length === 1) {
        ultimoTrecho = paragrafos[0].textContent?.trim() || '';
      }
    }

    let instrucao = `Você vai CONTINUAR a escrita de um e-book, gerando EXATAMENTE 3 CAPÍTULOS completos.
    Cada capítulo deve seguir o molde de 3 páginas fornecido abaixo.
    Use os números de capítulo: ${proximoNumero}, ${proximoNumero + 1}, ${proximoNumero + 2}.
    ATENÇÃO: Não pule números. Respeite rigorosamente a ordem (imagem primeiro, depois título).

    MOLDE PARA CADA CAPÍTULO:
    ${cap1.regrasCompletas}
    ${cap2.regrasCompletas}
    ${cap3.regrasCompletas}

    A sua resposta deve conter APENAS os blocos HTML dos 3 capítulos acima preenchidos, sem repetir cabeçalhos ou rodapés. Não escreva "Conclusão".`;

    // CORREÇÃO: Adicionar modo rigoroso se selecionado
    if (modoConteudo === 'rigoroso') {
      instrucao += `\n\nO usuário escolheu o modo RIGOROSO. Você deve manter 95% do texto original fornecido intacto. Faça apenas correções ortográficas, ajuste pontuações, concorde verbos e gere os Subtítulos exigidos pelo modelo para que a estrutura encaixe, mas NUNCA invente parágrafos novos ou fuja do texto base.`;
    }

    // CORREÇÃO: Adicionar contexto de continuação
    if (ultimoTrecho) {
      instrucao += `\n\nContinue o raciocínio a partir deste último trecho gerado: "${ultimoTrecho}"`;
    }

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

    if (htmlAtual.includes('id="conclusao"')) {
      (window as any).showNotification('O e-book já está finalizado! Use os botões normais para adicionar capítulos.', 'error');
      return;
    }

    const hasChapters = htmlAtual.includes('cap-img-overlay') || /Capítulo\s*\d+/i.test(htmlAtual);
    if (!hasChapters) {
      (window as any).showNotification('Você precisa adicionar pelo menos um capítulo antes de finalizar.', 'error');
      return;
    }

    const instrucao = `Você vai FINALIZAR a escrita do e-book.
    DIRETRIZES:
      1. PROIBIÇÃO ABSOLUTA: A sua resposta deve conter APENAS tags HTML soltas (H2, H3, P). NÃO crie <div class="page-container">, NÃO crie cabeçalhos e NÃO crie rodapés.
      2. MOLDE DE CONCLUSÃO:
      <h2 id="conclusao" class="chapter-title-inline"><i class="fas fa-flag-checkered"></i> Conclusão</h2>
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
        previewFrameRef.current.srcdoc = htmlFinal + getScriptPreview(indexShowSubtopics);
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
          previewFrameRef.current.srcdoc = htmlAtualizado + getScriptPreview(indexShowSubtopics);
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
          setHistorico((prev) => {
            if (prev.length > 0 && prev[prev.length - 1] === htmlLimpo) return prev;
            return [...prev, htmlAtual];
          });
          setFuturo([]);
          setHtmlAtual(htmlLimpo);
          localStorage.setItem('ebook_draft_html', htmlLimpo);
          setRecarregarIframe(false);
        } else {
          setHistorico((prev) => [...prev, htmlAtual]);
          setFuturo([]);
          setHtmlAtual(htmlLimpo);
          localStorage.setItem('ebook_draft_html', htmlLimpo);
          setRecarregarIframe(true);
          if (previewFrameRef.current) {
            previewFrameRef.current.srcdoc = htmlLimpo + getScriptPreview(indexShowSubtopics);
          }
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [modoInspetor, htmlAtual]);

  // Recarregar iframe apenas quando necessário
  useEffect(() => {
    if (recarregarIframe && htmlAtual && previewFrameRef.current) {
      previewFrameRef.current.srcdoc = htmlAtual + getScriptPreview(indexShowSubtopics);
    }
  }, [htmlAtual, recarregarIframe]);

  // Reaplicar estilos ao mudar configurações visuais
  useEffect(() => {
    if (htmlAtual) {
      const htmlFinal = moldarApresentacaoHtml(htmlAtual);
      setHtmlAtual(htmlFinal);
      localStorage.setItem('ebook_draft_html', htmlFinal);
      setRecarregarIframe(true);
    }
  }, [
    fontFamily, tamanhoFonteBase, tipoBorda, estiloRodape, 
    alinhamentoCapitulo, autorPosicao, autorFormato,
    boxColorHex, boxOpacity, corFundoPagina, corTextoDetalhes,
    corFundoCapitulo, corRetanguloCapitulo
    // recuoParagrafo removido para evitar reflow desnecessário
  ]);

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
                          disabled={htmlAtual !== '' || etapaAtual > 0}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  
                  <div className="space-y-4 mb-4">
                    <div>
                      <label className="input-label text-[9px]">Cor de Fundo das Páginas</label>
                      <input
                        type="color"
                        value={corFundoPagina}
                        onChange={(e) => setCorFundoPagina(e.target.value)}
                        className="w-full h-12 rounded cursor-pointer border border-slate-200 p-1"
                      />
                    </div>
                    <div>
                      <label className="input-label text-[9px]">Cor Global dos Textos e Detalhes</label>
                      <input
                        type="color"
                        value={corTextoDetalhes}
                        onChange={(e) => setCorTextoDetalhes(e.target.value)}
                        className="w-full h-12 rounded cursor-pointer border border-slate-200 p-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="input-label text-[9px]">Rodapé da Página</label>
                      <select
                        value={estiloRodape}
                        onChange={(e: any) => setEstiloRodape(e.target.value)}
                        className="input-standard text-[10px]"
                      >
                        <option value="linha-superior">Linha Superior + Autor + Num</option>
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
                        <option value="0px">Sem recuo (0px)</option>
                        <option value="40px">Recuo Premium (40px)</option>
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
                      <label className="input-label text-[9px]">Alinhamento do Título (Capa Cap.)</label>
                      <select
                        value={alinhamentoCapitulo}
                        onChange={(e: any) => setAlinhamentoCapitulo(e.target.value)}
                        className="input-standard text-[10px]"
                      >
                        <option value="center">Meio (Padrão)</option>
                        <option value="flex-start">Topo</option>
                        <option value="flex-end">Base</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="input-label text-[9px] flex justify-between">Fundo do Retângulo <span className="text-slate-400">Transparência</span></label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={boxColorHex}
                          onChange={(e) => setBoxColorHex(e.target.value)}
                          className="w-10 h-8 rounded cursor-pointer border-none flex-shrink-0"
                        />
                        <input
                          type="range"
                          min="0" max="1" step="0.05" value={boxOpacity}
                          onChange={(e) => setBoxOpacity(e.target.value)}
                          className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      </div>
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

                {/* CORREÇÃO: Removida seção "Fundo da 2ª Página" */}

                <div className="panel-section">
                  <label className="input-label text-indigo-600 mb-3">Customização da Capa do Capítulo</label>
                  <div className="space-y-3">
                    <div>
                      <label className="input-label text-[9px]">Cor de Fundo da Capa</label>
                      <input
                        type="color"
                        value={corFundoCapitulo}
                        onChange={(e) => setCorFundoCapitulo(e.target.value)}
                        className="w-full h-10 rounded cursor-pointer border border-slate-200 p-1"
                      />
                    </div>
                    <div>
                      <label className="input-label text-[9px]">Cor do Retângulo (Box)</label>
                      <input
                        type="color"
                        value={corRetanguloCapitulo}
                        onChange={(e) => setCorRetanguloCapitulo(e.target.value)}
                        className="w-full h-10 rounded cursor-pointer border border-slate-200 p-1"
                      />
                    </div>
                  </div>
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
                    <p className="text-xs font-medium text-slate-400">Clique em textos, títulos, imagens, ícones ou fundos na página ao lado.</p>
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

                      {/* CORREÇÃO: Controle de ícone com botão "Trocar Ícone" */}
                      {elementoSelecionado.tagName === 'i' && (
                        <div className="pt-3 border-t border-slate-100 space-y-3">
                          <button
                            onClick={trocarIcone}
                            className="w-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-[9px] uppercase py-2 rounded transition"
                          >
                            <i className="fas fa-exchange-alt mr-1"></i> Trocar Ícone
                          </button>
                          <button
                            onClick={() => {
                              if (previewFrameRef.current && previewFrameRef.current.contentWindow) {
                                previewFrameRef.current.contentWindow.postMessage({
                                  type: 'DELETE_ELEMENT',
                                  id: elementoSelecionado.id,
                                }, '*');
                              }
                            }}
                            className="w-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-[9px] uppercase py-2 rounded transition"
                          >
                            <i className="fas fa-trash mr-1"></i> Apagar Ícone
                          </button>
                        </div>
                      )}

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
                              {elementoSelecionado.isBgTarget && (
                                <button
                                  onClick={aplicarCorGlobal}
                                  className="w-full mt-3 bg-purple-50 border border-purple-200 text-purple-700 font-bold text-[9px] uppercase py-2 rounded transition hover:bg-purple-100"
                                >
                                  <i className="fas fa-fill-drip mr-1"></i> Aplicar cor a todas as páginas
                                </button>
                              )}
                              {elementoSelecionado.isBgTarget && (
                                <div className="mt-3">
                                  <label className="input-label text-[9px]">Cor de Fundo da Capa</label>
                                  <input
                                    type="color"
                                    value={corFundoCapitulo}
                                    onChange={(e) => {
                                      setCorFundoCapitulo(e.target.value);
                                      if (previewFrameRef.current && previewFrameRef.current.contentWindow) {
                                        previewFrameRef.current.contentWindow.postMessage({
                                          type: 'UPDATE_ELEMENT',
                                          id: elementoSelecionado.id,
                                          bgColor: e.target.value,
                                        }, '*');
                                      }
                                    }}
                                    className="w-full h-10 rounded cursor-pointer border border-slate-200 p-1"
                                  />
                                </div>
                              )}
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

                      {!elementoSelecionado.isBgTarget && !isTextElement && elementoSelecionado.tagName !== 'img' && elementoSelecionado.tagName !== 'i' && (
                        <div className="pt-3 border-t border-slate-100">
                          <div className="text-center p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-[10px] leading-relaxed">
                            <i className="fas fa-layer-group mb-1.5 text-indigo-400 text-lg block"></i>
                            <strong>Container Estrutural</strong><br/>
                            A edição manual de texto está desabilitada aqui. Use a <strong>IA acima</strong> para alterar toda a página ou clique num parágrafo, título ou ícone.
                          </div>
                        </div>
                      )}
                    </div>

                    {elementoSelecionado.tagName !== 'img' && (
                      <div className="panel-section grid grid-cols-2 gap-4 border-t border-slate-100 mt-3">
                        <div>
                          <label className="input-label mb-2 text-[9px] flex justify-between">Cor Fundo (Box) <span className="text-slate-400">Opacidade</span></label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={elementoSelecionado.bgColor?.length === 7 ? elementoSelecionado.bgColor : '#f5f5f5'}
                              onChange={(e) => atualizarElemento('bgColor', e.target.value)}
                              className="w-10 h-8 rounded cursor-pointer border-none flex-shrink-0"
                            />
                            <input
                              type="range"
                              min="0" max="1" step="0.05" defaultValue="0.92"
                              onChange={(e) => atualizarElemento('bgOpacity', e.target.value)}
                              className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                          </div>
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
              <button
                onClick={desfazer}
                disabled={historico.length === 0}
                className="bg-yellow-50 hover:bg-yellow-100 border border-yellow-300 text-yellow-700 font-bold px-4 py-2 rounded-lg text-xs shadow-sm transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="fas fa-undo"></i> Desfazer
              </button>
              <button
                onClick={refazer}
                disabled={futuro.length === 0}
                className="bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-700 font-bold px-4 py-2 rounded-lg text-xs shadow-sm transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="fas fa-redo"></i> Refazer
              </button>
              {/* CORREÇÃO: Removido botão toggle do fundo 2ª página */}
            </div>
            <div className="flex items-center gap-3">
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