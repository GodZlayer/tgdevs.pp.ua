# Gramática Visual TGDevs — r20

## Regra central

A qualidade visual não pode cair depois do primeiro favicon.

A timeline inteira deve se comportar como um único sistema físico contínuo. Elementos não aparecem porque chegou um timestamp; eles nascem de algo que já existia. Elementos não somem sem destino; eles se transformam, reorganizam, dissolvem em matéria ou tornam-se outra parte do sistema.

O scroll é o playhead absoluto de tudo. Parar o scroll congela exatamente o frame. Voltar o scroll desfaz fisicamente a transformação.

---

## TGBC — significado da marca

A referência visual fornecida pelo projeto é a fonte canônica para proporção e leitura da marca.

O TG Business Center é a central de funcionamento.

Os módulos ao redor representam as APIs/módulos do TGBC.

A linha representa o caminho percorrido pelas etapas do sistema fiscal e operacional.

A construção da marca não é uma simples revelação em relógio:

1. o caminho começa;
2. o fluxo percorre a circunferência;
3. quando o fluxo alcança uma etapa, o respectivo módulo nasce como uma bolha/pop físico;
4. o próximo trecho passa a existir porque o fluxo chegou até ele;
5. o ciclo continua naturalmente;
6. o caminho volta ao início;
7. a central conclui a composição.

Portanto o relógio é consequência do fluxo, não um efeito decorativo de máscara.

---

## TGBC — interface

A interface é parte do mesmo mundo físico da identidade.

A tela não deve parecer um screenshot colocado dentro da animação.

Durante a apresentação dos módulos do sistema, o shell do TGBC permanece o mesmo. Conteúdo não deve simplesmente fazer fade e slide para o próximo conteúdo.

A matéria visual de uma tela deve reorganizar-se e formar a próxima tela.

A demonstração detalhada de Clientes continua sendo a referência de causalidade: ações reais modificam estados reais da interface.

As telas seguintes podem permanecer como apresentação de módulo, porém a transição entre elas precisa carregar a mesma materialidade.

---

## Fechamento TGBC

O fechamento é o inverso conceitual da construção inicial.

A página inteira do TGBC torna-se a própria marca.

Cada região real da interface tem um destino físico dentro do favicon:

- cabeçalho;
- identidade do topo;
- navegação;
- subheader;
- módulos da página;
- blocos de conteúdo;
- shell;
- região central.

A transformação acontece em ordem.

Cada região desmonta-se em matéria e converge para um dos grupos físicos da marca.

No fim não existe mais "uma página desaparecendo e uma logo entrando".

A página **é** a matéria da logo.

---

## Nuvem

Durante o fechamento, partículas excedentes da interface soltam-se da transformação principal.

Essas partículas não desaparecem.

Elas tornam-se novamente a nuvem usada na linguagem inicial da experiência.

Desta vez os dois padrões/ondas ficam centralizados ao fundo, atrás da marca, compartilhando o mesmo centro visual.

Não existe troca de fundo por textura pronta.

---

## Nuvem → prisma

O prisma deve nascer usando a mesma lógica fundamental da esfera inicial.

A nuvem é a matéria.

A própria posição de cada partícula muda progressivamente até ocupar a geometria do prisma.

Portanto:

**nuvem → prisma**

e não:

**nuvem desaparece → prisma aparece**.

O prisma deve transmitir continuidade espacial e profundidade, sem uma borda final evidente.

---

## TGBC → TGDesk

Enquanto a nuvem se transforma no prisma, a marca TGBC transforma-se fisicamente no favicon TGDesk.

A logo TGDesk final deve usar a arte exata do projeto. Partículas/fragments podem existir durante a metamorfose, mas não substituem a identidade oficial no estado final.

Após a transformação:

- favicon TGDesk;
- logotxt TGDesk;
- `Sua equipe merece qualidade !`.

A composição deve recuperar a mesma elegância e densidade visual do início da landing, quando TGDevs era o único foco.

Texto e logotxt entram somente depois que a matéria principal já está coerente.

---

## Proibições

A partir desta revisão, evitar como solução principal:

- fade de uma cena inteira para outra;
- slide lateral genérico;
- scale-in genérico;
- cards entrando sem causalidade;
- fundo sendo substituído por outro fundo;
- partículas sem origem ou destino;
- animação autônoma desconectada do scroll;
- objetos surgindo apenas porque o timestamp chegou.

Opacity continua permitida como componente secundário de uma transformação física, nunca como a transformação em si.

---

## Critério de qualidade

Antes de aceitar um frame novo, responder:

1. De onde veio cada objeto?
2. Para onde vai cada objeto?
3. Qual estado anterior causou este estado?
4. A transformação ainda funciona visualmente ao executar o scroll ao contrário?
5. O frame parece pertencer ao mesmo universo físico do começo?

Se uma dessas respostas for vaga, a animação ainda não está pronta.
