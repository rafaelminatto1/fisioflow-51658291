# ADR-0007 — Apps iPhone com Expo/React Native

**Status:** Proposta recomendada

## Decisão

Construir `professional-app` e `patient-app` com Expo/React Native. Compartilhar `mobile-core`, contratos e design tokens; manter navegação, telas e permissões independentes.

## Build a partir do Linux Zorin

- Desenvolvimento local com Expo e simuladores/dispositivos disponíveis.
- **EAS Build/Submit** como caminho principal para binários iOS e TestFlight.
- GitHub Actions com runner macOS como fallback/controle adicional.
- Alugar Mac somente se módulo nativo, debugging ou assinatura exigir; não é pré-requisito para iniciar.

## Regras

- Canal OTA separado por app e ambiente; atualização incompatível exige nova versão nativa.
- Keychain/SecureStore guarda credenciais e chaves, não o banco clínico. Cache clínico persistente é mínimo e usa datastore criptografado com proteção da plataforma; a biblioteca concreta continua aberta até spike.
- Cache e fila particionados por app+usuário+organização.
- Logout/revogação apagam token, chaves, cache, fila e registro push. Wipe remoto é best effort quando o aparelho está offline; TTL local, reautenticação e destruição de chave tornam resíduos inacessíveis.
- Push contém texto neutro e deep link; dado clínico é buscado após unlock/auth.
- Universal Links/Associated Domains testados.
- Finalização clínica, pagamento, assinatura, exclusão e mudança de role permanecem online.
- Cada replay da fila revalida membership/vínculo/permission atuais no servidor; estar autorizado quando a ação foi enfileirada não autoriza sua execução posterior.
- Horário do cliente é informativo; o servidor registra recebimento e ordem autoritativos e trata clock skew explicitamente.
- Background sync não é garantia de execução. A UI mostra estado pendente/erro e suporta sincronização segura em foreground.

## Alternativa

SwiftUI nativo só vence se testes demonstrarem requisito nativo crítico, performance ou integração que Expo não atende. Dois codebases Swift separados aumentariam custo sem benefício provado no momento.
