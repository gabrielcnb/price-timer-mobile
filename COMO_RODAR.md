# Price Timer — Como rodar

## Pre-requisitos (instalar uma vez)
1. Node.js: https://nodejs.org (versao LTS)
2. EAS CLI: `npm install -g eas-cli expo-cli`
3. Conta gratis no expo.dev (cadastra em 2 min)

## Instalar dependencias
```bash
cd "C:\Users\gabri\Desktop\price-timer-app"
npm install
```

## Logar no Expo
```bash
eas login
```

## Buildar para simulador iOS (nao precisa Apple Dev Account)
```bash
npm run build:ios
```
Isso compila na nuvem da Expo (Mac deles) e retorna um arquivo `.app`.
Para rodar no simulador, precisa de um Mac com Xcode.

## Rodar no iPhone real (precisa de Apple Developer Account - $99/ano)
1. Cadastra em developer.apple.com
2. Registra o UDID do seu iPhone no EAS:
   `eas device:create`
3. Build para device:
   `npm run build:device`
4. O EAS envia um link para instalar direto no iPhone

## Opção gratuita: Testar logic sem câmera
A câmera real não funciona no Expo Go (porque usa VisionCamera nativo).
Para testar a lógica: pode mockar o OCR no camera.tsx temporariamente.

## Estrutura do app
- app/index.tsx     → redirect para wage ou camera
- app/wage.tsx      → tela de configuração do salário
- app/camera.tsx    → câmera com overlay de preços
- utils/priceParser.ts → detecta €X.XX e $X.XX, converte pra minutos
- hooks/useWage.ts  → salva/lê salário no AsyncStorage
