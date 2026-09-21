export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Sadece POST isteği kabul edilir."
    });
  }

  try {
    const {
      productName,
      price,
      description,
      targetCustomer,
      platform,
      style
    } = req.body || {};

    if (!productName || !description) {
      return res.status(400).json({
        success: false,
        error: "Ürün/hizmet adı ve açıklaması zorunludur."
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "OPENAI_API_KEY Vercel'de bulunamadı."
      });
    }

    const prompt = `
Sen profesyonel bir dijital reklam ajansında çalışan yaratıcı reklam uzmanısın.

Ürün/Hizmet: ${productName}
Fiyat: ${price || "Belirtilmedi"}
Açıklama: ${description}
Hedef müşteri: ${targetCustomer || "Genel müşteri"}
Platform: ${platform || "Instagram Reels"}
Reklam tarzı: ${style || "Dikkat çekici"}

Türkçe olarak şunları oluştur:

- Reklam başlığı
- Slogan
- Yaklaşık 20 saniyelik video senaryosu
- Seslendirme metni
- Sosyal medya açıklaması
- 8 hashtag
- Güçlü çağrı cümlesi

Abartılı veya doğrulanmamış iddialar kullanma.

SADECE şu JSON formatında cevap ver:

{
  "baslik": "",
  "slogan": "",
  "senaryo": "",
  "seslendirme": "",
  "aciklama": "",
  "hashtagler": [],
  "cagri": ""
}
`;

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-5.6-luna",
          input: prompt,
          max_output_tokens: 1200
        })
      }
    );

    const responseText = await openaiResponse.text();

    if (!openaiResponse.ok) {
      return res.status(openaiResponse.status).json({
        success: false,
        error: "OpenAI API hatası.",
        details: responseText
      });
    }

    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      return res.status(500).json({
        success: false,
        error: "OpenAI cevabı okunamadı."
      });
    }

    let text = "";

    if (typeof data.output_text === "string") {
      text = data.output_text;
    }

    if (!text && Array.isArray(data.output)) {
      for (const item of data.output) {
        if (!Array.isArray(item.content)) continue;

        for (const content of item.content) {
          if (typeof content.text === "string") {
            text += content.text;
          }
        }
      }
    }

    text = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let result;

    try {
      result = JSON.parse(text);
    } catch {
      result = {
        baslik: "Reklamınız hazır",
        slogan: "",
        senaryo: text,
        seslendirme: text,
        aciklama: "",
        hashtagler: [],
        cagri: ""
      };
    }

    return res.status(200).json({
      success: true,
      result
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Sunucu hatası.",
      details: error.message
    });
  }
}
