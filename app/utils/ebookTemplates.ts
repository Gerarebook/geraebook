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
          <p>Escreva aqui a sua biografia. Você pode editar este texto livremente clicando nele no modo de edição inteligente.</p>
        </div>
      </div>
      <div class="page-footer">${regraRodape}</div>
    </div>`;
}

export function obterInstrucoesBase(opts?: { numeroCapitulo?: number, tema?: string }) {
  const numero = opts?.numeroCapitulo || 1;
  const iconeSugerido = opts?.tema ? `fa-${opts.tema.toLowerCase()}` : 'fa-book';

  const regrasCompletas = `
DIRETRIZES DE FORMATAÇÃO E LIMITES ESTRITOS (LEITURA OBRIGATÓRIA):
1. GERE APENAS HTML PURO. NENHUM texto solto de conversação fora das tags (ex: é proibido dizer "Yes", "Wait", "Here is").
2. VOCÊ ESTÁ ESTRITAMENTE PROIBIDO de gerar qualquer tag <div class="page-container">, <div class="page-header"> ou <div class="page-footer">. O nosso sistema injeta isso automaticamente.
3. REGRA DE OURO (LIMITE DE TEXTO): Cada parágrafo DEVE ter rigorosamente entre 60 e 70 palavras. NUNCA faça parágrafos maiores que isso. É PROIBIDO criar parágrafos extras. É ESTRITAMENTE PROIBIDO incluir anotações visíveis como "Paragraph 10 (~70 words):". Escreva apenas o conteúdo literário direto.

4. ESTRUTURA RIGOROSA DO CAPÍTULO (Siga EXATAMENTE esta ordem):

   <!-- PÁGINA 1: A Capa do Capítulo (Imagem de fundo com o Título no Box) -->
   <div class="cap-img-overlay" data-unsplash="[ESCREVA_UMA_PALAVRA_EM_INGLES_AQUI]">
      <div class="cap-overlay-box">
         <i class="fas fa-${iconeSugerido} text-4xl mb-4"></i>
         <h1 class="chapter-title-exclusive">Capítulo ${numero}: [NOME DO CAPITULO AQUI]</h1>
      </div>
   </div>

   <!-- PÁGINA 2: O Despertar -->
   <h3 class="subtopic-title">[Subtítulo Inicial]</h3>
   <p>[Escreva aqui o parágrafo 1. Exatamente 60 a 70 palavras.]</p>
   <p>[Escreva aqui o parágrafo 2. Exatamente 60 a 70 palavras.]</p>
   <p>[Escreva aqui o parágrafo 3. Exatamente 60 a 70 palavras.]</p>
   <p>[Escreva aqui o parágrafo 4. Exatamente 60 a 70 palavras.]</p>
   <div class="concept-box"><i class="fas [ICONE_DINAMICO]"></i> [Substitua ICONE_DINAMICO por um icone fontawesome contextual (ex: fa-leaf, fa-brain, fa-rocket). Escreva uma IDEIA CENTRAL. Máximo 20 palavras.]</div>

   <!-- PÁGINA 3: O Aprofundamento -->
   <h3 class="subtopic-title">[Subtítulo de Aprofundamento]</h3>
   <p>[Escreva aqui o parágrafo 5. Exatamente 60 a 70 palavras.]</p>
   <p>[Escreva aqui o parágrafo 6. Exatamente 60 a 70 palavras.]</p>
   <p>[Escreva aqui o parágrafo 7. Exatamente 60 a 70 palavras.]</p>
   <p>[Escreva aqui o parágrafo 8. Exatamente 60 a 70 palavras.]</p>
   <div class="highlight-box"><i class="fas [ICONE_DINAMICO]"></i> [Substitua ICONE_DINAMICO por outro icone coerente. Aviso Importante ou Curiosidade. Máximo 20 palavras.]</div>

   <!-- PÁGINA 4: A Concretização -->
   <h3 class="subtopic-title">[Subtítulo Final]</h3>
   <p>[Escreva aqui o parágrafo 9. Exatamente 60 a 70 palavras.]</p>
   <p>[Escreva aqui o parágrafo 10. Exatamente 60 a 70 palavras.]</p>
   <p>[Escreva aqui o parágrafo 11. Exatamente 60 a 70 palavras.]</p>
   <p>[Escreva aqui o parágrafo 12. Exatamente 60 a 70 palavras.]</p>
   <blockquote>[Reflexão Final impactante. Máximo 20 palavras.]</blockquote>

5. MODO COMPILADOR ABSOLUTO: Entregue APENAS as tags HTML preenchidas. É ESTRITAMENTE PROIBIDO incluir pensamentos lógicos da IA, comentários, ou marcadores de quantidade de palavras. Aja como um sistema cego.
`;

  return { regrasCompletas, numero };
}