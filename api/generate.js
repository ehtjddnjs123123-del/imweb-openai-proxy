export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const allowed = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(v => v.trim())
    .filter(Boolean);

  if (allowed.length && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  const { title, apiKey } = req.body || {};

  if (!title || typeof title !== "string") {
    return res.status(400).json({ error: "제목이 필요합니다." });
  }

  if (!apiKey || typeof apiKey !== "string" || !apiKey.startsWith("sk-")) {
    return res.status(400).json({
      error: "유효한 OpenAI API 키(sk-로 시작)가 필요합니다."
    });
  }

  try {
    const systemPrompt = `
너는 워드프레스 커스텀 HTML 블록에 바로 붙여넣는 HTML만 출력한다.
마크다운, 설명, 라벨, 인사말 금지.
결과는 반드시 <div class="wp-pack">로 시작해서 </div>로 끝나야 한다.
`.trim();

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `제목: ${title.trim()}` }
        ]
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({ error: "OpenAI API 오류", detail: text.slice(0, 500) });
    }

    const data = await response.json();

    const html =
      data.output_text ||
      data.output?.[0]?.content?.find(c => c.type === "output_text")?.text ||
      "";

    return res.status(200).json({ html });
  } catch (err) {
    return res.status(500).json({ error: "서버 오류", detail: err.message || String(err) });
  }
}
