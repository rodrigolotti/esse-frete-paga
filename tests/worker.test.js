// Testes do worker com o OpenRouteService simulado (sem internet).

import { test } from "node:test";
import assert from "node:assert/strict";
import { tratar, lerEndereco, lerRota } from "../worker/worker.js";

const SITE = "https://rodrigolotti.github.io";
const env = { ORS_KEY: "chave-teste" };

const pelias = (lon, lat, label) => ({ features: [{ geometry: { coordinates: [lon, lat] }, properties: { label } }] });

function fetchFalso({ rotaStatus = 200, semOrigem = false } = {}) {
  const chamadas = [];
  const fn = async (url, opts) => {
    chamadas.push({ url, auth: opts && opts.headers && opts.headers.Authorization });
    const json = (corpo, status = 200) => ({ ok: status < 400, status, json: async () => corpo });
    if (url.includes("/pelias/v1/search")) {
      if (url.includes("Curitiba")) return json(pelias(-49.27, -25.43, "Curitiba, PR, Brasil"));
      if (semOrigem) return json({ features: [] });
      return json(pelias(-46.63, -23.55, "São Paulo, SP, Brasil"));
    }
    if (url.includes("/openrouteservice/v2/directions/driving-hgv")) {
      return json({ features: [{ properties: { summary: { distance: 408_349.7, duration: 22_140 } } }] }, rotaStatus);
    }
    return json({}, 404);
  };
  fn.chamadas = chamadas;
  return fn;
}

const pedir = (q, origem = SITE) =>
  new Request(`https://worker.exemplo/rota?${q}`, { headers: { Origin: origem } });

test("lerRota converte metros em km e segundos em horas", () => {
  assert.deepEqual(lerRota({ features: [{ properties: { summary: { distance: 408349.7, duration: 22140 } } }] }), {
    distanciaKm: 408.3, // 408.349,7 m
    duracaoHoras: 6.2, // 22.140 s = 6,15 h
  });
  assert.deepEqual(lerRota({ routes: [{ summary: { distance: 1000, duration: 3600 } }] }), { distanciaKm: 1, duracaoHoras: 1 });
  assert.equal(lerRota({}), null);
});

test("lerEndereco pega o primeiro resultado ou null", () => {
  assert.deepEqual(lerEndereco(pelias(-46.6, -23.5, "SP")), { lon: -46.6, lat: -23.5, nome: "SP" });
  assert.equal(lerEndereco({ features: [] }), null);
});

test("rota completa: busca os dois endereços e calcula a distância de caminhão", async () => {
  const f = fetchFalso();
  const r = await tratar(pedir("de=São Paulo&para=Curitiba"), env, f);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), {
    origem: { nome: "São Paulo, SP, Brasil" },
    destino: { nome: "Curitiba, PR, Brasil" },
    distanciaKm: 408.3,
    duracaoHoras: 6.2,
  });
  assert.equal(r.headers.get("Access-Control-Allow-Origin"), SITE);
  // a chave vai no cabeçalho, nunca na resposta
  assert.ok(f.chamadas.every((c) => c.auth === "chave-teste"));
  const rota = f.chamadas.find((c) => c.url.includes("directions"));
  assert.match(rota.url, /^https:\/\/api\.heigit\.org\/openrouteservice\/v2\/directions\/driving-hgv\?start=-46\.63,-23\.55&end=-49\.27,-25\.43$/);
});

test("endereço não encontrado → 404 com mensagem clara", async () => {
  const r = await tratar(pedir("de=Lugar Inexistente&para=Curitiba"), env, fetchFalso({ semOrigem: true }));
  assert.equal(r.status, 404);
  assert.match((await r.json()).erro, /origem/);
});

test("falha do serviço de rota → 502", async () => {
  const r = await tratar(pedir("de=São Paulo&para=Curitiba"), env, fetchFalso({ rotaStatus: 500 }));
  assert.equal(r.status, 502);
});

test("sem chave configurada → 500; sem origem/destino → 400", async () => {
  assert.equal((await tratar(pedir("de=São Paulo&para=Curitiba"), {}, fetchFalso())).status, 500);
  assert.equal((await tratar(pedir("de=&para=Curitiba"), env, fetchFalso())).status, 400);
});

test("site desconhecido não recebe permissão de CORS", async () => {
  const r = await tratar(pedir("de=São Paulo&para=Curitiba", "https://site-estranho.com"), env, fetchFalso());
  assert.notEqual(r.headers.get("Access-Control-Allow-Origin"), "https://site-estranho.com");
});
