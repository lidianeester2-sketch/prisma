# Ligar o Prisma ao Appwrite (uns 15 minutos)

O Appwrite é o "cofre na nuvem" que guarda seus dados e deixa computador e celular sempre iguais. O plano grátis (Free) sobra para o Prisma.

Os nomes dos botões podem mudar um pouco com o tempo. Se algo estiver diferente, me mande um print.

> Repare: o Appwrite chama as tabelas de **Tables** e as colunas de **Columns**. Em versões mais antigas do painel, apareciam como **Collections** e **Attributes**. É a mesma coisa.

---

## 1. Criar a conta e o projeto
1. Entre em **cloud.appwrite.io** → *Sign up* (pode usar a conta do GitHub ou Google).
2. Se pedir para criar uma organização, coloque `Lidi` e escolha o plano **Free**.
3. Clique em **Create project**.
   - **Name:** `Prisma`
   - **Region:** a que aparecer primeiro (ou a mais próxima do Brasil, se houver)
   - Clique em **Create**.

## 2. Autorizar o seu site (sem isso, o Appwrite bloqueia o Prisma)
1. Dentro do projeto, na tela inicial (Overview), procure **Add a platform** → **Web**.
   (Se não achar: menu **Overview** → seção *Platforms* → **Add platform** → **Web**.)
2. **Name:** `Prisma`
3. **Hostname:** `seuusuario.github.io` — só isso, **sem** `https://` e **sem** o nome do repositório.
   Exemplo: se o seu Prisma abre em `https://lidianeester2.github.io/prisma/`, o hostname é `lidianeester2.github.io`.
4. Ele vai mostrar telas com código de instalação: pode pular todas (*Skip* / *Next*) até terminar.

## 3. Criar o banco
1. No menu da esquerda, clique em **Databases** → **Create database**.
2. **Name:** `prisma`
3. **Database ID:** clique no lápis ao lado do ID e escreva exatamente `prisma`.
4. **Create**.

## 4. Criar a tabela
1. Dentro do banco `prisma`, clique em **Create table** (ou *Create collection*).
2. **Name:** `records`
3. **Table ID:** clique no lápis e escreva exatamente `records`.
4. **Create**.

### 4a. Colunas
Dentro da tabela `records`, vá na aba **Columns** (ou *Attributes*) → **Create column** e crie estas 4, uma de cada vez:

| Tipo | Key (nome) | Size | Required |
|---|---|---|---|
| **String** (ou *Text*) | `rid` | `64` | ✅ marcado |
| **String** (ou *Text*) | `col` | `20` | ✅ marcado |
| **String** (ou *Text*) | `data` | `1000000` | ✅ marcado |
| **Boolean** | `deleted` | — | ☐ desmarcado, *Default* = `false` |

Escreva os nomes exatamente assim, tudo minúsculo.

> Se o tipo String não aceitar o tamanho `1000000`, escolha o tipo **Long text** (ou *Text*/*Mediumtext*) para a coluna `data`. É lá que ficam suas notas e desenhos.

### 4b. Permissões (quem pode mexer)
Ainda na tabela `records`, vá na aba **Settings**:
1. Em **Permissions** → **Add role** → escolha **All users** (ou *Users*).
   Marque **somente Create** (deixe Read, Update e Delete desmarcados) → **Update**.
2. Logo abaixo, ligue **Row security** (ou *Document security*) → **Update**.

O que isso faz: qualquer pessoa logada pode criar registros, mas cada registro só pode ser visto e alterado por quem o criou. Ou seja, seus dados são só seus.

## 5. Pegar os dois códigos
No menu da esquerda, clique em **Overview** (ou na engrenagem **Settings** do projeto). Copie:
- **API Endpoint** — algo como `https://nyc.cloud.appwrite.io/v1`
- **Project ID** — uma sequência de letras e números, como `6720f1a2003b4c5d6e7f`

## 6. Conectar o Prisma
**No computador:**
1. Abra o Prisma → **Ajustes** → **Sincronização**.
2. Cole o **API Endpoint** e o **Project ID** → **Conectar**.
3. Digite seu e-mail e uma senha de **pelo menos 8 caracteres** → **Criar conta**.
4. O ponto no canto deve ficar **verde**.

**No celular:**
1. Abra o Prisma instalado → engrenagem (Ajustes) → **Sincronização**.
2. Cole os mesmos dois códigos → **Conectar**.
3. Use o mesmo e-mail e senha → **Entrar** (não "Criar conta").
4. Em alguns segundos, os dados do computador aparecem.

> **Dica:** para não precisar colar os códigos em cada aparelho, cole os dois no arquivo `config.js` (no GitHub: abra o arquivo → lápis ✏️ → cole entre as aspas → *Commit changes*).

---

## Se algo der errado
O erro aparece em **Ajustes → Sincronização**, embaixo do seu e-mail.

| O que aparece | O que fazer |
|---|---|
| "o Appwrite recusou este site" | O hostname do passo 2 está diferente do endereço do Prisma. Confira (sem `https://`, sem barra). |
| "banco prisma não encontrado" | O Database ID não é `prisma`. Refaça o passo 3. |
| "tabela records não encontrada" | O Table ID não é `records`. Refaça o passo 4. |
| "faltam colunas" | Alguma coluna do passo 4a está com nome diferente. |
| "sem permissão" | Refaça o passo 4b. |
| "E-mail ou senha incorretos" | Confira a senha. No celular, use **Entrar**, não *Criar conta*. |
