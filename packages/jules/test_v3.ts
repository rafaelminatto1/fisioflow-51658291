async function test() {
  // The error said 404 for v1beta, so maybe gemini-pro (v1) works.
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  try {
    const res = await model.generateContent("ping");
    console.log("SUCCESS:", res.response.text());
  } catch (err: any) {
    console.log("FAILED 1.5-flash:", err.message);
    const m2 = genAI.getGenerativeModel({ model: "gemini-pro" });
    try {
      const res2 = await m2.generateContent("ping");
      console.log("SUCCESS pro:", res2.response.text());
    } catch (err2: any) {
      console.log("FAILED pro:", err2.message);
    }
  }
}
test();
