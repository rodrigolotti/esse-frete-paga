// Worker da Cloudflare do "Esse frete paga?".
//
// Por que existe: a chave do OpenRouteService não pode ficar no site (o código
// do site é público). O site chama este worker, e só ele conhece a chave.
//
// Uso:  GET /rota?de=São Paulo, SP&para=Curitiba, PR
// Volta: { origem: {nome}, destino: {nome}, distanciaKm, duracaoHoras }
//
// Configuração na Cloudflare: crie um secret chamado ORS_KEY com a sua chave.
// Este arquivo é autossuficiente: dá para colar direto no editor da Cloudflare.

const ORS = "https://api.heigit.org";
const PERFIL = "driving-hgv"; // rota para caminhão

// Sites que podem usar este worker (o resto é bloqueado pelo navegador).
const ORIGENS_PERMITIDAS = [
  "https://rodrigolotti.github.io",
  "http://localhost:8000",
  "http://localhost:8765",
];

/** Lê a resposta da busca de endereço (Pelias) e devolve o primeiro resultado. */
export function lerEndereco(dados) {
  const f = dados && Array.isArray(dados.features) ? dados.features[0] : null;
  if (!f || !f.geometry || !Array.isArray(f.geometry.coordinates)) return null;
  const [lon, lat] = f.geometry.coordinates;
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  return { lon, lat, nome: (f.properties && f.properties.label) || "" };
}

/** Lê a resposta de rota do OpenRouteService (GeoJSON ou JSON) em km e horas. */
export function lerRota(dados) {
  const resumo =
    (dados && dados.features && dados.features[0] && dados.features[0].properties &&
      dados.features[0].properties.summary) ||
    (dados && dados.routes && dados.routes[0] && dados.routes[0].summary);
  if (!resumo || !Number.isFinite(resumo.distance)) return null;
  return {
    distanciaKm: Math.round(resumo.distance / 100) / 10, // metros → km, 1 casa
    duracaoHoras: Number.isFinite(resumo.duration) ? Math.round(resumo.duration / 360) / 10 : null,
  };
}

function cabecalhosCors(origem) {
  const permitido = ORIGENS_PERMITIDAS.includes(origem) ? origem : ORIGENS_PERMITIDAS[0];
  return {
    "Access-Control-Allow-Origin": permitido,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Vary": "Origin",
  };
}

function responder(corpo, status, origem) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...cabecalhosCors(origem) },
  });
}

async function buscarEndereco(texto, chave, fetchFn) {
  const url = `${ORS}/pelias/v1/search?size=1&boundary.country=BR&text=${encodeURIComponent(texto)}`;
  const r = await fetchFn(url, { headers: { Authorization: chave } });
  if (!r.ok) throw new Error(`busca de endereço respondeu ${r.status}`);
  return lerEndereco(await r.json());
}

export async function tratar(request, env, fetchFn = fetch) {
  const origem = request.headers.get("Origin") || "";
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cabecalhosCors(origem) });

  const url = new URL(request.url);
  if (url.pathname !== "/rota") return responder({ erro: "Use /rota?de=...&para=..." }, 404, origem);
  if (!env.ORS_KEY) return responder({ erro: "Worker sem a chave ORS_KEY configurada." }, 500, origem);

  const de = (url.searchParams.get("de") || "").trim();
  const para = (url.searchParams.get("para") || "").trim();
  if (de.length < 3 || para.length < 3) {
    return responder({ erro: "Informe origem e destino (cidade e estado, por exemplo)." }, 400, origem);
  }

  try {
    const [a, b] = await Promise.all([
      buscarEndereco(de, env.ORS_KEY, fetchFn),
      buscarEndereco(para, env.ORS_KEY, fetchFn),
    ]);
    if (!a) return responder({ erro: `Não encontrei a origem "${de}".` }, 404, origem);
    if (!b) return responder({ erro: `Não encontrei o destino "${para}".` }, 404, origem);

    const r = await fetchFn(
      `${ORS}/openrouteservice/v2/directions/${PERFIL}?start=${a.lon},${a.lat}&end=${b.lon},${b.lat}`,
      { headers: { Authorization: env.ORS_KEY, Accept: "application/json, application/geo+json" } }
    );
    if (!r.ok) {
      return responder({ erro: "Não consegui calcular a rota entre esses lugares." }, 502, origem);
    }
    const rota = lerRota(await r.json());
    if (!rota) return responder({ erro: "A rota voltou sem distância." }, 502, origem);

    return responder({ origem: { nome: a.nome }, destino: { nome: b.nome }, ...rota }, 200, origem);
  } catch (e) {
    return responder({ erro: "Serviço de rotas indisponível agora. Digite a distância à mão." }, 502, origem);
  }
}

export default { fetch: (request, env) => tratar(request, env) };
