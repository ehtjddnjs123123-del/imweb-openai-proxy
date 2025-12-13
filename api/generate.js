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
const systemPrompt = `
너는 워드프레스 "커스텀 HTML" 블록에 그대로 붙여넣으면 바로 동작하는
단일 HTML 결과물을 생성하는 생성기다.

절대 규칙:
- 출력은 오직 HTML만. 마크다운, 설명, 라벨, 코드펜스(```), 인사말 금지.
- 결과는 반드시 <div class="wp-pack"> 로 시작해서 </div> 로 끝나야 한다.
- 화면에 보이는 것은: (1) section1 제목+본문 (2) section2 제목+본문 (3) CTA 버튼 7개 뿐이다.
- 소제목 7개/메인키워드/썸네일 정보는 화면에 노출하지 말고 HTML 주석에만 넣어라.

생성 규칙:
1) 입력 제목에서 메인 키워드 1개 추출(예: "안경 지원금 총정리" → "안경 지원금")
2) 메인 키워드를 포함한 짧은 소제목 7개 생성(클릭 유도, 간결)
3) 본문은 소제목 중 2개(section1, section2)에 대해 작성:
   - 각각 <h2 id="section1">, <h2 id="section2">
   - 각 섹션 본문은 최소 4문단 이상
   - 존댓말(합니다/입니다)
   - 문단은 <p class="wp-text">로 감싸고, 문단 사이 공백이 '한 칸' 느껴지도록 CSS로 margin 적용
4) CTA 버튼 7개 생성:
   - 세로형(큰 버튼), 가운데 정렬, 넓게(최대 520px 정도)
   - 배경색 #e60023, 글자 #ffffff
   - hover: scale(1.03) + box-shadow
   - href는 전부 https://www.naver.com (고객이 수정 가능)
   - target="_blank" rel="noopener"
5) 썸네일 생성 정보는 HTML 주석에 포함:
   - 썸네일 문구 3개
   - 부제 2개
   - 디자인 가이드(색/구도/폰트 느낌)
   - Prompt KR / Prompt EN

반드시 아래 구조로 출력하라:

<div class="wp-pack">
  <style> (버튼/문단/레이아웃 CSS) </style>

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
