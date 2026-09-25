# ⚔️ Gabinete de Guerra UFSMUN — Cliente Web

Este diretório contém o frontend e a lógica de cliente da plataforma **Gabinete de Guerra UFSMUN**, construído com **Next.js 16**, **React 19**, **Tailwind CSS v4** e **Supabase**.

> 📖 **Para a documentação completa, arquitetura de software, modelagem de dados e guia de turnos, consulte o [README.md principal na raiz do repositório](../README.md).**

---

## 🚀 Execução Rápida

### 1. Instalação
```bash
npm install
```

### 2. Variáveis de Ambiente
Crie um arquivo `.env.local` neste diretório contendo:
```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-publica-anon
```

### 3. Rodar em Modo de Desenvolvimento
```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

### 4. Build de Produção
```bash
npm run build
npm run start
```
