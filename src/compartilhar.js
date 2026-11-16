// Monta a mensagem para mandar o resultado no WhatsApp (ou em qualquer app).

export const SITE = "https://rodrigolotti.github.io/esse-frete-paga/";

const reais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const num1 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
// Intl usa espaço não separável entre "R$" e o número; troca por espaço comum
// para o texto ficar igual em qualquer app de mensagem.
const brl = (v) => reais.format(v).replace(/ /g, " ");

const VEREDITO = {
  "paga": "✅ PAGA",
  "paga-pouco": "⚠️ PAGA POUCO",
  "nao-paga": "❌ NÃO PAGA",
};

/**
 * @param r      resultado de analisarFrete
 * @param d      dados digitados (freteOferecido, distanciaKm, voltaVaziaKm)
 * @param rota   opcional: { de, para } com os nomes das cidades
 */
export function textoCompartilhar(r, d, rota) {
  const linhas = [`🚚 Esse frete paga? ${VEREDITO[r.veredito]}`, ""];
  const km = `${num1.format(d.distanciaKm)} km` + (d.voltaVaziaKm > 0 ? ` + ${num1.format(d.voltaVaziaKm)} km vazio` : "");
  linhas.push(rota && rota.de && rota.para ? `📍 ${rota.de} → ${rota.para} (${km})` : `📍 ${km}`);
  linhas.push(`💰 Frete: ${brl(d.freteOferecido)}`);
  linhas.push(`⛽ Custo da viagem: ${brl(r.custoTotal)}`);
  linhas.push(`${r.lucro >= 0 ? "📈 Lucro" : "📉 Prejuízo"}: ${brl(Math.abs(r.lucro))} (${num1.format(r.margem)}%)`);
  if (r.abaixoDoPiso) linhas.push(`🚫 Abaixo do piso da ANTT (${brl(r.piso.piso)})`);
  if (r.veredito !== "paga" && r.freteParaMargem != null) {
    // Nunca sugerir menos que o piso legal da ANTT.
    const piso = r.piso ? r.piso.piso : 0;
    linhas.push(
      piso > r.freteParaMargem
        ? `👉 Peça pelo menos ${brl(piso)} (piso da ANTT)`
        : `👉 Para valer a pena, peça pelo menos ${brl(r.freteParaMargem)}`
    );
  }
  linhas.push("", `Faça a conta do seu frete: ${SITE}`);
  return linhas.join("\n");
}

export function linkWhatsApp(texto) {
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}
