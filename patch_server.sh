sed -i 's/async function startServer() {/export const app = express();\nasync function startServer() {/' server.ts
sed -i 's/const app = express();/ /' server.ts
sed -i 's/app.listen(PORT, "0.0.0.0", () => console.log(`Server running on http:\/\/0.0.0.0:${PORT}`));/if (process.env.NODE_ENV !== "test" \&\& !process.env.VERCEL) { app.listen(PORT, "0.0.0.0", () => console.log(`Server running on http:\/\/0.0.0.0:${PORT}`)); }/' server.ts
