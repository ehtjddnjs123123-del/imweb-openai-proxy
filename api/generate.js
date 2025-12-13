export default async function handler(req, res) {
  /**
   * ✅ 1) Preflight(OPTIONS) 무조건 통과
   * 브라우저가 POST 전에 OPTIONS를 먼저 보내는 경우가 많습니다.
   * 이때 200 OK가 아니면 CORS에서 "HTTP ok status" 에러가 납니다.
   */
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  /**
   * ✅ 2) POST만 허용
   */
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
너는 워드프레스 "커스텀 HTML" 블록에 그대로 붙여넣으면 바로 동작하는 "단일 HTML"을 출력한다.

절대 규칙:
- 출력은 오직 HTML만. 마크다운/설명/라벨/코드펜스(```)/인사말 금지.
- 결과는 반드시 <div class="wp-pack"> 로 시작해서 </div> 로 끝나야 한다.
- 화면에 보이는 것은 (1) section1 제목+본문 (2) section2 제목+본문 (3) CTA 버튼 7개 뿐이다.
- 메인키워드/소제목/썸네일 정보는 화면에 노출하지 말고 HTML 주석에만 넣어라.

생성 규칙:
1) 입력 제목에서 메인 키워드 1개 추출 (예: "안경 지원금 총정리" → "안경 지원금")
2) 메인 키워드를 포함한 짧은 소제목 7개 생성 (클릭 유도, 간결) → 주석에만
3) 본문은 소제목 중 2개로 작성 (section1, section2)
   - 각각 <h2 id="section1">, <h2 id="section2">
   - 각 섹션 최소 4문단
   - 존댓말(합니다/입니다)
   - 문단은 <p class="wp-text">로 감싸고, 문단 사이 공백이 느껴지도록 CSS로 margin 적용
4) CTA 버튼 7개 생성
   - 세로형(큰 버튼), 가운데 정렬, 최대폭 520px 정도
   - 배경 #e60023, 글자 #ffffff
   - hover: scale(1.03) + box-shadow
   - href는 전부 https://www.naver.com
   - target="_blank" rel="noopener"
5) 썸네일 생성 정보는 HTML 주석에 포함:
   - 썸네일 문구 3개
   - 부제 2개
   - 디자인 가이드(색/구도/폰트 느낌)
   - Prompt KR / Prompt EN

반드시 아래 구조로 출력하라:

<div class="wp-pack">
  <style>
    .wp-pack { max-width: 900px; margin: 0 auto; }
    .wp-text { margin: 0 0 14px; line-height: 1.8; }
    .wp-cta-list { display: flex; flex-direction: column; align-items: center; gap: 12px; margin: 22px 0 6px; }
    .wp-cta-btn {
      display: block;
      width: 100%;
      max-width: 520px;
      text-align: center;
      background: #e60023;
      color: #ffffff;
      padding: 18px 14px;
      border-radius: 12px;
      font-weight: 800;
      text-decoration: none;
      transition: transform .18s ease, box-shadow .18s ease, background-color .18s ease;
    }
    .wp-cta-btn:hover {
      transform: scale(1.03);
      box-shadow: 0 14px 30px rgba(0,0,0,.18);
      background: #c4001d;
    }
  </style>

  <h2 id="section1">...</h2>
  <p class="wp-text">...</p>
  <p class="wp-text">...</p>
  <p class="wp-text">...</p>
  <p class="wp-text">...</p>

  <h2 id="section2">...</h2>
  <p class="wp-text">...</p>
  <p class="wp-text">...</p>
  <p class="wp-text">...</p>
  <p class="wp-text">...</p>

  <div class="wp-cta-list">
    <a class="wp-cta-btn" href="https://www.naver.com" target="_blank" rel="noopener">...</a>
    (총 7개)
  </div>

  <!--
  메인키워드:
  소제목 7개:
  썸네일 문구 3:
  부제 2:
  디자인 가이드:
  Prompt KR:
  Prompt EN:
  -->
</div>
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
