export default async function handler(req, res) {
  // POST만 허용
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

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
너는 워드프레스 "커스텀 HTML" 블록에 그대로 붙여넣으면 바로 동작하는
단일 HTML 결과물을 생성하는 생성기다.

절대 규칙:
- 출력은 오직 HTML만. 마크다운, 설명, 라벨, 코드펜스, 인사말 금지.
- 결과는 반드시 <div class="wp-pack"> 로 시작해서 </div> 로 끝나야 한다.
- 화면에는 section1, section2 본문과 CTA 버튼만 노출한다.
- 메인키워드, 소제목, 썸네일 정보는 HTML 주석에만 포함한다.

생성 규칙:
1) 제목에서 메인 키워드 1개 추출
2) 클릭 유도 소제목 7개 생성 (주석)
3) section1, section2 본문 작성
   - 각 섹션 최소 4문단
   - 존댓말
   - <p class="wp-text"> 사용
4) CTA 버튼 7개
   - 세로형, 가운데 정렬
   - 배경 #e60023 / 글자 #fff
   - hover scale + shadow
   - href=https://www.naver.com
5) 썸네일 문구/프롬프트는 HTML 주석

반드시 하나의 HTML로 출력하라.
`.trim();

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        max_output_tokens: 1800,
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `제목: ${title}` }
        ]
      })
    });

    if (!response.ok) {
      const t = await response.text();
      return res.status(500).json({ error: "OpenAI API 오류", detail: t });
    }

    const data = await response.json();
    const html =
      data.output_text ||
      data.output?.[0]?.content?.find(c => c.type === "output_text")?.text ||
      "";

    return res.status(200).json({ html });

  } catch (err) {
    return res.status(500).json({
      error: "서버 오류",
      detail: err.message || String(err)
    });
  }
}
