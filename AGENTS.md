<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes â€” APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:user-rule -->
# Regra de Deploy Obrigatório
Sempre que finalizar uma atualização ou correção, DEVE-SE obrigatoriamente fazer um git push e disparar o deploy na Vercel (npx vercel --prod --yes).
<!-- END:user-rule -->
