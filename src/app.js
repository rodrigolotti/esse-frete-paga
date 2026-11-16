// Liga a tela às regras de cálculo. O resultado é recalculado a cada digitação.

import { analisarFrete } from "./calc.js";
import { TABELA_A, TABELA_INFO, EIXOS } from "./antt-tabela-a.js";
import { ROTA_URL } from "./config.js";

const $ = (id) => document.getElementById(id);
const form = $("form");

const CHAVE_SALVA = "esse-frete-paga:custos";
// Campos que descrevem o caminhão e os custos (ficam salvos). Os da viagem, não.
const CAMPOS_SALVOS = [
  "consumoKmL", "precoDieselL", "manutencaoPorKm", "taxasPercentual",
  "margemDesejada", "tipoCarga", "eixos",
];

const reais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const reais4 = new Intl.NumberFormat("pt-BR", {
  style: "currency", currency: "BRL", minimumFractionDigits: 4, maximumFractionDigits: 4,
});
const num1 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const brl = (v) => (v == null ? "—" : reais.format(v));

// Ordem, nome e cor de cada custo na barra
const CUSTOS = [
  ["diesel", "Diesel", "#23272d"],
  ["pedagio", "Pedágios", "#5b636c"],
  ["manutencao", "Manutenção e pneus", "#8a939c"],
  ["despesasViagem", "Comida, pernoite, chapa", "#b4bbc2"],
  ["outrosCustos", "Outros custos", "#d3d7db"],
  ["taxas", "Impostos e comissão", "#b88a00"],
];
const COR_LUCRO = "#0d7a45";

// --- opções dos selects ---------------------------------------------------
for (const [id, linha] of Object.entries(TABELA_A)) $("tipoCarga").add(new Option(linha.nome, id));
for (const e of EIXOS) $("eixos").add(new Option(`${e} eixos`, String(e)));
$("eixos").value = "5";

$("fonte").textContent =
  `Piso ANTT: ${TABELA_INFO.norma}, em vigor desde ` +
  `${TABELA_INFO.vigencia.split("-").reverse().join("/")}, ` +
  `com diesel de referência a ${reais.format(TABELA_INFO.dieselReferencia)}/L.`;

// --- valores salvos neste aparelho -----------------------------------------
try {
  const salvos = JSON.parse(localStorage.getItem(CHAVE_SALVA) || "{}");
  for (const [k, v] of Object.entries(salvos)) {
    if (CAMPOS_SALVOS.includes(k) && form.elements[k]) form.elements[k].value = v;
  }
} catch { /* sem armazenamento: segue com os padrões */ }

function salvar(d) {
  try {
    localStorage.setItem(CHAVE_SALVA, JSON.stringify(Object.fromEntries(CAMPOS_SALVOS.map((k) => [k, d[k]]))));
  } catch { /* ignora */ }
}

// --- leitura do formulário -------------------------------------------------
function ler() {
  const d = {};
  for (const el of form.elements) {
    if (!el.name || "foraDoCalculo" in el.dataset) continue;
    if (el.tagName === "SELECT") d[el.name] = el.value;
    else d[el.name] = el.value.trim() === "" ? (el.required ? NaN : 0) : Number(el.value.replace(",", "."));
  }
  d.eixos = Number(d.eixos);
  return d;
}

// --- desenho ----------------------------------------------------------------
const TEXTO = {
  "paga": ["Paga", "Dá lucro e passa do mínimo que você definiu."],
  "paga-pouco": ["Paga pouco", "Não dá prejuízo, mas fica abaixo do lucro que você quer."],
  "nao-paga": ["Não paga", "Com esses custos, você perde dinheiro nessa viagem."],
};

let ultimoVeredito = null;

function placa(estado, titulo, sub) {
  const p = $("placa");
  p.className = `placa ${estado}`;
  if (estado !== ultimoVeredito && estado !== "vazia") {
    void p.offsetWidth; // reinicia a animação
    p.classList.add("mudou");
  }
  ultimoVeredito = estado;
  $("vereditoTitulo").textContent = titulo;
  $("vereditoSub").textContent = sub;
}

function vazio(mensagemErro) {
  placa("vazia", "Preencha o frete e a distância", "A resposta aparece aqui enquanto você digita.");
  $("placaNumeros").hidden = true;
  $("detalhes").hidden = true;
  $("erro").hidden = !mensagemErro;
  $("erro").textContent = mensagemErro || "";
}

function desenharPiso(r, d) {
  const el = $("piso");
  if (!r.piso) {
    el.className = "aviso";
    el.innerHTML = "<h2>Piso mínimo da ANTT</h2><p>A ANTT não publica piso para essa combinação de carga e eixos.</p>";
    return;
  }
  const dif = d.freteOferecido - r.piso.piso;
  el.className = r.abaixoDoPiso ? "aviso abaixo" : "aviso";
  el.innerHTML = r.abaixoDoPiso
    ? `<h2>Abaixo do piso da ANTT</h2>
       <p>O piso para ${num1.format(d.distanciaKm)} km é <strong>${brl(r.piso.piso)}</strong>. O frete oferecido está ${brl(-dif)} abaixo. Contratar abaixo do piso é proibido pela Lei 13.703/2018.</p>
       <p class="conta">${num1.format(d.distanciaKm)} km × ${reais4.format(r.piso.ccd)}/km + ${brl(r.piso.cc)} de carga e descarga</p>`
    : `<h2>Acima do piso da ANTT</h2>
       <p>O piso para ${num1.format(d.distanciaKm)} km é ${brl(r.piso.piso)}. O frete oferecido está ${brl(dif)} acima.</p>
       <p class="conta">${num1.format(d.distanciaKm)} km × ${reais4.format(r.piso.ccd)}/km + ${brl(r.piso.cc)} de carga e descarga</p>`;
}

function desenharBarra(r, d) {
  const barra = $("barra");
  const legenda = $("legenda");
  barra.innerHTML = "";
  legenda.innerHTML = "";

  // A barra inteira vale o maior entre o frete e o custo total.
  const total = Math.max(d.freteOferecido, r.custoTotal);
  const partes = CUSTOS.filter(([k]) => r.custos[k] > 0).map(([k, nome, cor]) => [nome, r.custos[k], cor]);
  if (r.lucro > 0) partes.push(["Seu lucro", r.lucro, COR_LUCRO]);

  for (const [nome, valor, cor] of partes) {
    const s = document.createElement("span");
    s.style.width = `${(valor / total) * 100}%`;
    s.style.background = cor;
    s.title = `${nome}: ${brl(valor)}`;
    barra.append(s);

    const li = document.createElement("li");
    li.innerHTML = `<i style="background:${cor}"></i>${nome}<b>${brl(valor)}</b>`;
    if (nome === "Diesel") {
      li.innerHTML = `<i style="background:${cor}"></i>Diesel <small>${num1.format(r.litros)} L em ${num1.format(r.kmTotal)} km</small><b>${brl(valor)}</b>`;
    }
    legenda.append(li);
  }

  if (r.lucro < 0) {
    // Marca onde o frete acaba: o que passa dela é prejuízo.
    const m = document.createElement("span");
    m.className = "prejuizo";
    m.style.left = `${(d.freteOferecido / total) * 100}%`;
    barra.append(m);
    const li = document.createElement("li");
    li.innerHTML = `<i class="listrado"></i>Prejuízo: o frete não cobre esta parte<b>${brl(r.lucro)}</b>`;
    legenda.append(li);
  }

  barra.setAttribute(
    "aria-label",
    `Frete de ${brl(d.freteOferecido)} contra custo total de ${brl(r.custoTotal)}; resultado ${brl(r.lucro)}.`
  );
  $("custoTotal").textContent = brl(r.custoTotal);
  $("custoPorKm").textContent = `${brl(r.custoPorKm)} por km rodado`;
}

function calcular() {
  const d = ler();
  if (Number.isNaN(d.freteOferecido) || Number.isNaN(d.distanciaKm)) return vazio();
  if (Number.isNaN(d.consumoKmL) || Number.isNaN(d.precoDieselL)) {
    return vazio("Preencha o consumo e o preço do diesel.");
  }
  let r;
  try {
    r = analisarFrete(d);
  } catch (e) {
    return vazio(e.message);
  }
  salvar(d);
  $("erro").hidden = true;

  const [titulo, sub] = TEXTO[r.veredito];
  placa(r.veredito, titulo, sub);
  $("placaNumeros").hidden = false;
  $("lucro").textContent = brl(r.lucro);
  $("margem").textContent = `${num1.format(r.margem)}%`;
  $("lucroPorKm").textContent = brl(r.lucroPorKm);

  desenharPiso(r, d);
  desenharBarra(r, d);
  $("freteEmpate").textContent = brl(r.freteEmpate);
  $("margemAlvo").textContent = `${num1.format(d.margemDesejada)}%`;
  $("freteParaMargem").textContent = r.freteParaMargem == null ? "impossível com essas taxas" : brl(r.freteParaMargem);
  $("detalhes").hidden = false;
}

// --- busca de rota por endereço (só aparece se o worker estiver configurado) ---
function statusRota(texto, erro = false) {
  const s = $("rotaStatus");
  s.textContent = texto;
  s.classList.toggle("erro-rota", erro);
}

async function buscarRota() {
  const de = $("origem").value.trim();
  const para = $("destino").value.trim();
  if (de.length < 3 || para.length < 3) {
    return statusRota("Escreva a cidade de saída e a de destino, com o estado (ex.: Campinas, SP).", true);
  }
  const botao = $("buscarRota");
  botao.disabled = true;
  statusRota("Calculando a rota de caminhão…");
  try {
    const url = `${ROTA_URL.replace(/\/$/, "")}/rota?de=${encodeURIComponent(de)}&para=${encodeURIComponent(para)}`;
    const resp = await fetch(url);
    const dados = await resp.json().catch(() => ({}));
    if (!resp.ok || !Number.isFinite(dados.distanciaKm)) {
      throw new Error(dados.erro || "Não consegui calcular a rota agora. Digite a distância à mão.");
    }
    form.elements.distanciaKm.value = dados.distanciaKm;
    if ($("voltaIgual").checked) form.elements.voltaVaziaKm.value = dados.distanciaKm;
    const tempo = Number.isFinite(dados.duracaoHoras) ? `, cerca de ${num1.format(dados.duracaoHoras)} h de direção` : "";
    statusRota(`${dados.origem.nome} → ${dados.destino.nome}: ${num1.format(dados.distanciaKm)} km${tempo}. Confira se as cidades estão certas.`);
    calcular();
  } catch (e) {
    statusRota(e.message, true);
  } finally {
    botao.disabled = false;
  }
}

if (ROTA_URL) {
  $("rota").hidden = false;
  $("buscarRota").addEventListener("click", buscarRota);
  for (const id of ["origem", "destino"]) {
    $(id).addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); buscarRota(); }
    });
  }
}

form.addEventListener("input", calcular);
form.addEventListener("change", calcular);
form.addEventListener("submit", (e) => { e.preventDefault(); calcular(); });
calcular();
