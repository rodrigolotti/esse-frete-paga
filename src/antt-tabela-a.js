// Coeficientes do piso mínimo de frete da ANTT — Tabela A (carga lotação,
// contratação da composição veicular ou caminhão simples).
//
// Fonte: Portaria SUROC nº 22, de 28/09/2026 (DOU 29/09/2026, edição extra),
// que reajusta o Anexo II da Resolução ANTT nº 5.867/2020.
// Vigência: a partir de 30/09/2026. Diesel S10 de referência: R$ 7,33/L.
//
// IMPORTANTE: a ANTT atualiza esses valores pelo menos duas vezes por ano
// (janeiro e julho) e sempre que o diesel varia mais de 5%. Ao atualizar,
// troque os números abaixo e a constante TABELA_INFO.
//
// ccd = custo de deslocamento (R$/km)   cc = carga e descarga (R$ por viagem)
// null = a norma não publica coeficiente para essa combinação.

export const TABELA_INFO = {
  norma: "Portaria SUROC nº 22/2026 (ANTT)",
  vigencia: "2026-09-30",
  dieselReferencia: 7.33,
  url: "https://www.legisweb.com.br/legislacao/?id=502245",
};

export const EIXOS = [2, 3, 4, 5, 6, 7, 9];

export const TABELA_A = {
  "carga-geral": {
    nome: "Carga geral",
    ccd: [4.0738, 5.2177, 5.918, 6.8284, 7.5347, 8.2727, 9.4114],
    cc: [451.84, 541.86, 588.86, 657.56, 671.93, 831.66, 903.32],
  },
  "granel-solido": {
    nome: "Granel sólido",
    ccd: [4.1056, 5.2555, 5.9476, 6.8548, 7.5641, 8.2316, 9.4318],
    cc: [460.59, 552.24, 597.0, 664.83, 680.01, 820.34, 908.91],
  },
  "granel-liquido": {
    nome: "Granel líquido",
    ccd: [4.1796, 5.3511, 6.1019, 7.0226, 7.7372, 8.37, 9.5909],
    cc: [471.98, 569.57, 621.52, 693.08, 709.72, 840.5, 934.76],
  },
  frigorificada: {
    nome: "Frigorificada ou aquecida",
    ccd: [4.8234, 6.1659, 7.0345, 8.0623, 8.8911, 9.8134, 11.1479],
    cc: [520.07, 623.27, 686.63, 757.98, 772.35, 982.76, 1067.06],
  },
  conteinerizada: {
    nome: "Conteinerizada",
    ccd: [null, 5.2282, 5.8755, 6.791, 7.4986, 8.2292, 9.3486],
    cc: [null, 544.75, 577.15, 647.29, 662.01, 819.69, 886.05],
  },
};
