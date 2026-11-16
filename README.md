# Esse frete paga? 🚚

Calculadora para caminhoneiros autônomos e pequenas transportadoras descobrirem, **antes de aceitar a carga**, se um frete dá lucro.

Ela busca a distância de caminhão entre as cidades e soma diesel, pedágios, manutenção, volta vazia, despesas de viagem, impostos e comissão. Depois responde **Paga / Paga pouco / Não paga** e compara o valor oferecido com o **piso mínimo da ANTT**.

<img src="docs/tela-resultado.png" alt="Tela do resultado no celular" width="320" />

## Por que existe

Muitos autônomos aceitam frete olhando só o valor bruto. Diesel, desgaste e principalmente a **volta vazia** comem o lucro, e às vezes a viagem dá prejuízo. As calculadoras que existem mostram só o piso da ANTT. Esta mostra **quanto sobra para você** e **qual frete pedir**.

## O que ela calcula

| Resultado | Como |
| --- | --- |
| Custo da viagem | diesel (km total ÷ consumo × preço) + pedágio + manutenção/km + despesas + outros + % de impostos e comissão |
| Lucro e margem | frete − custo total; lucro ÷ frete |
| Lucro e custo por km | divididos pelo km total (carregado + vazio) |
| Frete para não ter prejuízo | custos sem taxas ÷ (1 − taxas%) |
| Frete para ter o lucro desejado | custos sem taxas ÷ (1 − taxas% − margem%) |
| Piso mínimo ANTT | distância de ida × CCD + CC (Tabela A) |

## Dados da ANTT

- Tabela A (carga lotação, contratação da composição veicular ou caminhão simples) da **Portaria SUROC nº 22/2026**, em vigor desde 30/09/2026, com diesel de referência de R$ 7,33/L.
- Tipos de carga incluídos: carga geral, granel sólido, granel líquido, frigorificada ou aquecida, conteinerizada.
- Os coeficientes ficam em [`src/antt-tabela-a.js`](src/antt-tabela-a.js). A ANTT atualiza esses valores pelo menos duas vezes por ano e sempre que o diesel varia mais de 5%. **Ao atualizar, mude os números e rode os testes.**

> É uma estimativa para negociação. Para fechar contrato, confira o piso na [calculadora oficial da ANTT](https://calculadorafrete.antt.gov.br/), que trata casos especiais (retorno vazio obrigatório, alto desempenho, Tabelas B a D).

## Rodar no seu computador

Não precisa instalar nada além do [Node.js](https://nodejs.org) (versão 18 ou mais nova), e só para os testes.

```bash
git clone https://github.com/SEU-USUARIO/esse-frete-paga.git
cd esse-frete-paga

# abrir o site (qualquer servidor estático serve)
python3 -m http.server 8000      # depois acesse http://localhost:8000

# rodar os testes
npm test
```

## Estrutura

```
index.html            tela
styles.css            visual (pensado para celular)
src/calc.js           regras de cálculo (funções puras, testadas)
src/antt-tabela-a.js  coeficientes da ANTT, com a fonte
src/app.js            liga a tela ao cálculo; salva os custos no aparelho
src/config.js         endereço do worker de rotas (vazio = busca desligada)
worker/worker.js      worker da Cloudflare: esconde a chave e calcula a rota
worker/LEIA-ME.md     como configurar a busca de rota
tests/                testes do cálculo e do worker (com o serviço simulado)
.github/workflows/    roda os testes e publica no GitHub Pages
```

## Próximos passos

- [x] Distância automática a partir de origem e destino ([como configurar](worker/LEIA-ME.md))
- [ ] Pedágio automático por eixo (depende de uma API paga)
- [ ] Preço médio do diesel por estado (dados da ANP)
- [ ] Tabelas B, C e D da ANTT e retorno vazio obrigatório
- [ ] Histórico de fretes calculados e comparação entre ofertas
- [ ] Funcionar offline e instalar como app (PWA)

## Licença

[MIT](LICENSE)
