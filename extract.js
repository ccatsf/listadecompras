// api/extract.js
export default async function handler(req, res) {
  const { url } = req.query;

  try {
    const response = await fetch(url);
    const html = await response.text();

    // Aqui usamos uma lógica simples para pegar o título (exemplo)
    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1] : "Produto não encontrado";

    res.status(200).json({ title });
  } catch (error) {
    res.status(500).json({ error: "Erro ao acessar o link" });
  }
}
