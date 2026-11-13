# Rota Comercial

App para representantes comerciais controlarem comissões, lojas e viagens.

## Como o código está organizado

O app não precisa de etapa de montagem: o navegador carrega os arquivos direto.

- `index.html`: estrutura das telas.
- `css/app.css`: visual (grid de 8pt, temas claro e escuro).
- `js/`: a lógica, dividida por assunto. Os arquivos são carregados na ordem do número no nome, e essa ordem importa: `01-estado.js` cria os dados que os outros usam, e `22-inicio.js` liga os botões e abre o app.

| Arquivo | Assunto |
|---|---|
| `01-estado.js` | Dados do app (marcas, lojas, pedidos) |
| `02-exemplo.js` | Dados de exemplo para testes |
| `03-utilidades.js` | Formatação, filtros, status da loja |
| `04-mapa.js` | Mapa do Brasil, marcadores e zoom |
| `05-lojas-do-estado.js` | Lista de lojas ao abrir um estado |
| `06-painel.js` | Painel com totais e gráfico |
| `07-lojas.js` | Aba Lojas |
| `08-ficha-da-loja.js` | Ficha de cada loja |
| `09-pedido.js` | Formulário de pedido |
| `10-cadastro-loja.js` | Cadastro e arquivamento de loja |
| `11-salvar.js` | Salvamento no aparelho e na conta, validação dos dados |
| `12-boas-vindas.js` | Primeiros passos e modo exemplo |
| `13-ajustes.js` | Ajustes: marcas, cópia de segurança |
| `14-divisoes.js` | Regiões e coleções |
| `15-filtros.js` | Botão de filtros |
| `16-viagem.js` | Despesas de viagem |
| `17-importar.js` | Importação de relatórios de outra IA |
| `18-previsto.js` | Previsto x real |
| `19-campos-busca.js` | Campos de escolha com busca |
| `20-busca-geral.js` | Lupa do topo |
| `21-tema.js` | Tema claro e escuro |
| `22-inicio.js` | Liga os botões e abre o app |
| `23-conta.js` | Conta, login e sincronização com o Supabase |
| `24-app.js` | App instalável e fim do teste grátis |
| `25-metas.js` | Metas por marca e coleção |

## Publicação

Cada commit no ramo `main` publica sozinho no Cloudflare Pages (pelo GitHub Actions).
