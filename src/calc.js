// Regras de cálculo do "Esse frete paga?".
// Funções puras (sem tela): fáceis de testar e de reaproveitar.

import { TABELA_A, EIXOS } from "./antt-tabela-a.js";

/** Arredonda para centavos evitando erros de ponto flutuante (ex.: 1.005). */
export function centavos(valor) {
  const r = Math.round((valor + Number.EPSILON) * 100) / 100;
  return r === 0 ? 0 : r; // evita "-0", que apareceria como "-R$ 0,00"
}

/**
 * Piso mínimo da ANTT (Tabela A): piso = distância × CCD + CC.
 * Usa só a distância de ida, como manda a norma para a carga lotação.
 * Retorna null quando a norma não publica coeficiente para a combinação.
 */
export function pisoAntt({ tipoCarga, eixos, distanciaKm }) {
  const linha = TABELA_A[tipoCarga];
  if (!linha) throw new Error(`Tipo de carga desconhecido: ${tipoCarga}`);
  const i = EIXOS.indexOf(Number(eixos));
  if (i === -1) throw new Error(`Número de eixos sem coeficiente na ANTT: ${eixos}`);
  const ccd = linha.ccd[i];
  const cc = linha.cc[i];
  if (ccd == null || cc == null) return null;
  return { ccd, cc, piso: centavos(distanciaKm * ccd + cc) };
}

function exigir(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
}

/**
 * Analisa se um frete oferecido paga a viagem.
 *
 * Entradas (números em R$, km, km/L ou %):
 *  distanciaKm        distância carregado (ida)
 *  voltaVaziaKm       km que você roda vazio para voltar ou buscar a carga
 *  freteOferecido     valor oferecido pelo frete
 *  consumoKmL         consumo médio do caminhão
 *  precoDieselL       preço que você paga no diesel
 *  pedagio            total de pedágios da viagem (ida + volta)
 *  manutencaoPorKm    pneus, óleo, peças e desgaste por km rodado
 *  despesasViagem     alimentação, pernoite, chapa etc.
 *  outrosCustos       qualquer outro custo da viagem
 *  taxasPercentual    impostos + comissão/agenciamento, em % do frete
 *  margemDesejada     lucro mínimo que você aceita, em % do frete
 *  tipoCarga, eixos   para comparar com o piso da ANTT
 */
export function analisarFrete(e) {
  const v = {
    voltaVaziaKm: 0,
    pedagio: 0,
    manutencaoPorKm: 0,
    despesasViagem: 0,
    outrosCustos: 0,
    taxasPercentual: 0,
    margemDesejada: 15,
    ...e,
  };

  exigir(v.distanciaKm > 0, "Informe a distância da viagem (maior que zero).");
  exigir(v.freteOferecido > 0, "Informe o valor do frete oferecido.");
  exigir(v.consumoKmL > 0, "Informe o consumo do caminhão em km/L.");
  exigir(v.precoDieselL > 0, "Informe o preço do diesel.");
  for (const campo of [
    "voltaVaziaKm",
    "pedagio",
    "manutencaoPorKm",
    "despesasViagem",
    "outrosCustos",
    "taxasPercentual",
    "margemDesejada",
  ]) {
    exigir(v[campo] >= 0, `O campo ${campo} não pode ser negativo.`);
  }
  exigir(v.taxasPercentual < 100, "As taxas precisam ser menores que 100% do frete.");

  const kmTotal = v.distanciaKm + v.voltaVaziaKm;
  const litros = kmTotal / v.consumoKmL;

  const custos = {
    diesel: litros * v.precoDieselL,
    pedagio: v.pedagio,
    manutencao: kmTotal * v.manutencaoPorKm,
    despesasViagem: v.despesasViagem,
    outrosCustos: v.outrosCustos,
    taxas: v.freteOferecido * (v.taxasPercentual / 100),
  };
  const custoTotal = Object.values(custos).reduce((a, b) => a + b, 0);
  const lucro = v.freteOferecido - custoTotal;
  const margem = (lucro / v.freteOferecido) * 100;

  // Frete mínimo para atingir a margem desejada:
  // frete − custosSemTaxas − frete×t = frete×m  →  frete = custosSemTaxas / (1 − t − m)
  const custosSemTaxas = custoTotal - custos.taxas;
  const divisor = 1 - v.taxasPercentual / 100 - v.margemDesejada / 100;
  const freteParaMargem = divisor > 0 ? centavos(custosSemTaxas / divisor) : null;
  const freteEmpate =
    1 - v.taxasPercentual / 100 > 0
      ? centavos(custosSemTaxas / (1 - v.taxasPercentual / 100))
      : null;

  let piso = null;
  if (v.tipoCarga && v.eixos) {
    piso = pisoAntt({ tipoCarga: v.tipoCarga, eixos: v.eixos, distanciaKm: v.distanciaKm });
  }

  // O veredito usa valores em centavos, para que sobras de ponto flutuante
  // (ex.: −0,0000000001) não transformem um empate em prejuízo.
  const lucroCent = centavos(lucro);
  let veredito;
  if (lucroCent < 0) veredito = "nao-paga";
  else if ((lucroCent / v.freteOferecido) * 100 < v.margemDesejada) veredito = "paga-pouco";
  else veredito = "paga";

  const custosArred = Object.fromEntries(
    Object.entries(custos).map(([k, val]) => [k, centavos(val)])
  );

  return {
    veredito,
    kmTotal,
    litros: Math.round(litros * 10) / 10,
    custos: custosArred,
    custoTotal: centavos(custoTotal),
    lucro: centavos(lucro),
    margem: Math.round(margem * 10) / 10,
    lucroPorKm: centavos(lucro / kmTotal),
    custoPorKm: centavos(custoTotal / kmTotal),
    freteEmpate,
    freteParaMargem,
    piso,
    abaixoDoPiso: piso ? v.freteOferecido < piso.piso : null,
  };
}
