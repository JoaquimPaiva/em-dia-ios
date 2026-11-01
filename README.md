# Em Dia · app nativa iOS

Aplicação iOS construída com Expo, React Native e Expo Router. Usa autenticação Supabase, sessão guardada no Keychain através de `expo-secure-store` e a Edge Function `calendar-api` já usada pelo site.

## Configurar

1. Instalar Node.js LTS e dependências: `npm install`.
2. Copiar `.env.example` para `.env` e preencher a chave **publishable** do projeto Supabase. Nunca colocar aqui a `service_role` nem a palavra-passe da base de dados.
3. No Supabase Auth, adicionar `emdia://auth-callback` e `emdia://reset-password` aos Redirect URLs permitidos para confirmação e recuperação de palavra-passe.
4. Iniciar: `npx expo start`.

Para utilizar a câmara e as tabs nativas, é necessário um development build. Expo Go não inclui todos os módulos nativos desta app. Um build iOS pode ser criado na cloud com EAS (`npx eas-cli build --platform ios --profile development`); a criação e assinatura do IPA requerem a conta Apple Developer adequada.

Antes de iniciar um build remoto, configure `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` no ambiente EAS do projeto. O `.env` local não deve ser enviado para o repositório.

## Funcionalidades

- Login, criação de conta de aluno com código de turma, recuperação e alteração de palavra-passe.
- Agenda pessoal/escolar, pesquisa, categorias, publicação e edição de eventos conforme o papel.
- Consulta de turmas; administração pode criar turmas, atribuir professores/alunos, ativar/desativar e renovar/copiar códigos.
- Administração de utilizadores, papéis, contas ativas e reposição de palavra-passe.
- Leitura do QR mostrado pela TV e autorização da associação à agenda pessoal.
- Tema claro/escuro guardado no perfil Supabase.
- Tabs nativas; no iOS 26 ou posterior, o sistema aplica Liquid Glass automaticamente. Os formulários e ações são apresentados como `formSheet` nativo.

## Verificação local

`npm run lint` e `npm run typecheck`.

## Notas de build

O bundle identifier atual é `pt.duorrvm.emdia`; confirme que este identificador está disponível na sua conta Apple Developer antes de assinar e publicar. Em iOS anteriores ao 26, o sistema apresenta a tab bar nativa convencional.
