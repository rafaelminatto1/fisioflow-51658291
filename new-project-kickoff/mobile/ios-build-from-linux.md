# Build iOS a partir do Linux Zorin

## Recomendação

Usar Expo/React Native com EAS Build e EAS Submit. A documentação atual do Expo confirma que builds iOS podem ser disparados de Linux/Windows porque a compilação ocorre nos servidores EAS; build para iPhone físico exige Apple Developer Program pago. [Expo — development builds](https://docs.expo.dev/develop/development-builds/create-a-build/).

Você **não precisa alugar um Mac para começar**. Um Mac passa a ser útil/necessário para `run:ios`, depuração nativa local, certos testes de Xcode ou contingência fora do EAS.

## Caminho canônico

```text
Zorin/Linux ou GitHub Actions Ubuntu
        ↓ autentica e solicita
EAS Build (compilação iOS remota em infraestrutura macOS)
        ↓ artefato identificado
EAS Submit
        ↓
TestFlight / App Store Connect
```

- Linux executa desenvolvimento JS/TS, lint, testes, Metro/Expo dev server e dispara o build remoto.
- GitHub Actions em `ubuntu-latest` **não compila o IPA localmente**; apenas prepara o projeto e chama EAS.
- EAS é a única origem canônica de binário enquanto atender aos requisitos.
- Runner GitHub macOS é fallback manual, não uma segunda esteira de release concorrente.

## Pré-requisitos

### Para decidir o scaffold mobile

- aceitar Expo/React Native + EAS no DG-03;
- definir ownership das contas e dois bundle IDs finais;
- manter configuração e credenciais separadas por app.

### Antes do primeiro build para device/TestFlight

- conta Expo da organização;
- Apple Developer Program;
- dois registros no App Store Connect;
- bundle IDs únicos, por exemplo `br.com.example.fisioflow.pro` e `br.com.example.fisioflow.patient`;
- dois EAS project IDs e credenciais separáveis;
- política de quem pode gerar/usar certificados e provisioning profiles;
- privacy manifests, textos de privacidade, ícones e metadata próprios;
- Universal Links e Associated Domains por app.

O bundle identifier precisa ser único na App Store. [Expo app config — iOS](https://docs.expo.dev/versions/latest/config/app/#ios).

## Profiles propostos em cada `eas.json`

| Profile | Uso | Distribuição | Update channel |
|---|---|---|---|
| `development` | dev client e dispositivo interno | internal | `development-{app}` |
| `preview` | QA em dispositivos cadastrados | internal | `preview-{app}` |
| `testflight` | QA/distribuição via TestFlight | store | `testflight-{app}` |
| `production` | submissão aprovada à App Store | store | `production-{app}` |

`runtimeVersion` deve representar compatibilidade nativa. EAS Update só publica JavaScript/assets compatíveis com o runtime; mudança de módulo nativo exige novo binário. [Expo — runtime versions](https://docs.expo.dev/eas-update/runtime-versions/).

## CI proposta

- GitHub Actions roda em Linux, instala dependências e chama EAS remotamente. Em monorepo, cada job usa o diretório do app e o respectivo EAS project ID.
- Autenticação não interativa usa `EXPO_TOKEN` no GitHub Secret; a documentação oficial recomenda `expo/expo-github-action`. [Expo — EAS em CI](https://docs.expo.dev/build/building-on-ci/).
- Fixar uma versão de EAS CLI depois do scaffold; não deixar a release depender silenciosamente de `latest`.
- Build remoto de referência: `eas build --platform ios --profile <profile> --non-interactive --no-wait`.
- Capturar o build ID retornado e associá-lo a app, commit, profile e environment.
- Submit ocorre em job separado, protegido por GitHub Environment/aprovação: `eas build:submit --platform ios --profile production --id <BUILD_ID> --non-interactive`. [Expo — EAS Submit iOS](https://docs.expo.dev/submit/ios/).
- Não usar `--latest` em produção quando dois apps/profiles puderem tornar a seleção ambígua.
- Push na `main` pode validar ou solicitar preview; não publica automaticamente na App Store.
- Não colocar Apple password, `.p12`, provisioning profile ou App Store Connect key no repositório.

`EXPO_TOKEN`, credenciais Apple/App Store Connect e permissões de submit devem seguir menor privilégio e rotação. Secrets de produção ficam protegidos por environment; forks e pull requests não confiáveis não os recebem.

Os comandos acima são referência de runbook, **não foram executados**.

## EAS Update

- EAS Update não substitui build nativo nem publica mudança incompatível com o binário instalado.
- Cada app tem project ID, channels e `runtimeVersion` próprios.
- Mudança de módulo nativo, permission, entitlement ou configuração nativa exige novo binário.
- Update OTA só entra depois de política de rollout, rollback, observabilidade e classificação do que pode mudar sem revisão da loja.
- Mensagens de update, branch/channel e metadata não carregam PII/PHI.

## Gates de release

1. version/buildNumber monotônicos;
2. contract compatibility com API suportada;
3. testes unit/integration/e2e críticos;
4. crash-free e source maps;
5. consentimento/permission strings revisados;
6. logout/revogação/cache wipe testados;
7. deep links e push neutro testados em device;
8. TestFlight interno;
9. checklist clínico/LGPD;
10. rollout e kill switch para features arriscadas.

## Fallback GitHub macOS

Manter workflow `macos-*` somente se houver necessidade comprovada de:

- `xcodebuild` ou diagnóstico nativo não reproduzido no EAS;
- teste automatizado em iOS Simulator;
- inspeção de archive/signing;
- contingência temporária quando EAS não atender um requisito crítico.

O workflow macOS deve ser `workflow_dispatch`, restrito, sem disparo automático de publicação. Se gerar um artefato de contingência, ele precisa dos mesmos testes, identificação de commit, aprovação e gates do caminho canônico. Quando o fallback deixar de ser necessário, removê-lo; não manter duas fontes permanentes de IPA.

## Quando alugar ou usar um Mac

Somente quando houver necessidade de depuração no Xcode, teste local em simulator/device, módulo nativo problemático ou contingência de signing. Alugar um Mac não é pré-requisito para iniciar o web, a API, o código React Native ou builds EAS a partir do Zorin.
