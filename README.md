# Clube da Régua MVP

Painel funcional para pequenas barbearias, com agenda, clientes, serviços e mensagens inteligentes para WhatsApp.

## Executar

```powershell
cd C:\Users\rafael.luz\Documents\teste\barberflow-mvp
npm start
```

Abra `http://127.0.0.1:4173`.

Os dados ficam salvos no `localStorage` do navegador. A integração atual prepara e abre mensagens reais no WhatsApp; automações sem intervenção exigirão posteriormente a API oficial do WhatsApp Business.

## Publicar na Vercel

O projeto está configurado como site estático. Na Vercel, use `barberflow-mvp` como diretório do projeto, sem comando de build e com `.` como diretório de saída.
