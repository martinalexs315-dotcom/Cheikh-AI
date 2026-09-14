# Wrap the app for Vercel serverless environment
echo '
// Vercel Serverless Export
let serverStarted = false;
export default async function (req: any, res: any) {
  if (!serverStarted) {
    await startServer();
    serverStarted = true;
  }
  return app(req, res);
}' >> server.ts
