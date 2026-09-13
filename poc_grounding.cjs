const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: '.env' });

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.CHEIKH_API_KEY });
  const prompt = "Quelles sont les conditions de validité de la prière ? Utilise uniquement le site islamqa.info ou islamweb.net pour ta recherche.";
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    console.log("Response Text:", response.text.substring(0, 200) + '...');
    console.log("\n--- Grounding Metadata ---");
    const metadata = response.candidates?.[0]?.groundingMetadata;
    if (metadata) {
      if (metadata.groundingChunks) {
         metadata.groundingChunks.forEach(chunk => {
            if (chunk.web) console.log(chunk.web.uri);
         });
      }
    } else {
      console.log("No grounding metadata found.");
    }
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
