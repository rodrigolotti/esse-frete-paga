// Liga a tela às regras de cálculo.

import { analisarFrete } from "./calc.js";
import { TABELA_A, TABELA_INFO, EIXOS } from "./antt-tabela-a.js";

const form = document.getElementById("form");
const erro = document.getElementById("erro");
const resultado = document.getElementById("resultado");
const selCarga = document.getElementById("tipoCarga");
const selEixos = document.getElementById("eixos");

const CHAVE_SALVA = "esse-frete-paga:custos";
// Campos que descrevem o caminhão/custos (ficam salvos). Os da viagem, não.
const CAMPOS_SALVOS = [
  "consumoKmL", "precoDieselL", "manutencaoPorKm", "taxasPercentual",
  "margemDesejada", "tipoCarga", "eixos",
];

const reais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const num1 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const brl = (v) => (v == null ? "—" : reais.format(v));
// Coeficiente da ANTT com as 4 casas da norma, para a conta exibida fechar.
const reais4 = new Intl.NumberFormat("pt-BR", {
  style: "currency", currency: "BRL", minimumFractionDigits: 4, maximumFractionDigits: 4,
});
const coef = (v) => reais4.format(v);

const NOMES_CUSTOS = {
  diesel: "Diesel",
  pedagio: "Pedágios",
  manutencao: "Manutenção e pneus",
  despesasViagem: "Alimentação, pernoite, chapa",
  outrosCustos: "Outros custos",
  taxas: "Impostos + comissão",
};

// --- opções dos selects ---------------------------------------------------
for (const [id, linha] of Object.entries(TABELA_A)) {
  selCarga.add(new Option(linha.nome, id));
}
for (const e of EIXOS) selEixos.add(new Option(`${e} eixos`, String(e)));
selEixos.value = "5";

document.getElementById("fonte").textContent =
  `Piso ANTT: ${TABELA_INFO.norma}, em vigor desde ` +
  `${TABELA_INFO.vigencia.split("-").reverse().join("/")} ` +
  `(diesel de referência ${reais.format(TABELA_INFO.dieselReferencia)}/L).`;

// --- valores salvos neste aparelho -----------------------------------------
try {
  const salvos = JSON.parse(localStorage.getItem(CHAVE_SALVA) || "{}");
  for (const [k, v] of Object.entries(salvos)) {
    if (CAMPOS_SALVOS.includes(k) && form.elements[k]) form.elements[k].value = v;
  }
} catch { /* sem armazenamento disponível: segue com os padrões */ }

function salvar(dados) {
  try {
    const s = Object.fromEntries(CAMPOS_SALVOS.map((k) => [k, dados[k]]));
    localStorage.setItem(CHAVE_SALVA, JSON.stringify(s));
  } catch { /* ignora */ }
}

// --- leitura do formulário -------------------------------------------------
function ler() {
  const d = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.tagName === "SELECT") d[el.name] = el.value;
    else d[el.name] = el.value.trim() === "" ? (el.required ? NaN : 0) : Number(el.value.replace(",", "."));
  }
  d.eixos = Number(d.eixos);
  return d;
}

// --- desenho do resultado --------------------------------------------------
const TEXTO_VEREDITO = {
  "paga": ["Paga!", "Dá lucro e passa do mínimo que você definiu."],
  "paga-pouco": ["Paga pouco", "Não dá prejuízo, mas fica abaixo do lucro que você quer."],
  "nao-paga": ["Não paga", "Com esses custos, você perde dinheiro nessa viagem."],
};

function mostrar(r, d) {
  const [titulo, sub] = TEXTO_VEREDITO[r.veredito];
  const v = document.getElementById("veredito");
  v.className = `veredito ${r.veredito}`;
  v.innerHTML = "";
  v.append(titulo);
  const small = document.createElement("small");
  small.textContent = sub;
  v.append(small);

  document.getElementById("lucro").textContent = brl(r.lucro);
  document.getElementById("margem").textContent = `${num1.format(r.margem)}%`;
  document.getElementById("lucroPorKm").textContent = brl(r.lucroPorKm);
  document.getElementById("custoPorKm").textContent = brl(r.custoPorKm);

  const piso = document.getElementById("piso");
  piso.className = "cartao";
  if (!r.piso) {
    piso.innerHTML = "<h2>Piso mínimo ANTT</h2><p>A ANTT não publica piso para essa combinação de carga e eixos.</p>";
  } else {
    const dif = d.freteOferecido - r.piso.piso;
    if (r.abaixoDoPiso) piso.classList.add("alerta");
    piso.innerHTML = `
      <h2>Piso mínimo ANTT</h2>
      <p>Piso para ${num1.format(d.distanciaKm)} km: <strong>${brl(r.piso.piso)}</strong>
         <br><small>${num1.format(d.distanciaKm)} km × ${coef(r.piso.ccd)}/km + ${brl(r.piso.cc)} de carga e descarga</small></p>
      <p>${r.abaixoDoPiso
        ? `<strong>O frete oferecido está ${brl(-dif)} abaixo do piso.</strong> Contratar abaixo do piso é proibido por lei (Lei 13.703/2018).`
        : `O frete oferecido está ${brl(dif)} acima do piso.`}</p>`;
  }

  document.getElementById("freteEmpate").textContent = brl(r.freteEmpate);
  document.getElementById("margemAlvo").textContent = `${num1.format(d.margemDesejada)}%`;
  document.getElementById("freteParaMargem").textContent =
    r.freteParaMargem == null ? "impossível com essas taxas" : brl(r.freteParaMargem);

  const tbody = document.querySelector("#tabelaCustos tbody");
  tbody.innerHTML = "";
  for (const [k, val] of Object.entries(r.custos)) {
    if (val === 0) continue;
    const tr = tbody.insertRow();
    tr.insertCell().textContent = k === "diesel"
      ? `${NOMES_CUSTOS[k]} (${num1.format(r.litros)} L em ${num1.format(r.kmTotal)} km)`
      : NOMES_CUSTOS[k];
    tr.insertCell().textContent = brl(val);
  }
  const tot = tbody.insertRow();
  tot.className = "total";
  tot.insertCell().textContent = "Custo total";
  tot.insertCell().textContent = brl(r.custoTotal);

  resultado.hidden = false;
  resultado.scrollIntoView({ behavior: "smooth", block: "start" });
}

form.addEventListener("submit", (ev) => {
  ev.preventDefault();
  erro.hidden = true;
  const d = ler();
  try {
    if ([d.freteOferecido, d.distanciaKm, d.consumoKmL, d.precoDieselL].some(Number.isNaN)) {
      throw new Error("Preencha frete, distância, consumo e preço do diesel.");
    }
    const r = analisarFrete(d);
    salvar(d);
    mostrar(r, d);
  } catch (e) {
    erro.textContent = e.message;
    erro.hidden = false;
    resultado.hidden = true;
  }
});
