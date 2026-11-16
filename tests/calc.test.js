// Rodar com:  node --test
// Os valores esperados foram calculados à mão (conta no comentário de cada teste).

import { test } from "node:test";
import assert from "node:assert/strict";
import { analisarFrete, pisoAntt, centavos } from "../src/calc.js";

const base = {
  distanciaKm: 500,
  voltaVaziaKm: 500,
  consumoKmL: 2.5,
  precoDieselL: 6.5,
  pedagio: 200,
  manutencaoPorKm: 0.5,
  despesasViagem: 150,
  outrosCustos: 0,
  taxasPercentual: 10,
  margemDesejada: 15,
  tipoCarga: "carga-geral",
  eixos: 5,
};

test("piso ANTT carga geral 2 eixos, 500 km = 500 × 4,0738 + 451,84", () => {
  assert.deepEqual(pisoAntt({ tipoCarga: "carga-geral", eixos: 2, distanciaKm: 500 }), {
    ccd: 4.0738,
    cc: 451.84,
    piso: 2488.74,
  });
});

test("piso ANTT carga geral 5 eixos, 500 km = 3.414,20 + 657,56 = 4.071,76", () => {
  assert.equal(pisoAntt({ tipoCarga: "carga-geral", eixos: 5, distanciaKm: 500 }).piso, 4071.76);
});

test("conteinerizada com 2 eixos não tem coeficiente → null", () => {
  assert.equal(pisoAntt({ tipoCarga: "conteinerizada", eixos: 2, distanciaKm: 100 }), null);
});

test("eixos ou carga inválidos geram erro", () => {
  assert.throws(() => pisoAntt({ tipoCarga: "carga-geral", eixos: 8, distanciaKm: 100 }));
  assert.throws(() => pisoAntt({ tipoCarga: "xyz", eixos: 2, distanciaKm: 100 }));
});

test("frete de R$ 3.000 não paga: custo 3.750, prejuízo 750", () => {
  // 1.000 km / 2,5 = 400 L × 6,50 = 2.600 diesel
  // manutenção 1.000 × 0,50 = 500 · taxas 10% de 3.000 = 300
  // total = 2.600 + 200 + 500 + 150 + 0 + 300 = 3.750
  const r = analisarFrete({ ...base, freteOferecido: 3000 });
  assert.equal(r.veredito, "nao-paga");
  assert.equal(r.kmTotal, 1000);
  assert.equal(r.litros, 400);
  assert.deepEqual(r.custos, {
    diesel: 2600,
    pedagio: 200,
    manutencao: 500,
    despesasViagem: 150,
    outrosCustos: 0,
    taxas: 300,
  });
  assert.equal(r.custoTotal, 3750);
  assert.equal(r.lucro, -750);
  assert.equal(r.margem, -25);
  assert.equal(r.lucroPorKm, -0.75);
  assert.equal(r.custoPorKm, 3.75);
  // empate: 3.450 / 0,90 = 3.833,33 · margem 15%: 3.450 / 0,75 = 4.600
  assert.equal(r.freteEmpate, 3833.33);
  assert.equal(r.freteParaMargem, 4600);
  assert.equal(r.piso.piso, 4071.76);
  assert.equal(r.abaixoDoPiso, true);
});

test("frete de R$ 4.200 paga pouco: lucro 330 (7,9%)", () => {
  // taxas 420 → total 3.870 → lucro 330 → 330/4.200 = 7,857%
  const r = analisarFrete({ ...base, freteOferecido: 4200 });
  assert.equal(r.veredito, "paga-pouco");
  assert.equal(r.lucro, 330);
  assert.equal(r.margem, 7.9);
  assert.equal(r.abaixoDoPiso, false);
});

test("frete de R$ 5.000 paga: lucro 1.050 (21%)", () => {
  const r = analisarFrete({ ...base, freteOferecido: 5000 });
  assert.equal(r.veredito, "paga");
  assert.equal(r.lucro, 1050);
  assert.equal(r.margem, 21);
});

test("frete exatamente no valor de empate tem lucro zero", () => {
  const r = analisarFrete({ ...base, freteOferecido: 3450 / 0.9 });
  assert.equal(r.lucro, 0);
  assert.equal(r.veredito, "paga-pouco"); // empatou: não perde, mas não atinge 15%
});

test("entradas inválidas geram mensagens claras", () => {
  assert.throws(() => analisarFrete({ ...base, freteOferecido: 0 }), /frete/);
  assert.throws(() => analisarFrete({ ...base, freteOferecido: 1000, consumoKmL: 0 }), /consumo/);
  assert.throws(() => analisarFrete({ ...base, freteOferecido: 1000, pedagio: -1 }), /negativo/);
  assert.throws(() => analisarFrete({ ...base, freteOferecido: 1000, taxasPercentual: 100 }), /100%/);
});

test("sem margem possível (taxas + margem ≥ 100%) → freteParaMargem null", () => {
  const r = analisarFrete({ ...base, freteOferecido: 5000, taxasPercentual: 50, margemDesejada: 50 });
  assert.equal(r.freteParaMargem, null);
});

test("centavos arredonda corretamente", () => {
  assert.equal(centavos(1.005), 1.01);
  assert.equal(centavos(2.675), 2.68);
});

test("margem negativa arredonda para longe do zero: -232/3200 = -7,25% → -7,3", () => {
  const r = analisarFrete({ ...base, freteOferecido: 3200, precoDieselL: 7.33, pedagio: 0,
    despesasViagem: 0, taxasPercentual: 0 });
  assert.equal(r.lucro, -232);
  assert.equal(r.margem, -7.3);
});
