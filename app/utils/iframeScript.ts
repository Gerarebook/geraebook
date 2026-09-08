export function getScriptPreview(indexShowSubtopics: boolean) {
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

    // ================================================================
    // NOVA VERSÃO DO REFLUXO – À PROVA DE FALHAS
    // ================================================================
    function executarRefluxoCompleto() {
      if (observer) observer.disconnect();

      const currentScrollY = window.scrollY;
      const container = document.getElementById('ebook-container');
      if (!container) return;

      // --- AUTO-CURA: conserta HTML quebrado da IA (mantido) ---
      container.querySelectorAll('.cap-img-overlay').forEach(overlay => {
        let next = overlay.nextElementSibling;
        while (next && (next.classList?.contains('cap-overlay-box') || next.tagName === 'H1')) {
          overlay.appendChild(next);
          next = overlay.nextElementSibling;
        }
        let box = overlay.querySelector('.cap-overlay-box');
        if (!box) {
          box = document.createElement('div');
          box.className = 'cap-overlay-box';
          while (overlay.firstChild && overlay.firstChild !== box) {
            box.appendChild(overlay.firstChild);
          }
          overlay.appendChild(box);
        }
      });

      // --- Atualiza imagens de capa (mantido) ---
      container.querySelectorAll('.cap-img-overlay').forEach(overlay => {
        let bg = overlay.style.backgroundImage || '';
        if (overlay.dataset.unsplash && (bg === '' || bg === 'none' || bg.includes('initial') || bg === '')) {
          const keyword = encodeURIComponent(overlay.dataset.unsplash.trim());
          const cacheBuster = Math.random().toString(36).substring(7);
          overlay.style.setProperty('background-image', \`url('https://images.unsplash.com/featured/1200x800/?\${keyword},abstract,texture,sig\${cacheBuster}')\`, 'important');
        }
      });

      // --- Título do livro para cabeçalho ---
      const metaTitle = document.getElementById('meta-book-title');
      let tituloDoLivro = metaTitle && metaTitle.getAttribute('content') ? metaTitle.getAttribute('content').toUpperCase().trim() : "";

      // --- Modelo do rodapé (mantido) ---
      let modeloFooter = '<span class="page-number"></span>';
      const footerExistente = container.querySelector('.page-footer');
      if (footerExistente) {
        modeloFooter = footerExistente.innerHTML;
      }

      // ================================================================
      // 1. SEPARAR PÁGINAS ESPECIAIS (CAPAS, LEGAL, AUTOR, EXTRA)
      // ================================================================
      const paginasEspeciais = [];
      const paginasNormais = [];
      container.querySelectorAll('.page-container, .page-cover-img, .page-cover-pura, .page-cover-text, [data-legal], .author-page, .page-extra').forEach(el => {
        const isSpecial = el.classList.contains('page-cover-img') ||
                          el.classList.contains('page-cover-pura') ||
                          el.classList.contains('page-cover-text') ||
                          el.hasAttribute('data-legal') ||
                          el.classList.contains('author-page') ||
                          el.classList.contains('page-extra');
        if (isSpecial) {
          paginasEspeciais.push(el);
        } else if (el.classList.contains('page-container')) {
          paginasNormais.push(el);
        }
      });

      // Remove todas as páginas especiais do container (guardamos para reinserir depois)
      paginasEspeciais.forEach(el => el.remove());

      // ================================================================
      // 2. DESEMPACOTAR PÁGINAS NORMAIS (sem perder nenhum nó)
      // ================================================================
      paginasNormais.forEach(p => {
        // Remove cabeçalho, rodapé e estilos de blindagem
        p.querySelectorAll('.page-header, .page-footer, style.cover-blind').forEach(l => l.remove());

        // Move todos os filhos da área de conteúdo (ou da própria página) para o container
        const area = p.querySelector('.content-area') || p;
        while (area.firstChild) {
          container.insertBefore(area.firstChild, p);
        }
        p.remove();
      });

      // ================================================================
      // 3. LIMPEZA LEVE (sem eliminar nós de texto)
      // ================================================================
      container.querySelectorAll('hr').forEach(hr => hr.remove());

      // Envolve nós de texto soltos em <p> (mantido)
      Array.from(container.childNodes).forEach(node => {
        if (node.nodeType === 3 && node.textContent.trim() !== '') {
          const p = document.createElement('p');
          p.textContent = node.textContent;
          container.insertBefore(p, node);
          node.remove();
        }
      });

      // Remove apenas parágrafos verdadeiramente vazios (sem conteúdo e sem filhos)
      container.querySelectorAll('p').forEach(p => {
        if (!p.textContent.trim() && !p.querySelector('img, br, *')) {
          p.remove();
        }
      });

      // ================================================================
      // 4. COLETAR ELEMENTOS DE CONTEÚDO (excluindo especiais)
      // ================================================================
      const elementosIA = Array.from(container.children).filter(el =>
        !el.classList.contains('page-container') &&
        !el.classList.contains('page-cover-img') &&
        !el.classList.contains('page-cover-pura') &&
        !el.classList.contains('page-cover-text') &&
        !el.hasAttribute('data-legal') &&
        !el.classList.contains('author-page') &&
        !el.classList.contains('page-extra') &&
        el.tagName !== 'STYLE' &&
        el.tagName !== 'SCRIPT'
      );

      // Move "Conclusão" para o final se existir (mantido)
      const indexConclusao = elementosIA.findIndex(el => el.id === 'conclusao' || (el.tagName === 'H1' && (el.textContent || '').toLowerCase().includes('conclusão')));
      if (indexConclusao !== -1) {
        const indexNovoCapitulo = elementosIA.findIndex((el, i) => i > indexConclusao && (el.tagName === 'H2' || el.classList.contains('cap-img-overlay')));
        if (indexNovoCapitulo !== -1) {
          const partesConclusao = elementosIA.splice(indexConclusao, indexNovoCapitulo - indexConclusao);
          elementosIA.push(...partesConclusao);
        }
      }

      // ================================================================
      // 5. MONTAGEM DE NOVAS PÁGINAS (com proteção para capas de capítulo)
      // ================================================================
      const LIMITE_ALTURA_TEXTO = 940;
      const paginasCriadas = [];

      function criarPaginaComHeaderFooter() {
        const novaPagina = document.createElement('div');
        novaPagina.className = 'page-container chapter-text-page';
        novaPagina.style.overflow = 'hidden';
        novaPagina.style.breakAfter = 'page';

        const header = document.createElement('div');
        header.className = 'page-header';
        header.innerHTML = '<span></span><span>' + tituloDoLivro + '</span>';
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

        // Insere antes do autor-page ou no final
        const endPage = container.querySelector('.author-page');
        if (endPage) {
          container.insertBefore(novaPagina, endPage);
        } else {
          container.appendChild(novaPagina);
        }
        paginasCriadas.push(novaPagina);
        return { pagina: novaPagina, areaTexto: contentArea };
      }

      function criarPaginaSemHeaderFooter() {
        const novaPagina = document.createElement('div');
        novaPagina.className = 'page-container chapter-text-page';
        novaPagina.style.overflow = 'hidden';
        novaPagina.style.breakAfter = 'page';

        const contentArea = document.createElement('div');
        contentArea.className = 'content-area';
        contentArea.style.display = 'flex';
        contentArea.style.flexDirection = 'column';
        contentArea.style.width = '100%';
        novaPagina.appendChild(contentArea);

        // Insere antes do autor-page ou no final
        const endPage = container.querySelector('.author-page');
        if (endPage) {
          container.insertBefore(novaPagina, endPage);
        } else {
          container.appendChild(novaPagina);
        }
        paginasCriadas.push(novaPagina);
        return { pagina: novaPagina, areaTexto: contentArea };
      }

      // Estado da montagem
      let paginaAtual = null;
      let areaAtual = null;

      // Função para iniciar uma nova página (com ou sem header/footer)
      function iniciarNovaPagina(comHeaderFooter = true) {
        if (comHeaderFooter) {
          const result = criarPaginaComHeaderFooter();
          paginaAtual = result.pagina;
          areaAtual = result.areaTexto;
        } else {
          const result = criarPaginaSemHeaderFooter();
          paginaAtual = result.pagina;
          areaAtual = result.areaTexto;
        }
      }

      // Inicia com uma página normal (com header/footer)
      if (elementosIA.length > 0) {
        iniciarNovaPagina(true);
      }

      for (let i = 0; i < elementosIA.length; i++) {
        const el = elementosIA[i];
        const ehCapaCapitulo = el.classList.contains('cap-img-overlay');

        // Decisão de quebra: se for capa de capítulo, sempre inicia página sem header/footer
        if (ehCapaCapitulo) {
          // Se a página atual não estiver vazia, finaliza e cria uma nova só para a capa
          if (areaAtual && areaAtual.children.length > 0) {
            // Salva a página atual e começa uma nova sem header/footer
            iniciarNovaPagina(false);
          } else if (!areaAtual) {
            iniciarNovaPagina(false);
          }
          // Adiciona a capa (e seus filhos já estão dentro dela)
          areaAtual.appendChild(el);
          // Bloqueia a página para que não receba mais nada (já que é capa)
          // e não precisa de header/footer
          continue;
        }

        // Para elementos normais, decidir quebra com base no tipo
        const deveQuebrar = (() => {
          if (!areaAtual || areaAtual.children.length === 0) return false;
          if (el.tagName === 'H1' || el.tagName === 'H2') return true;
          // Se já existe uma capa de capítulo na página, quebra
          if (areaAtual.querySelector('.cap-img-overlay')) return true;
          if (el.tagName === 'H3' && areaAtual.querySelectorAll('p, blockquote, ul, .highlight-box, .concept-box, img').length > 0) return true;
          return false;
        })();

        if (deveQuebrar) {
          iniciarNovaPagina(true);
        }

        // Adiciona o elemento à área atual
        areaAtual.appendChild(el);

        // Verifica se a página estourou (apenas para páginas com header/footer)
        if (paginaAtual.querySelector('.page-header') && areaAtual.scrollHeight > LIMITE_ALTURA_TEXTO) {
          // Remove o elemento que acabou de ser adicionado (causou estouro)
          areaAtual.removeChild(el);

          // Se a página tem apenas esse elemento, pode ser que ele seja muito grande
          if (areaAtual.children.length === 0) {
            // Tenta colocar o elemento em uma nova página sozinho
            iniciarNovaPagina(true);
            areaAtual.appendChild(el);
            // Se ainda estourar, mantém assim (não há o que fazer)
          } else {
            // Move o último elemento (que pode ser o que causou estouro) para uma nova página
            const ultimo = areaAtual.lastElementChild;
            // Se o último for um título ou bloco, pode ser melhor movê-lo junto
            let mover = ultimo;
            if (ultimo && (ultimo.tagName === 'H2' || ultimo.tagName === 'H3' || ultimo.tagName === 'BLOCKQUOTE')) {
              areaAtual.removeChild(ultimo);
              mover = ultimo;
            } else {
              // Se não, apenas cria nova página e adiciona o elemento atual
              mover = null;
            }

            iniciarNovaPagina(true);
            if (mover) areaAtual.appendChild(mover);
            areaAtual.appendChild(el);
          }
        }
      }

      // ================================================================
      // 6. REMOVER PÁGINAS VAZIAS (mas preservar capas)
      // ================================================================
      container.querySelectorAll('.page-container').forEach(page => {
        const area = page.querySelector('.content-area');
        if (!area) { page.remove(); return; }
        const hasText = area.textContent.trim().length > 0;
        const hasImg = area.querySelector('img') !== null;
        const hasOverlay = area.querySelector('.cap-img-overlay') !== null;
        if (!hasText && !hasImg && !hasOverlay) {
          page.remove();
        }
      });

      // ================================================================
      // 7. REINSERIR PÁGINAS ESPECIAIS NO INÍCIO (na ordem original)
      // ================================================================
      // Ordem esperada: capa principal, página legal, etc. Mantemos a ordem relativa.
      // Inserimos antes do primeiro elemento de conteúdo (que é a primeira página criada)
      const primeiroConteudo = container.querySelector('.page-container:not(.page-cover-*)');
      paginasEspeciais.reverse().forEach(el => {
        if (primeiroConteudo) {
          container.insertBefore(el, primeiroConteudo);
        } else {
          container.prepend(el);
        }
      });

      // ================================================================
      // 8. RECRIAR ÍNDICE (com numeração perfeita)
      // ================================================================
      sincronizarIndice();

      // ================================================================
      // 9. RESTAURAR ESTADO E OBSERVER
      // ================================================================
      if (isEditMode && selectedEl) {
        selectedEl.style.outline = '3px solid #4f46e5';
      }
      window.scrollTo(0, currentScrollY);

      setTimeout(() => {
        if (observer) observer.observe(container, { childList: true, subtree: true });
      }, 300);
    }

    // ================================================================
    // NOVA VERSÃO DO SINCROZINADOR DE ÍNDICE
    // ================================================================
    function sincronizarIndice() {
      const container = document.getElementById('ebook-container');
      if (!container) return;

      // Remove TODAS as páginas que contêm .toc-container (antigas)
      container.querySelectorAll('.page-container:has(.toc-container)').forEach(page => page.remove());

      // Coleta títulos (excluindo os que estão dentro de capas especiais)
      const titulos = [];
      const titulosVistos = new Set();

      container.querySelectorAll('h1, h2, h3').forEach(titleEl => {
        // Ignora títulos dentro de capas especiais (já protegidas)
        if (titleEl.closest('.page-cover-img, .page-cover-text, .page-cover-pura, [data-legal], .page-extra, .author-page')) return;
        let texto = titleEl.textContent?.trim() || '';
        if (!texto || /índice|sumário/i.test(texto)) return;

        let chave = texto.toLowerCase().replace(/capítulo\\s*\\d+:/, '').trim();
        if (titulosVistos.has(chave)) return;
        titulosVistos.add(chave);

        if (!titleEl.id) {
          titleEl.id = 'sec-' + Math.random().toString(36).substr(2, 9);
        }
        titulos.push(titleEl);
      });

      if (titulos.length === 0) return;

      // --- Criar página(s) de índice ---
      // Posicionar após a última página especial e antes do primeiro conteúdo
      const ultimaEspecial = container.querySelector('.page-cover-img, .page-cover-pura, .page-cover-text, [data-legal], .page-extra, .author-page:last-of-type');
      let pontoInsercao = ultimaEspecial ? ultimaEspecial.nextSibling : container.firstChild;

      function criarPaginaIndice() {
        const novaPagina = document.createElement('div');
        novaPagina.className = 'page-container chapter-text-page';
        novaPagina.style.overflow = 'hidden';
        novaPagina.style.breakAfter = 'page';

        // Cabeçalho (opcional, mas usual)
        const header = document.createElement('div');
        header.className = 'page-header';
        header.innerHTML = '<span></span><span>' + (document.getElementById('meta-book-title')?.getAttribute('content')?.toUpperCase() || '') + '</span>';
        novaPagina.appendChild(header);

        const contentArea = document.createElement('div');
        contentArea.className = 'content-area';
        contentArea.style.display = 'flex';
        contentArea.style.flexDirection = 'column';
        contentArea.style.width = '100%';
        novaPagina.appendChild(contentArea);

        const footer = document.createElement('div');
        footer.className = 'page-footer';
        footer.innerHTML = '<span class="page-number"></span>';
        novaPagina.appendChild(footer);

        const toc = document.createElement('div');
        toc.className = 'toc-container';
        contentArea.appendChild(toc);

        // Insere no ponto de inserção
        if (pontoInsercao) {
          container.insertBefore(novaPagina, pontoInsercao);
        } else {
          container.appendChild(novaPagina);
        }
        return { pagina: novaPagina, toc: toc };
      }

      // Cria primeira página de índice
      let paginaIndiceAtual = criarPaginaIndice();
      let tocAtual = paginaIndiceAtual.toc;
      let contadorItens = 0;
      const LIMITE_ALTURA_INDICE = 720;

      // Função para criar item do índice
      function criarItemIndice(titleEl) {
        const a = document.createElement('a');
        a.className = 'toc-item';
        const isMain = titleEl.tagName === 'H1' || titleEl.tagName === 'H2';
        if (isMain) {
          a.classList.add('toc-main-chapter');
          a.style.fontWeight = indexShowSubtopics ? '700' : '400';
          a.style.color = 'var(--color-primary)';
        } else if (titleEl.tagName === 'H3') {
          if (!indexShowSubtopics) return null;
          a.classList.add('toc-subtopic');
          a.style.paddingLeft = '20px';
          a.style.fontSize = '0.75em';
          a.style.lineHeight = '1';
          a.style.opacity = '0.85';
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
        return a;
      }

      // Adiciona todos os itens, paginando se necessário
      for (let i = 0; i < titulos.length; i++) {
        const item = criarItemIndice(titulos[i]);
        if (!item) continue;
        tocAtual.appendChild(item);
        contadorItens++;

        const contentArea = paginaIndiceAtual.pagina.querySelector('.content-area');
        if ((contentArea && contentArea.scrollHeight > LIMITE_ALTURA_INDICE) || contadorItens >= 25) {
          // Remove o item que causou estouro
          tocAtual.removeChild(item);
          // Cria nova página de índice
          paginaIndiceAtual = criarPaginaIndice();
          tocAtual = paginaIndiceAtual.toc;
          tocAtual.appendChild(item);
          contadorItens = 1;
        }
      }

      // Remove páginas de índice que ficaram vazias (caso raro)
      container.querySelectorAll('.page-container .toc-container').forEach(toc => {
        const page = toc.closest('.page-container');
        if (page && !toc.querySelector('.toc-item')) {
          page.remove();
        }
      });

      // --- NUMERAÇÃO PERFEITA ---
      // Coleciona todas as páginas de conteúdo (ignorando especiais e índice)
      const todasPaginas = Array.from(container.children).filter(el => {
        return (el.classList.contains('page-container') ||
                el.classList.contains('page-cover-img') ||
                el.classList.contains('page-cover-pura') ||
                el.classList.contains('page-cover-text') ||
                el.hasAttribute('data-legal') ||
                el.classList.contains('author-page') ||
                el.classList.contains('page-extra')) &&
                el.style.display !== 'none';
      });

      // Filtra apenas páginas que devem ser numeradas (exclui capas e índice)
      const paginasNumeradas = todasPaginas.filter(page => {
        // Exclui páginas especiais (capas, legal, autor, extra)
        if (page.classList.contains('page-cover-img') ||
            page.classList.contains('page-cover-pura') ||
            page.classList.contains('page-cover-text') ||
            page.hasAttribute('data-legal') ||
            page.classList.contains('author-page') ||
            page.classList.contains('page-extra')) {
          return false;
        }
        // Exclui páginas que contêm .toc-container (índice)
        if (page.querySelector('.toc-container')) return false;
        return true;
      });

      // Agora, para cada item do índice, encontra a página do título e atribui o número
      const allTocItems = container.querySelectorAll('.toc-item');
      allTocItems.forEach(item => {
        const href = item.getAttribute('href');
        if (!href || !href.startsWith('#')) return;
        const target = document.getElementById(href.substring(1));
        if (target) {
          // Encontra a página que contém o título (pode ser .page-container ou uma página especial)
          let page = target.closest('.page-container, .page-cover-img, .page-cover-pura, .page-cover-text, [data-legal], .author-page, .page-extra');
          if (page) {
            // Verifica se essa página é numerada
            const index = paginasNumeradas.indexOf(page);
            if (index !== -1) {
              const numSpan = item.querySelector('.toc-page-num');
              if (numSpan) numSpan.innerText = String(index + 1);
            } else {
              // Se a página não for numerada (ex: capa), tenta encontrar a próxima página numerada?
              // Para capas de capítulo, queremos o número da página em que ela aparece, mas ela não está em paginasNumeradas?
              // Na verdade, capas de capítulo (.cap-img-overlay) estão dentro de .page-container, e essas páginas são numeradas.
              // Mas se o título estiver dentro de uma capa especial (ex: .page-cover-img), não deve aparecer no índice.
              // Portanto, se não estiver em paginasNumeradas, não atribuímos número.
            }
          }
        }
      });
    }

    // --- O restante do código (event listeners, observers, etc.) permanece igual ---
    // (Apenas substitua as chamadas antigas pela nova lógica)

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
        document.getElementById('ebook-container').innerHTML = e.data.html;
        setTimeout(() => {
          executarRefluxoCompleto();
          requestAnimationFrame(() => {
            window.scrollTo(0, scrollY);
          });
        }, 50);
      }

      if (e.data.type === 'DELETE_ELEMENT') {
        const target = document.getElementById(e.data.id);
        if (target) {
          target.remove();
          executarRefluxoCompleto();
          setTimeout(() => {
            window.parent.postMessage({ type: 'HTML_SYNC', html: document.getElementById('ebook-container').innerHTML }, '*');
          }, 100);
        }
      }

      if (e.data.type === 'REPLACE_ELEMENT_HTML') {
        const target = document.getElementById(e.data.id);
        if (target) {
          target.outerHTML = e.data.newHtml;
          executarRefluxoCompleto();
          setTimeout(() => {
            window.parent.postMessage({ type: 'HTML_SYNC', html: document.getElementById('ebook-container').innerHTML }, '*');
          }, 100);
        }
      }

      if (e.data.type === 'UPDATE_ELEMENT') {
        const target = document.getElementById(e.data.id);
        if (target) {
          if (e.data.iconClass !== undefined && target.tagName === 'I') {
            target.className = e.data.iconClass;
          } else {
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
          }
          executarRefluxoCompleto();
          setTimeout(() => {
            window.parent.postMessage({ type: 'HTML_SYNC', html: document.getElementById('ebook-container').innerHTML }, '*');
          }, 100);
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
    });

    // --- Eventos de seleção e edição (mantidos) ---
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
          outerHTML: el.outerHTML,
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

    // --- Inicialização ---
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