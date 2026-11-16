# Cadência — site da consultoria

Site institucional e comercial da consultoria de IA aplicada à produtividade.
Next.js (App Router), React, TypeScript, Tailwind CSS, Motion e Lucide Icons.

## Rodar

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm run start
```

## Onde editar

Todo o conteúdo da empresa fica em **`src/config/site.ts`**: nome, assinatura, logotipo,
e-mail, WhatsApp, fotos, serviços, metodologia, texto do fundador e artigos.
Os itens marcados com `PROVISÓRIO` precisam ser confirmados antes de publicar:

- `brand.name` — nome proposto; verificar INPI e domínio.
- `founder.name` — nome do fundador.
- `contact.email` e `contact.whatsapp`.
- `NEXT_PUBLIC_SITE_URL` — domínio definitivo (ver `.env.example`).

### Fotos

Arquivos em `public/media`, apontados em `media` no `site.ts`. Um espaço com `null`
exibe arte gerada em código. As fotos do fundador entram como recortes com fundo transparente e tratamento escuro
(`media.cut*`), sobre painéis com gráficos animados. A abertura usa duas imagens quadradas
com o rosto no mesmo ponto: `media.hero` (base) e `media.heroReveal` (camada revelada pela
máscara que segue o cursor).

### Formulário de contato

`POST /api/contact` valida os campos e encaminha para `CONTACT_WEBHOOK_URL`
(Zapier, Make, n8n, Formspree ou CRM). Sem a variável, o formulário prepara a
mensagem e oferece o envio por WhatsApp ou e-mail.

### Artigos

Preencha `articles` no `site.ts`. Enquanto estiver vazio, a seção Insights mostra as
linhas editoriais com a marcação "Em breve".

## Estrutura

```
src/app            layout, página, SEO (sitemap, robots), API de contato
src/config         site.ts — conteúdo e marca
src/components     navegação, cortina de abertura, canvas da abertura
  sections/        Início, Manifesto, Soluções, Metodologia, Simulador, Sobre, Insights, Contato, Rodapé
  ui/              moldura com recorte, revelação de texto, contador, motivos gráficos
```

O simulador de retorno usa valores hipotéticos e está identificado como demonstração.
