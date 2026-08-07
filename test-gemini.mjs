import dotenv from "dotenv";
dotenv.config({path: ".env.local"});
async function test() {
  const key = process.env.GEMINI_API_KEY;
  const res1 = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=" + key, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "oi" }] }] })
  });
  console.log("flash-latest:", await res1.json());
  const res2 = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + key, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "oi" }] }] })
  });
  console.log("1.5-flash:", await res2.json());
}
test();
