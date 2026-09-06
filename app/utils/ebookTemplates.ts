export function gerarPaginaAviso(livroTitulo: string) {
  return `
    <div class="page-container chapter-text-page" data-legal="true">
      <div class="page-header"><span></span><span>${livroTitulo}</span></div>
      <div class="content-area">
        <h2 class="chapter-title-inline">Avisos Legais & Direitos Autorais</h2>
        <p><strong>© Todos os direitos reservados.</strong></p>
        <p>Nenhuma parte desta publicação pode ser reproduzida, distribuída ou transmitida sob qualquer forma ou por qualquer meio, incluindo fotocópia, gravação ou outros métodos eletrônicos ou mecânicos, sem a permissão prévia por escrito, exceto no caso de breves citações encartadas em resenhas críticas e outros usos não comerciais permitidos pela lei de direitos autorais.</p>
        <p><strong>Isenção de Responsabilidade (Disclaimer):</strong></p>
        <p>As informações contidas neste e-book são fornecidas estritamente para fins educacionais, informativos e de entretenimento. Não são oferecidas quaisquer garantias quanto à integridade, confiabilidade e exatidão dessas informações.</p>
        <p>Qualquer ação que você tomar com base nas informações deste livro é de sua inteira responsabilidade. Não haverá responsabilização por quaisquer perdas, danos ou prejuízos, diretos ou indiretos, decorrentes do uso ou da aplicação do conteúdo aqui exposto. Se necessitar de aconselhamento especializado, consulte um profissional qualificado da área.</p>
      </div>
      <div class="page-footer"><span></span><span class="page-number"></span></div>
    </div>`;
}

export interface AutorOpts {
  estiloRodape: string;
  livroAutores: string;
  livroTitulo: string;
  autorPosicao: string;
  autorFormato: string;
}

export function obterBlocoAutorHtml(opts: AutorOpts) {
  let numSpan = opts.estiloRodape.includes('circulo') ? '<span class="page-number circulo"></span>' : '<span class="page-number"></span>';
  let regraRodape = '';
  if (opts.estiloRodape === 'linha-superior') {
    regraRodape = `<span>${opts.livroAutores}</span>${numSpan}`;
  } else {
    regraRodape = `${numSpan}`;
  }

  return `
    <div class="page-container author-page">
      <div class="page-header"><span>${opts.livroTitulo || 'Título do Livro'}</span><span>SOBRE O AUTOR</span></div>
      <h2 id="sobre-o-autor" class="chapter-title-inline" style="opacity:0; position:absolute; z-index:-1;">Sobre o Autor</h2>
      <div class="author-section layout-${opts.autorPosicao}">
        <img src="https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png" class="author-photo ${opts.autorFormato}" alt="${opts.livroAutores || 'Autor'}">
        <div class="author-bio">
          <h2>${opts.livroAutores || 'Sobre o Autor'}</h2>
          <p>Substitua este texto com a sua biografia. Descreva sua trajetória, experiências e propósito profissional. Este espaço é dedicado a apresentar quem você é para o leitor.</p>
        </div>
      </div>
      <div class="page-footer">${regraRodape}</div>
    </div>`;
}

export function obterInstrucoesBase(opts?: { numeroCapitulo?: number, tema?: string }) {
  const numero = opts?.numeroCapitulo || 1;
  const iconeSugerido = opts?.tema ? `fa-${opts.tema.toLowerCase()}` : 'fa-book';

  const regrasCompletas = `
DIRETRIZES DE FORMATAÇÃO E SEGURANÇA (LEITURA OBRIGATÓRIA):
1. GERE APENAS HTML PURO. Nunca escreva textos soltos fora das tags.
2. VOCÊ ESTÁ ESTRITAMENTE PROIBIDO de gerar qualquer tag <div class="page-container">, <div class="page-header"> ou <div class="page-footer">. O sistema fará isso. Envie apenas o conteúdo.

3. PROIBIÇÃO DE PREGUIÇA E TEMPLATES (CHAVE MESTRA):
   - É ABSOLUTAMENTE PROIBIDO retornar textos genéricos ou "placeholders" com colchetes (exemplo: NÃO escreva "[Insira o texto aqui]").
   - Você DEVE atuar como um Ghostwriter especialista. ESCREVA O CONTEÚDO REAL, longo, detalhado, persuasivo e criativo para CADA parágrafo solicitado.
   - NÃO seja preguiçoso. NÃO resuma. NÃO pule páginas. Desenvolva o texto profundamente.
   - NÃO duplique citações (quotes) ou caixas de conceito. Cada elemento deve ter um texto 100% único, inédito e original.

4. ESTRUTURA RIGOROSA DO CAPÍTULO (Siga EXATAMENTE esta ordem. Onde houver colchetes, substitua pelo TEXTO FINAL E REAL que você vai inventar/escrever sobre o tema):

   <!-- PÁGINA 1: A Capa do Capítulo -->
   <div class="cap-img-overlay" data-unsplash="[ESCREVA_UMA_UNICA_PALAVRA_EM_INGLES_AQUI]">
      <div class="cap-overlay-box">
         <i class="fas fa-${iconeSugerido} text-4xl mb-4"></i>
         <h1 class="chapter-title-exclusive">Capítulo ${numero}: [ESCREVA O NOME DO CAPITULO AQUI]</h1>
      </div>
   </div>

   <!-- PÁGINA 2: O Despertar -->
   <h3 class="subtopic-title">[Escreva um Subtítulo Inicial Atraente]</h3>
   <p>[Escreva aqui o conteúdo real e detalhado do primeiro parágrafo. Introduza o conceito com profundidade. Mínimo 50 palavras.]</p>
   <p>[Escreva aqui o conteúdo real e detalhado do segundo parágrafo. Continue o raciocínio...]</p>
   <p>[Escreva aqui o conteúdo real e detalhado do terceiro parágrafo...]</p>
   <p>[Escreva aqui o conteúdo real e detalhado do quarto parágrafo...]</p>
   <div class="concept-box"><i class="fas fa-lightbulb"></i> [Escreva aqui uma Ideia Central, Dica ou Conceito-chave real e aplicável sobre o que acabou de ser lido]</div>

   <!-- PÁGINA 3: O Aprofundamento -->
   <h3 class="subtopic-title">[Escreva um Subtítulo de Aprofundamento]</h3>
   <p>[Escreva aqui o conteúdo real e detalhado do quinto parágrafo. Aprofunde o tema tecnicamente ou emocionalmente. Mínimo 60 palavras.]</p>
   <p>[Escreva aqui o conteúdo real e detalhado do sexto parágrafo...]</p>
   <p>[Escreva aqui o conteúdo real e detalhado do sétimo parágrafo...]</p>
   <p>[Escreva aqui o conteúdo real e detalhado do oitavo parágrafo...]</p>
   <div class="highlight-box"><i class="fas fa-highlighter"></i> [Escreva aqui um Aviso Importante ou Curiosidade de destaque, diferente do conceito anterior]</div>

   <!-- PÁGINA 4: A Concretização -->
   <h3 class="subtopic-title">[Escreva o Subtítulo Final do Capítulo]</h3>
   <p>[Escreva aqui o conteúdo real e detalhado do nono parágrafo. Comece a fechar o raciocínio. Mínimo 70 palavras.]</p>
   <p>[Escreva aqui o conteúdo real e detalhado do décimo parágrafo...]</p>
   <p>[Escreva aqui o conteúdo real e detalhado do décimo primeiro parágrafo...]</p>
   <p>[Escreva aqui o conteúdo real e detalhado do décimo segundo parágrafo...]</p>
   <blockquote>[Escreva aqui uma Reflexão Profunda, Citação Inventada ou Conselho Final extremamente impactante para fechar o capítulo com chave de ouro]</blockquote>

5. REGRA DE SEGURANÇA MÁXIMA E ABSOLUTA: É ESTRITAMENTE PROIBIDO gerar qualquer pensamento interno, comentários, notas, rascunhos, textos explicativos (como "Aqui está o capítulo..." ou "Entendido"), contagem de palavras, ou raciocínios lógicos (como "Wait", "Let's check"). RETORNE ÚNICA E EXCLUSIVAMENTE AS TAGS HTML PREENCHIDAS COM O TEXTO FINAL E ABSOLUTAMENTE NADA MAIS.
`;

  return { regrasCompletas, numero };
}