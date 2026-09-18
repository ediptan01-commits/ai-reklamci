export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Sadece POST isteği kabul edilir." }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  try {
    const body = await req.json();

    const {
      productName,
      price,
      description,
      targetCustomer,
      platform,
      style
    } = body;

    if (!productName || !description) {
      return new Response(
        JSON.stringify({
          error: "Ürün/hizmet adı ve açıklaması zorunludur."
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "OPENAI_API_KEY tanımlanmamış."
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const prompt = `
Sen profesyonel bir dijital reklam ajansında çalışan yaratıcı reklam uzmanısın.

Aşağıdaki ürün/hizmet için etkili bir sosyal medya reklam paketi hazırla.

Ürün/Hizmet:
${productName}

Fiyat:
${price || "Belirtilmedi"}

Ürün/Hizmet açıklaması:
${description}

Hedef müşteri:
${targetCustomer || "Genel müşteri"}

Reklam platformu:
${platform || "Instagram Reels"}

Reklam tarzı:
${style || "Dikkat çekici"}

Şunları Türkçe olarak üret:

1. Reklam başlığı
2. Kısa ve akılda kalıcı slogan
3. Yaklaşık 20 saniyelik video senaryosu
4. Seslendirme metni
5. Sosyal medya paylaşım açıklaması
6. 8 adet uygun hashtag
7. Reklamda kullanılabilecek güçlü çağrı cümlesi

Metinler satış odaklı ama doğal olsun.
Abartılı veya doğrulanmamış iddialar üretme.

Cevabı SADECE aşağıdaki JSON formatında ver:

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

    const response = await fetch(
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

    if (!response.ok) {
      const errorText = await response.text();

      return new Response(
        JSON.stringify({
          error: "OpenAI API hatası",
          details: errorText
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const data = await response.json();

    let text = "";

    if (typeof data.output_text === "string") {
      text = data.output_text;
    } else if (Array.isArray(data.output)) {
      for (const item of data.output) {
        if (Array.isArray(item.content)) {
          for (const content of item.content) {
            if (typeof content.text === "string") {
              text += content.text;
            }
          }
        }
      }
    }

    text = text
      .replace(/^```json\s*/i, "")
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

    return new Response(
      JSON.stringify({
        success: true,
        result
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Sunucu hatası",
        details: error.message
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
