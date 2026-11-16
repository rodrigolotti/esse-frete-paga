# Busca de rota por endereço

O site calcula a distância de caminhão entre duas cidades usando o
[OpenRouteService](https://openrouteservice.org) (mapas do OpenStreetMap).
A chave desse serviço fica escondida num **worker da Cloudflare**, porque o
código do site é público.

```
site (GitHub Pages)  →  worker (Cloudflare, guarda a chave)  →  OpenRouteService
```

Os dois serviços são gratuitos. O plano grátis do OpenRouteService dá
2.000 rotas e 1.000 buscas de endereço por dia.

## Passo a passo

1. **Chave do OpenRouteService**: crie uma conta em <https://account.heigit.org>,
   gere uma chave (plano Standard, grátis) e copie.
2. **Worker na Cloudflare**: crie uma conta em <https://dash.cloudflare.com>.
   Vá em *Workers & Pages → Create → Create Worker*, dê o nome
   `esse-frete-paga-rota` e clique em *Deploy*.
3. Clique em *Edit code*, apague o que estiver lá, cole o conteúdo de
   [`worker.js`](worker.js) e clique em *Deploy*.
4. Em *Settings → Variables and Secrets*, adicione um **Secret** chamado
   `ORS_KEY` com a chave do passo 1.
5. Copie o endereço do worker (algo como
   `https://esse-frete-paga-rota.SEU-USUARIO.workers.dev`) e coloque em
   [`src/config.js`](../src/config.js), na constante `ROTA_URL`.

Para testar o worker direto no navegador:
`https://SEU-WORKER.workers.dev/rota?de=Campinas, SP&para=Curitiba, PR`
(abrindo assim aparece o JSON; o site em si só é liberado nos endereços de
`ORIGENS_PERMITIDAS`, dentro do `worker.js`).

## Limites conhecidos

- O **pedágio não é automático**: não há serviço gratuito confiável que
  calcule pedágio por eixo no Brasil. O site traz um atalho para o QualP.
- A rota é de caminhão (`driving-hgv`), mas pode diferir do caminho que o
  motorista realmente faz. Por isso a distância fica editável.
