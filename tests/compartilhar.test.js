import { test } from "node:test";
import assert from "node:assert/strict";
import { analisarFrete } from "../src/calc.js";
import { textoCompartilhar, linkWhatsApp } from "../src/compartilhar.js";

const base = {
  distanciaKm: 500, voltaVaziaKm: 500, consumoKmL: 2.5, precoDieselL: 6.5,
  pedagio: 200, manutencaoPorKm: 0.5, despesasViagem: 150, outrosCustos: 0,
  taxasPercentual: 10, margemDesejada: 15, tipoCarga: "carga-geral", eixos: 5,
};

test("mensagem de frete que não paga traz prejuízo, piso e quanto pedir", () => {
  const d = { ...base, freteOferecido: 3000 };
  const t = textoCompartilhar(analisarFrete(d), d, { de: "Campinas, SP", para: "Curitiba, PR" });
  assert.equal(
    t,
    [
      "🚚 Esse frete paga? ❌ NÃO PAGA",
      "",
      "📍 Campinas, SP → Curitiba, PR (500 km + 500 km vazio)",
      "💰 Frete: R$ 3.000,00",
      "⛽ Custo da viagem: R$ 3.750,00",
      "📉 Prejuízo: R$ 750,00 (-25%)",
      "🚫 Abaixo do piso da ANTT (R$ 4.071,76)",
      "👉 Para valer a pena, peça pelo menos R$ 4.600,00",
      "",
      "Faça a conta do seu frete: https://rodrigolotti.github.io/esse-frete-paga/",
    ].join("\n")
  );
});

test("mensagem de frete que paga não sugere outro valor", () => {
  const d = { ...base, freteOferecido: 5000, voltaVaziaKm: 0 };
  const t = textoCompartilhar(analisarFrete(d), d);
  assert.match(t, /✅ PAGA/);
  assert.match(t, /📍 500 km\n/);
  assert.doesNotMatch(t, /Para valer a pena/);
  assert.doesNotMatch(t, /piso/);
});

test("link do WhatsApp codifica a mensagem", () => {
  assert.equal(linkWhatsApp("a b\nç"), "https://wa.me/?text=a%20b%0A%C3%A7");
});

test("nunca sugere pedir menos que o piso da ANTT", () => {
  // custo 3.432 / 0,85 = 4.037,65 para 15% de lucro, mas o piso é 4.071,76
  const d = { ...base, freteOferecido: 3200, consumoKmL: 2.5, precoDieselL: 7.33,
    pedagio: 0, despesasViagem: 0, taxasPercentual: 0 };
  const r = analisarFrete(d);
  assert.equal(r.freteParaMargem, 4037.65);
  const t = textoCompartilhar(r, d);
  assert.match(t, /👉 Peça pelo menos R\$ 4\.071,76 \(piso da ANTT\)/);
  assert.match(t, /📉 Prejuízo: R\$ 232,00 \(-7,3%\)/);
});
