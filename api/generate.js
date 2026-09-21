export default async function handler(req) {
  // Sadece POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Sadece POST isteği kabul edilir."
      }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }

  try {
    // Gelen veriyi oku
    const body = await req.json();

    const {
      productName,
      price,
      description,
      targetCustomer,
      platform,
      style
    } = body;

    // Zorunlu alan kontrolü
    if (!productName || !description) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Ürün/hizmet adı ve açıklaması zorunludur."
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    // API anahtarını Vercel Environment Variables'dan al
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "OPENAI_API_KEY tanımlanmamış."
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    // Reklam uzmanı promptu
    const prompt = `
Sen profesyonel bir dijital reklam ajansında çalışan yaratıcı reklam uzmanısın.

Aşağıdaki ürün veya hizmet için profesyonel bir sosyal medya reklam paketi hazırla.

ÜRÜN / HİZMET:
${productName}

FİYAT:
${price || "Belirtilmedi"}

AÇIKLAMA:
${description}

HEDEF MÜŞTERİ:
${targetCustomer || "Genel müşteri"}

PLATFORM:
${platform || "Instagram Reels"}

REKLAM TARZI:
${style || "Dikkat çekici"}

Şunları Türkçe olarak üret:

1. Güçlü reklam başlığı
2. Kısa ve akılda kalıcı slogan
3. Yaklaşık 20 saniyelik video senaryosu
4. Seslendirme metni
5. Sosyal medya paylaşım açıklaması
6. 8 adet uygun hashtag
7. Güçlü çağrı cümlesi

Kurallar:
- Satış odaklı ama doğal ol.
- Profesyonel reklam dili kullan.
- Hedef müşteriye uygun yaz.
- Abartılı veya doğrulanmamış iddialar üretme.
- Hashtagleri # ile başlat.
- Cevabı SADECE JSON olarak ver.
- JSON dışında açıklama yazma.

JSON FORMAT:

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

    // OpenAI Responses API
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

    // OpenAI hata kontrolü
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();

      return new Response(
        JSON.stringify({
          success: false,
          error: "OpenAI API hatası.",
          details: errorText
        }),
        {
          status: openaiResponse.status,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    // OpenAI cevabını JSON olarak oku
    const data = await openaiResponse.json();

    // Responses API'den metni çıkar
    let text = "";

    if (typeof data.output_text === "string") {
      text = data.output_text;
    } else if (Array.isArray(data.output)) {
      for (const item of data.output) {
        if (!Array.isArray(item.content)) {
          continue;
        }

        for (const content of item.content) {
          if (typeof content.text === "string") {
            text += content.text;
          }
        }
      }
    }

    text = text.trim();

    // Markdown JSON işaretlerini temizle
    text = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    // JSON'u parse et
    let result;

    try {
      result = JSON.parse(text);
    } catch (parseError) {
      // JSON parse edilemezse yine reklamı kaybetme
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

    // Başarılı cevap
    return new Response(
      JSON.stringify({
        success: true,
        result: result
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

  } catch (error) {

    console.error("SERVER ERROR:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "Sunucu hatası.",
        details: error.message
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}
